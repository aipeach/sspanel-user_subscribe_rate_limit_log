import { executeArchive, getArchiveLastInsertId, queryArchiveRows } from "@/lib/db";
import type { LogFilters, PaginatedArchives, QueryActionType, QueryArchiveRecord } from "@/types/log";

interface ArchiveRow {
  id: number | string;
  action_type: QueryActionType;
  filters_json: string;
  result_total: number | string;
  result_json: string;
  remark: string | null;
  created_at: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function archiveQuerySnapshot(
  actionType: QueryActionType,
  filters: LogFilters,
  resultTotal: number,
  resultPayload: unknown,
  remark: string
): Promise<number> {
  const filtersJson = JSON.stringify(filters || {});
  const resultJson = JSON.stringify(resultPayload ?? null);
  const safeRemark = remark.trim();

  const id = getArchiveLastInsertId(
    `
      INSERT INTO query_archive (
        action_type,
        filters_json,
        result_total,
        result_json,
        remark
      ) VALUES (?, ?, ?, ?, ?)
    `,
    [actionType, filtersJson, resultTotal, resultJson, safeRemark]
  );

  return id;
}

interface ListArchivesOptions {
  actionType?: QueryActionType;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const ARCHIVE_SORT_COLUMNS: Record<string, string> = {
  id: "id",
  actionType: "action_type",
  resultTotal: "result_total",
  remark: "remark",
  createdAt: "created_at"
};

export async function listQueryArchives(options: ListArchivesOptions = {}): Promise<PaginatedArchives> {
  const page = Math.max(1, Number(options.page || 1));
  const pageSize = Math.max(1, Math.min(200, Number(options.pageSize || 20)));
  const offset = (page - 1) * pageSize;
  const sortBy = ARCHIVE_SORT_COLUMNS[options.sortBy || ""] || "id";
  const sortOrder = options.sortOrder === "asc" ? "ASC" : "DESC";

  let sql = `
    SELECT
      id,
      action_type,
      filters_json,
      result_total,
      result_json,
      remark,
      created_at
    FROM query_archive
  `;
  const params: Array<string | number | null> = [];
  const whereSegments: string[] = [];

  if (options.actionType) {
    whereSegments.push("action_type = ?");
    params.push(options.actionType);
  }

  const whereSql = whereSegments.length ? ` WHERE ${whereSegments.join(" AND ")}` : "";
  sql += whereSql;

  const countRows = queryArchiveRows<{ total: number | string }>(
    `SELECT COUNT(*) as total FROM query_archive${whereSql}`,
    params
  );
  const total = countRows.length ? toNumber(countRows[0].total) : 0;

  sql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
  const rows = queryArchiveRows<ArchiveRow>(sql, [...params, pageSize, offset]);

  const items = rows.map((row) => ({
    id: toNumber(row.id),
    actionType: row.action_type,
    filters: safeJsonParse<LogFilters>(row.filters_json, {}),
    resultTotal: toNumber(row.result_total),
    resultJson: row.result_json,
    remark: row.remark,
    createdAt: row.created_at
  }));

  return {
    items,
    total,
    page,
    pageSize
  };
}

export async function deleteQueryArchiveById(id: number): Promise<boolean> {
  const changes = executeArchive("DELETE FROM query_archive WHERE id = ?", [id]);
  return changes > 0;
}
