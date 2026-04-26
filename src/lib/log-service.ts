import { queryMysqlRows } from "@/lib/db";
import { isValidRange, normalizeDateTimeInput } from "@/lib/time";
import type {
  IntersectionUserResult,
  LogFilters,
  PaginatedLogs,
  PaginatedUserSubscribeCounts,
  PaginatedUaStats,
  SubscribeRateLimitLog,
  TimeRangeInput,
  UserDistinctDetail,
  UserSubscribeCountItem,
  UaStatItem
} from "@/types/log";

type Primitive = string | number | null;

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRanges(ranges: TimeRangeInput[] | undefined): TimeRangeInput[] {
  if (!Array.isArray(ranges)) {
    return [];
  }

  const normalized: TimeRangeInput[] = [];

  for (const range of ranges) {
    const start = normalizeDateTimeInput(range.start || "");
    const end = normalizeDateTimeInput(range.end || "");
    if (!isValidRange(start, end)) {
      continue;
    }

    normalized.push({ start, end });
  }

  return normalized;
}

function normalizeFilters(filters: LogFilters): LogFilters {
  return {
    userId: typeof filters.userId === "number" ? filters.userId : undefined,
    subscribeType: filters.subscribeType || undefined,
    nodeGroup: typeof filters.nodeGroup === "number" ? filters.nodeGroup : undefined,
    requestIp: filters.requestIp || undefined,
    uaKeyword: filters.uaKeyword || undefined,
    isBlocked: typeof filters.isBlocked === "number" ? filters.isBlocked : undefined,
    startTime: filters.startTime || undefined,
    endTime: filters.endTime || undefined,
    ranges: normalizeRanges(filters.ranges),
    page: filters.page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy || undefined,
    sortOrder: filters.sortOrder || undefined
  };
}

const LOG_SORT_COLUMNS: Record<string, string> = {
  id: "id",
  user_id: "user_id",
  subscribe_type: "subscribe_type",
  node_group: "node_group",
  request_ip: "request_ip",
  request_ua: "request_ua",
  request_time: "request_time",
  is_blocked: "is_blocked"
};

const UA_SORT_COLUMNS: Record<string, string> = {
  request_ua_hash: "request_ua_hash",
  request_ua: "request_ua",
  total_count: "total_count",
  unique_user_count: "unique_user_count",
  blocked_count: "blocked_count"
};

const USER_COUNT_SORT_COLUMNS: Record<string, string> = {
  user_id: "user_id",
  subscribe_count: "subscribe_count",
  unique_ip_count: "unique_ip_count",
  blocked_count: "blocked_count",
  first_request_time: "first_request_time",
  last_request_time: "last_request_time"
};

function buildBaseFilters(filters: LogFilters): { clauses: string[]; params: Primitive[] } {
  const clauses: string[] = [];
  const params: Primitive[] = [];

  if (typeof filters.userId === "number") {
    clauses.push("user_id = ?");
    params.push(filters.userId);
  }

  if (filters.subscribeType) {
    clauses.push("subscribe_type = ?");
    params.push(filters.subscribeType);
  }

  if (typeof filters.nodeGroup === "number") {
    clauses.push("node_group = ?");
    params.push(filters.nodeGroup);
  }

  if (filters.requestIp) {
    clauses.push("request_ip LIKE ?");
    params.push(`%${filters.requestIp}%`);
  }

  if (filters.uaKeyword) {
    clauses.push("request_ua LIKE ?");
    params.push(`%${filters.uaKeyword}%`);
  }

  if (typeof filters.isBlocked === "number") {
    clauses.push("is_blocked = ?");
    params.push(filters.isBlocked);
  }

  return { clauses, params };
}

