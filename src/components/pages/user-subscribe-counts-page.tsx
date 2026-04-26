"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogFilterFields } from "@/components/features/log-filter-fields";
import { PaginationControls } from "@/components/features/pagination-controls";
import { TableSortHeader, type SortDirection } from "@/components/features/table-sort-header";
import { postApiJson } from "@/lib/client-api";
import {
  applyLogFiltersToForm,
  buildLogFilters,
  createDefaultFilterForm,
  decodeFiltersPreset,
  encodeFiltersPreset,
  normalizeDisplayDatetime,
  type FilterFormState,
  type TimeRangeWithId
} from "@/lib/log-client-utils";
import type { LogFilters, PaginatedUserSubscribeCounts } from "@/types/log";

type UserCountSortKey =
  | "user_id"
  | "subscribe_count"
  | "unique_ip_count"
  | "blocked_count"
  | "first_request_time"
  | "last_request_time";

export function UserSubscribeCountsPage() {
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  const [form, setForm] = useState<FilterFormState>(createDefaultFilterForm());
  const [ranges, setRanges] = useState<TimeRangeWithId[]>([]);
  const [countsData, setCountsData] = useState<PaginatedUserSubscribeCounts>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20
  });

  const [sort, setSort] = useState<{ key: UserCountSortKey; direction: SortDirection }>({
    key: "subscribe_count",
    direction: "desc"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(countsData.total / countsData.pageSize));
  }, [countsData.pageSize, countsData.total]);

  const queryByPayload = useCallback(async (payload: LogFilters) => {
    setLoading(true);
    setError("");

    try {
      const data = await postApiJson<PaginatedUserSubscribeCounts>("/api/logs/user-subscribe-counts", payload);
      setCountsData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "查询失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const runQuery = useCallback(
    async (
      page = 1,
      nextSort: { key: UserCountSortKey; direction: SortDirection } = sort
    ) => {
      const payload = buildLogFilters(form, ranges, {
        page,
        sortBy: nextSort.key,
        sortOrder: nextSort.direction
      });
      await queryByPayload(payload);
    },
    [form, queryByPayload, ranges, sort]
  );

  useEffect(() => {
    if (initialized.current) {
      return;
    }

    initialized.current = true;
    const preset = decodeFiltersPreset(searchParams.get("preset"));

    if (preset) {
      const mapped = applyLogFiltersToForm(preset);
      setForm(mapped.form);
      setRanges(mapped.ranges);
      void queryByPayload(
        buildLogFilters(mapped.form, mapped.ranges, {
          page: 1,
          sortBy: sort.key,
          sortOrder: sort.direction
        })
      );
      return;
    }

    void queryByPayload(
      buildLogFilters(form, ranges, {
        page: 1,
        sortBy: sort.key,
        sortOrder: sort.direction
      })
    );
  }, [form, queryByPayload, ranges, searchParams, sort.direction, sort.key]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">用户订阅次数统计</CardTitle>
          <CardDescription>按用户聚合统计订阅请求次数，支持筛选、排序和分页。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <LogFilterFields form={form} onFormChange={setForm} ranges={ranges} onRangesChange={setRanges} />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void runQuery(1)} disabled={loading}>
              <BarChart3 className="mr-2 h-4 w-4" />
              统计用户订阅次数
            </Button>

            {loading && <Badge variant="secondary">统计中</Badge>}
            {error && <Badge variant="destructive">{error}</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">统计结果</CardTitle>
          <CardDescription>
            共 {countsData.total} 位用户，当前第 {countsData.page}/{totalPages} 页
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <TableSortHeader
                    label="用户ID"
                    activeDirection={sort.key === "user_id" ? sort.direction : null}
                    onAsc={() => {
                      const nextSort = { key: "user_id" as const, direction: "asc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                    onDesc={() => {
                      const nextSort = { key: "user_id" as const, direction: "desc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                  />
                </TableHead>
                <TableHead>
                  <TableSortHeader
                    label="订阅次数"
                    activeDirection={sort.key === "subscribe_count" ? sort.direction : null}
                    onAsc={() => {
                      const nextSort = { key: "subscribe_count" as const, direction: "asc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                    onDesc={() => {
                      const nextSort = { key: "subscribe_count" as const, direction: "desc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                  />
                </TableHead>
                <TableHead>
                  <TableSortHeader
                    label="去重IP数"
                    activeDirection={sort.key === "unique_ip_count" ? sort.direction : null}
                    onAsc={() => {
                      const nextSort = { key: "unique_ip_count" as const, direction: "asc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                    onDesc={() => {
                      const nextSort = { key: "unique_ip_count" as const, direction: "desc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                  />
                </TableHead>
                <TableHead>
                  <TableSortHeader
                    label="命中限速次数"
                    activeDirection={sort.key === "blocked_count" ? sort.direction : null}
                    onAsc={() => {
                      const nextSort = { key: "blocked_count" as const, direction: "asc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                    onDesc={() => {
                      const nextSort = { key: "blocked_count" as const, direction: "desc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                  />
                </TableHead>
                <TableHead>
                  <TableSortHeader
                    label="首次请求时间"
                    activeDirection={sort.key === "first_request_time" ? sort.direction : null}
                    onAsc={() => {
                      const nextSort = { key: "first_request_time" as const, direction: "asc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                    onDesc={() => {
                      const nextSort = { key: "first_request_time" as const, direction: "desc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                  />
                </TableHead>
                <TableHead>
                  <TableSortHeader
                    label="最近请求时间"
                    activeDirection={sort.key === "last_request_time" ? sort.direction : null}
                    onAsc={() => {
                      const nextSort = { key: "last_request_time" as const, direction: "asc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                    onDesc={() => {
                      const nextSort = { key: "last_request_time" as const, direction: "desc" as const };
                      setSort(nextSort);
                      void runQuery(1, nextSort);
                    }}
                  />
                </TableHead>
                <TableHead>明细</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countsData.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500">
                    暂无统计数据
                  </TableCell>
                </TableRow>
              ) : (
                countsData.items.map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell>{row.user_id}</TableCell>
                    <TableCell>{row.subscribe_count}</TableCell>
                    <TableCell>{row.unique_ip_count}</TableCell>
                    <TableCell>{row.blocked_count}</TableCell>
                    <TableCell>{normalizeDisplayDatetime(row.first_request_time)}</TableCell>
                    <TableCell>{normalizeDisplayDatetime(row.last_request_time)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const filters = {
                            ...buildLogFilters(form, ranges, { page: 1 }),
                            userId: row.user_id
                          };
                          const preset = encodeFiltersPreset(filters);
                          window.location.href = `/user-distinct-detail?userId=${row.user_id}&preset=${preset}`;
                        }}
                      >
                        查看去重明细
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <PaginationControls
            page={countsData.page}
            pageSize={countsData.pageSize}
            total={countsData.total}
            disabled={loading}
            onPageChange={(nextPage) => {
              void runQuery(nextPage);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
