export interface TimeRangeInput {
  start: string;
  end: string;
}

export interface LogFilters {
  userId?: number;
  subscribeType?: string;
  nodeGroup?: number;
  requestIp?: string;
  uaKeyword?: string;
  isBlocked?: 0 | 1;
  startTime?: string;
  endTime?: string;
  ranges?: TimeRangeInput[];
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface SubscribeRateLimitLog {
  id: number;
  user_id: number;
  link_id: number | null;
  subscribe_type: string;
  node_group: number;
  request_ip: string;
  request_ua: string | null;
  request_ua_hash: string;
  request_time: string;
  is_blocked: number;
  blocked_reason: string | null;
}

export interface UaStatItem {
  request_ua_hash: string;
  request_ua: string | null;
  total_count: number;
  unique_user_count: number;
  blocked_count: number;
}

export interface PaginatedLogs {
  items: SubscribeRateLimitLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginatedUaStats {
  items: UaStatItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserSubscribeCountItem {
  user_id: number;
  subscribe_count: number;
  unique_ip_count: number;
  blocked_count: number;
  first_request_time: string;
  last_request_time: string;
}

export interface PaginatedUserSubscribeCounts {
  items: UserSubscribeCountItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserDistinctDetail {
  user_id: number;
  total_request_count: number;
  distinct_ip_total: number;
  ip_total_count: number;
  ip_items: Array<{
    request_ip: string;
    request_count: number;
  }>;
  distinct_ua_total: number;
  ua_total_count: number;
  ua_items: Array<{
    request_ua: string;
    request_count: number;
  }>;
}

export interface IntersectionUserResult {
  userIds: number[];
  total: number;
}

export type QueryActionType = "logs" | "ua" | "intersection";

export interface QueryArchiveRecord {
  id: number;
  actionType: QueryActionType;
  filters: LogFilters;
  resultTotal: number;
  resultJson: string;
  remark: string | null;
  createdAt: string;
}

export interface PaginatedArchives {
  items: QueryArchiveRecord[];
  total: number;
  page: number;
  pageSize: number;
}