function buildTimeFilter(filters: LogFilters): { clause: string; params: Primitive[] } {
  const ranges = normalizeRanges(filters.ranges);
  const params: Primitive[] = [];

  if (ranges.length > 0) {
    const rangeClause = ranges
      .map(() => {
        return "(request_time >= ? AND request_time <= ?)";
      })
      .join(" OR ");

    for (const range of ranges) {
      params.push(range.start, range.end);
    }

    return {
      clause: `(${rangeClause})`,
      params
    };
  }

  const start = normalizeDateTimeInput(filters.startTime || "");
  const end = normalizeDateTimeInput(filters.endTime || "");

  if (start && end && isValidRange(start, end)) {
    return {
      clause: "(request_time >= ? AND request_time <= ?)",
      params: [start, end]
    };
  }

  if (start) {
    return {
      clause: "request_time >= ?",
      params: [start]
    };
  }

  if (end) {
    return {
      clause: "request_time <= ?",
      params: [end]
    };
  }

  return {
    clause: "",
    params: []
  };
}

function buildWhereClause(filters: LogFilters): { whereSql: string; params: Primitive[] } {
  const base = buildBaseFilters(filters);
  const time = buildTimeFilter(filters);

  const clauses = [...base.clauses];
  const params: Primitive[] = [...base.params];

  if (time.clause) {
    clauses.push(time.clause);
    params.push(...time.params);
  }

  if (!clauses.length) {
    return { whereSql: "", params };
  }

  return {
    whereSql: `WHERE ${clauses.join(" AND ")}`,
    params
  };
}

export async function querySubscribeRateLimitLogs(filters: LogFilters): Promise<PaginatedLogs> {
  const normalizedFilters = normalizeFilters(filters);
  const page = Math.max(1, Number(normalizedFilters.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(normalizedFilters.pageSize || 20)));
  const offset = (page - 1) * pageSize;
  const sortBy = LOG_SORT_COLUMNS[normalizedFilters.sortBy || ""] || "request_time";
  const sortOrder = normalizedFilters.sortOrder === "asc" ? "ASC" : "DESC";

  const { whereSql, params } = buildWhereClause(normalizedFilters);

  const countRows = await queryMysqlRows<{ total: number | string }>(
    `SELECT COUNT(*) as total FROM user_subscribe_rate_limit_log ${whereSql}`,
    params
  );
  const total = countRows.length ? toNumber(countRows[0].total) : 0;

  const rows = await queryMysqlRows<SubscribeRateLimitLog>(
    `
      SELECT
        id,
        user_id,
        link_id,
        subscribe_type,
        node_group,
        request_ip,
        request_ua,
        request_ua_hash,
        request_time,
        is_blocked,
        blocked_reason
      FROM user_subscribe_rate_limit_log
      ${whereSql}
      ORDER BY ${sortBy} ${sortOrder}, id DESC
      LIMIT ? OFFSET ?
    `,
    [...params, pageSize, offset]
  );

  const items = rows.map((row) => ({
    ...row,
    id: toNumber(row.id),
    user_id: toNumber(row.user_id),
    link_id: row.link_id === null ? null : toNumber(row.link_id),
    node_group: toNumber(row.node_group),
    is_blocked: toNumber(row.is_blocked)
  }));

  const payload: PaginatedLogs = {
    items,
    total,
    page,
    pageSize
  };

  return payload;
}

