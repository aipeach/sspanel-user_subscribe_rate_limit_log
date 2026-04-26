import { DatabaseSync } from "node:sqlite";

export function ensureArchiveSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS query_archive (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      filters_json TEXT NOT NULL,
      result_total INTEGER NOT NULL DEFAULT 0,
      result_json TEXT NOT NULL,
      remark TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_query_archive_action_time
      ON query_archive (action_type, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_query_archive_created_at
      ON query_archive (created_at DESC);
  `);

  const columns = db.prepare("PRAGMA table_info(query_archive)").all() as Array<{ name: string }>;
  const hasRemark = columns.some((it) => it.name === "remark");
  if (!hasRemark) {
    db.exec("ALTER TABLE query_archive ADD COLUMN remark TEXT;");
  }
}
