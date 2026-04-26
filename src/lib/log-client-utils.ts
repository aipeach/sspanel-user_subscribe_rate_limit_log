import type { LogFilters, QueryActionType, TimeRangeInput } from "@/types/log";

export interface FilterFormState {
  userId: string;
  subscribeType: string;
  nodeGroup: string;
  requestIp: string;
  uaKeyword: string;
  isBlocked: "" | "0" | "1";
  startTime: string;
  endTime: string;
  pageSize: string;
}

export interface TimeRangeWithId extends TimeRangeInput {
  id: string;
}

export interface QuerySnapshot {
  filters: LogFilters;
  resultTotal: number;
  resultPayload: unknown;
}

export function genRangeId(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createDefaultFilterForm(): FilterFormState {
  return {
    userId: "",
    subscribeType: "",
    nodeGroup: "",
    requestIp: "",
    uaKeyword: "",
    isBlocked: "",
    startTime: "",
    endTime: "",
    pageSize: "20"
  };
}

export function toDatetimeLocalInput(value: string): string {
  const normalized = value.replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized.slice(0, 16);
  }

  return normalized;
}

export function normalizeDisplayDatetime(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value.replace("T", " ");
}

function toSafeNumber(value: string): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

interface BuildLogFiltersOptions {
  page?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function buildLogFilters(
  form: FilterFormState,
  ranges: TimeRangeWithId[],
  options: BuildLogFiltersOptions = {}
): LogFilters {
  const page = options.page ?? 1;
  const payload: LogFilters = {
    page,
    pageSize: toSafeNumber(form.pageSize) || 20
  };

  if (options.sortBy) {
    payload.sortBy = options.sortBy;
  }
  if (options.sortOrder) {
    payload.sortOrder = options.sortOrder;
  }

  if (form.userId.trim()) {
    payload.userId = toSafeNumber(form.userId.trim());
  }

  if (form.subscribeType.trim()) {
    payload.subscribeType = form.subscribeType.trim();
  }

  if (form.nodeGroup.trim()) {
    payload.nodeGroup = toSafeNumber(form.nodeGroup.trim());
  }

  if (form.requestIp.trim()) {
    payload.requestIp = form.requestIp.trim();
  }

  if (form.uaKeyword.trim()) {
    payload.uaKeyword = form.uaKeyword.trim();
  }

  if (form.isBlocked === "0" || form.isBlocked === "1") {
    payload.isBlocked = Number(form.isBlocked) as 0 | 1;
  }

  if (form.startTime) {
    payload.startTime = form.startTime;
  }

  if (form.endTime) {
    payload.endTime = form.endTime;
  }

  const validRanges = ranges
    .filter((it) => it.start.trim() && it.end.trim())
    .map((it) => ({ start: it.start.trim(), end: it.end.trim() }));

  if (validRanges.length) {
    payload.ranges = validRanges;
  }

  return payload;
}

export function applyLogFiltersToForm(filters: LogFilters): {
  form: FilterFormState;
  ranges: TimeRangeWithId[];
} {
  const form: FilterFormState = {
    userId: filters.userId !== undefined ? String(filters.userId) : "",
    subscribeType: filters.subscribeType || "",
    nodeGroup: filters.nodeGroup !== undefined ? String(filters.nodeGroup) : "",
    requestIp: filters.requestIp || "",
    uaKeyword: filters.uaKeyword || "",
    isBlocked: filters.isBlocked === 0 || filters.isBlocked === 1 ? (String(filters.isBlocked) as "0" | "1") : "",
    startTime: filters.startTime ? toDatetimeLocalInput(filters.startTime) : "",
    endTime: filters.endTime ? toDatetimeLocalInput(filters.endTime) : "",
    pageSize: filters.pageSize !== undefined ? String(filters.pageSize) : "20"
  };

  const ranges: TimeRangeWithId[] = (filters.ranges || []).map((range) => ({
    id: genRangeId(),
    start: toDatetimeLocalInput(range.start),
    end: toDatetimeLocalInput(range.end)
  }));

  return { form, ranges };
}

export function formatTimeRangeLabel(start: string, end: string): string {
  return `${normalizeDisplayDatetime(start)} ~ ${normalizeDisplayDatetime(end)}`;
}

export function getTimeRangeLabels(filters: LogFilters): string[] {
  if (filters.ranges && filters.ranges.length > 0) {
    return filters.ranges.map((range, index) => {
      return `时间段${index + 1}: ${formatTimeRangeLabel(range.start, range.end)}`;
    });
  }

  if (filters.startTime || filters.endTime) {
    const start = normalizeDisplayDatetime(filters.startTime) || "起始不限";
    const end = normalizeDisplayDatetime(filters.endTime) || "结束不限";
    return [`高级筛选: ${start} ~ ${end}`];
  }

  return ["未设置时间段"];
}

export function actionTypeLabel(actionType: QueryActionType): string {
  if (actionType === "logs") {
    return "日志查询";
  }

  if (actionType === "ua") {
    return "UA统计";
  }

  return "交集用户";
}

export function encodeFiltersPreset(filters: LogFilters): string {
  return encodeURIComponent(JSON.stringify(filters));
}

export function decodeFiltersPreset(value: string | null): LogFilters | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as LogFilters;
  } catch {
    return null;
  }
}