export async function queryUaStats(filters: LogFilters): Promise<PaginatedUaStats> {
  const normalizedFilters = normalizeFilters(filters);
  const page = Math.max(1, Number(normalizedFilters.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(normalizedFilters.pageSize || 20)));
  const offset = (page - 1) * pageSize;
  const sortBy = UA_SORT_COLUMNS[normalizedFilters.sortBy || ""] || "total_count";
  const sortOrder = normalizedFilters.sortOrder === "asc" ? "ASC" : "DESC";
  const { whereSql, params } = buildWhereClause(normalizedFilters);

  const countRows = await queryMysqlRows<{ total: number | string }>(
    `
      SELECT COUNT(*) as total
      FROM (
        SELECT request_ua_hash, request_ua
        FROM user_subscribe_rate_limit_log
        ${whereSql}
        GROUP BY request_ua_hash, request_ua
      ) t
    `,
    params
  );
  const total = countRows.length ? toNumber(countRows[0].total) : 0;

  const rows = await queryMysqlRows<{
    request_ua_hash: string;
    request_ua: string | null;
    total_count: number | string;
    unique_user_count: number | string;
    blocked_count: number | string;
  }>(
    `
      SELECT
        request_ua_hash,
        request_ua,
        COUNT(*) as total_count,
        COUNT(DISTINCT user_id) as unique_user_count,
        SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) as blocked_count
      FROM user_subscribe_rate_limit_log
      ${whereSql}
      GROUP BY request_ua_hash, request_ua
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `,
    [...params, pageSize, offset]
  );

  const items = rows.map((row) => ({
    request_ua_hash: row.request_ua_hash,
    request_ua: row.request_ua,
    total_count: toNumber(row.total_count),
    unique_user_count: toNumber(row.unique_user_count),
    blocked_count: toNumber(row.blocked_count)
  }));

  return {
    items,
    total,
    page,
    pageSize
  };
}

export async function queryUserSubscribeCounts(filters: LogFilters): Promise<PaginatedUserSubscribeCounts> {
  const normalizedFilters = normalizeFilters(filters);
  const page = Math.max(1, Number(normalizedFilters.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(normalizedFilters.pageSize || 20)));
  const offset = (page - 1) * pageSize;
  const sortBy = USER_COUNT_SORT_COLUMNS[normalizedFilters.sortBy || ""] || "subscribe_count";
  const sortOrder = normalizedFilters.sortOrder === "asc" ? "ASC" : "DESC";
  const { whereSql, params } = buildWhereClause(normalizedFilters);

  const countRows = await queryMysqlRows<{ total: number | string }>(
    `
      SELECT COUNT(*) as total
      FROM (
        SELECT user_id
        FROM user_subscribe_rate_limit_log
        ${whereSql}
        GROUP BY user_id
      ) t
    `,
    params
  );
  const total = countRows.length ? toNumber(countRows[0].total) : 0;

  const rows = await queryMysqlRows<{
    user_id: number | string;
    subscribe_count: number | string;
    unique_ip_count: number | string;
    blocked_count: number | string;
    first_request_time: string;
    last_request_time: string;
  }>(
    `
      SELECT
        user_id,
        COUNT(*) as subscribe_count,
        COUNT(DISTINCT request_ip) as unique_ip_count,
        SUM(CASE WHEN is_blocked = 1 THEN 1 ELSE 0 END) as blocked_count,
        MIN(request_time) as first_request_time,
        MAX(request_time) as last_request_time
      FROM user_subscribe_rate_limit_log
      ${whereSql}
      GROUP BY user_id
      ORDER BY ${sortBy} ${sortOrder}, user_id ASC
      LIMIT ? OFFSET ?
    `,
    [...params, pageSize, offset]
  );

  const items: UserSubscribeCountItem[] = rows.map((row) => ({
    user_id: toNumber(row.user_id),
    subscribe_count: toNumber(row.subscribe_count),
    unique_ip_count: toNumber(row.unique_ip_count),
    blocked_count: toNumber(row.blocked_count),
    first_request_time: row.first_request_time,
    last_request_time: row.last_request_time
  }));

  return {
    items,
    total,
    page,
    pageSize
  };
}

