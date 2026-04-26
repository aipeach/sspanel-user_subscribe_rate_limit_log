import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import mysql, { type Pool } from "mysql2/promise";
import { ensureArchiveSchema } from "@/lib/sqlite-archive";

type Primitive = string | number | null;

let mysqlPool: Pool | null = null;
let archiveDb: DatabaseSync | null = null;
let archiveReady = false;

function normalizePath(input: string): string {
  if (path.isAbsolute(input)) {
    return input;
  }

  return path.join(process.cwd(), input);
}

function assertMysqlEnv(): void {
  const requiredKeys = ["MYSQL_HOST", "MYSQL_USER", "MYSQL_DATABASE"] as const;
  for (const key of requiredKeys) {
    if (!process.env[key]) {
      throw new Error(`缺少 MySQL 配置项：${key}`);
    }
  }
}

function getMysqlPool(): Pool {
  if (!mysqlPool) {
    assertMysqlEnv();
    mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      connectionLimit: 10,
      supportBigNumbers: true
    });
  }

  return mysqlPool;
}

function getArchiveDb(): DatabaseSync {
  if (!archiveDb) {
    const sqlitePath = normalizePath(process.env.SQLITE_PATH ?? "data/query-archive.sqlite");
    fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    archiveDb = new DatabaseSync(sqlitePath);
    archiveDb.exec("PRAGMA journal_mode = WAL;");
  }

  if (!archiveReady) {
    ensureArchiveSchema(archiveDb);
    archiveReady = true;
  }

  return archiveDb;
}

function normalizeMysqlParams(params: Primitive[]): Primitive[] {
  return params.map((value, index) => {
    if (value === undefined) {
      throw new Error(`SQL 参数非法：第 ${index + 1} 个参数为 undefined，请改为 null 或有效值`);
    }

    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`SQL 参数非法：第 ${index + 1} 个参数不是有限数字`);
    }

    return value;
  });
}

function shouldFallbackToQuery(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("Incorrect arguments to mysqld_stmt_execute");
}

export async function queryMysqlRows<T>(sql: string, params: Primitive[] = []): Promise<T[]> {
  const pool = getMysqlPool();
  const safeParams = normalizeMysqlParams(params);

  try {
    const [rows] = await pool.execute(sql, safeParams);
    return rows as T[];
  } catch (error) {
    // 某些 MySQL/MariaDB 环境在 server-side prepared statements 下会抛出该错误，回退到 query 以保证可用性。
    if (shouldFallbackToQuery(error)) {
      const [rows] = await pool.query(sql, safeParams);
      return rows as T[];
    }
    throw error;
  }
}

export async function executeMysql(sql: string, params: Primitive[] = []): Promise<number> {
  const pool = getMysqlPool();
  const safeParams = normalizeMysqlParams(params);
  let result: unknown;

  try {
    [result] = await pool.execute(sql, safeParams);
  } catch (error) {
    if (shouldFallbackToQuery(error)) {
      [result] = await pool.query(sql, safeParams);
    } else {
      throw error;
    }
  }

  if (typeof result === "object" && result !== null && "affectedRows" in result) {
    return Number((result as { affectedRows: number }).affectedRows || 0);
  }

  return 0;
}

export function queryArchiveRows<T>(sql: string, params: Primitive[] = []): T[] {
  const db = getArchiveDb();
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

export function executeArchive(sql: string, params: Primitive[] = []): number {
  const db = getArchiveDb();
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return Number(result.changes || 0);
}

export function getArchiveLastInsertId(sql: string, params: Primitive[] = []): number {
  const db = getArchiveDb();
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return Number(result.lastInsertRowid || 0);
}
