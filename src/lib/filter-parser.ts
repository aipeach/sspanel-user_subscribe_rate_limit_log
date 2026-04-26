import type { LogFilters, TimeRangeInput } from "@/types/log";

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) {
    return undefined;
  }

  return n;
}

function toOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const str = String(value).trim();
  return str ? str : undefined;
}

function parseRanges(value: unknown): TimeRangeInput[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const ranges: TimeRangeInput[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const start = toOptionalString((item as { start?: unknown }).start) || "";
    const end = toOptionalString((item as { end?: unknown }).end) || "";

    if (!start || !end) {
      continue;
    }

    ranges.push({ start, end });
  }

  return ranges.length ? ranges : undefined;
}

export function parseLogFilters(input: unknown): LogFilters {
  const obj = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  const blockedRaw = toOptionalNumber(obj.isBlocked);
  const sortOrderRaw = toOptionalString(obj.sortOrder);
  let isBlocked: 0 | 1 | undefined;
  if (blockedRaw === 0 || blockedRaw === 1) {
    isBlocked = blockedRaw;
  }

  return {
    userId: toOptionalNumber(obj.userId),
    subscribeType: toOptionalString(obj.subscribeType),
    nodeGroup: toOptionalNumber(obj.nodeGroup),
    requestIp: toOptionalString(obj.requestIp),
    uaKeyword: toOptionalString(obj.uaKeyword),
    isBlocked,
    startTime: toOptionalString(obj.startTime),
    endTime: toOptionalString(obj.endTime),
    ranges: parseRanges(obj.ranges),
    page: toOptionalNumber(obj.page),
    pageSize: toOptionalNumber(obj.pageSize),
    sortBy: toOptionalString(obj.sortBy),
    sortOrder: sortOrderRaw === "asc" || sortOrderRaw === "desc" ? sortOrderRaw : undefined
  };
}