export async function queryIntersectionUsersByRanges(filters: LogFilters): Promise<IntersectionUserResult> {
  const normalizedFilters = normalizeFilters(filters);
  const ranges = normalizeRanges(normalizedFilters.ranges);
  if (!ranges.length) {
    return { userIds: [], total: 0 };
  }

  const base = buildBaseFilters({
    userId: normalizedFilters.userId,
    subscribeType: normalizedFilters.subscribeType,
    nodeGroup: normalizedFilters.nodeGroup,
    requestIp: normalizedFilters.requestIp,
    uaKeyword: normalizedFilters.uaKeyword,
    isBlocked: normalizedFilters.isBlocked
  });

  const whereSql = base.clauses.length ? `WHERE ${base.clauses.join(" AND ")}` : "";

  const havingSegments: string[] = [];
  const params: Primitive[] = [...base.params];

  for (const range of ranges) {
    havingSegments.push("SUM(CASE WHEN request_time >= ? AND request_time <= ? THEN 1 ELSE 0 END) > 0");
    params.push(range.start, range.end);
  }

  const sql = `
    SELECT user_id
    FROM user_subscribe_rate_limit_log
    ${whereSql}
    GROUP BY user_id
    HAVING ${havingSegments.join(" AND ")}
    ORDER BY user_id ASC
  `;

  const rows = await queryMysqlRows<{ user_id: number | string }>(sql, params);
  const userIds = rows.map((row) => toNumber(row.user_id));

  const result = {
    userIds,
    total: userIds.length
  };

  return result;
}

export async function queryUserDistinctDetail(filters: LogFilters, userId: number): Promise<UserDistinctDetail> {
  const safeUserId = Number(userId);
  if (!Number.isFinite(safeUserId) || safeUserId <= 0) {
    return {
      user_id: 0,
      total_request_count: 0,
      distinct_ip_total: 0,
      ip_total_count: 0,
      ip_items: [],
      distinct_ua_total: 0,
      ua_total_count: 0,
      ua_items: []
    };
  }

  const normalizedFilters = normalizeFilters({
    ...filters,
    userId: safeUserId,
    page: undefined,
    pageSize: undefined,
    sortBy: undefined,
    sortOrder: undefined
  });
  const { whereSql, params } = buildWhereClause(normalizedFilters);
  const ipWhereSql = whereSql
    ? `${whereSql} AND request_ip IS NOT NULL AND request_ip <> ''`
    : "WHERE request_ip IS NOT NULL AND request_ip <> ''";
  const uaWhereSql = whereSql
    ? `${whereSql} AND request_ua IS NOT NULL AND request_ua <> ''`
    : "WHERE request_ua IS NOT NULL AND request_ua <> ''";

  const totalRows = await queryMysqlRows<{ total: number | string }>(
    `
      SELECT COUNT(*) as total
      FROM user_subscribe_rate_limit_log
      ${whereSql}
    `,
    params
  );

  const ipRows = await queryMysqlRows<{ request_ip: string; request_count: number | string }>(
    `
      SELECT request_ip, COUNT(*) as request_count
      FROM user_subscribe_rate_limit_log
      ${ipWhereSql}
      GROUP BY request_ip
      ORDER BY request_count DESC, request_ip ASC
    `,
    params
  );

  const uaRows = await queryMysqlRows<{ request_ua: string; request_count: number | string }>(
    `
      SELECT request_ua, COUNT(*) as request_count
      FROM user_subscribe_rate_limit_log
      ${uaWhereSql}
      GROUP BY request_ua
      ORDER BY request_count DESC, request_ua ASC
    `,
    params
  );

  const ipItems = ipRows
    .map((row) => ({
      request_ip: String(row.request_ip || "").trim(),
      request_count: toNumber(row.request_count)
    }))
    .filter((it) => Boolean(it.request_ip));

  const uaItems = uaRows
    .map((row) => ({
      request_ua: String(row.request_ua || "").trim(),
      request_count: toNumber(row.request_count)
    }))
    .filter((it) => Boolean(it.request_ua));

  const ipTotalCount = ipItems.reduce((sum, it) => sum + it.request_count, 0);
  const uaTotalCount = uaItems.reduce((sum, it) => sum + it.request_count, 0);
  const totalRequestCount = totalRows.length ? toNumber(totalRows[0].total) : 0;

  return {
    user_id: safeUserId,
    total_request_count: totalRequestCount,
    distinct_ip_total: ipItems.length,
    ip_total_count: ipTotalCount,
    ip_items: ipItems,
    distinct_ua_total: uaItems.length,
    ua_total_count: uaTotalCount,
    ua_items: uaItems
  };
}
