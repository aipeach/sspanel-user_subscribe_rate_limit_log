"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Save } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogFilterFields } from "@/components/features/log-filter-fields";
import { PaginationControls } from "@/components/features/pagination-controls";
import { SaveNoteDialog } from "@/components/features/save-note-dialog";
import { TableSortHeader, type SortDirection } from "@/components/features/table-sort-header";
import { postApiJson } from "@/lib/client-api";
import {
  applyLogFiltersToForm,
  buildLogFilters,
  createDefaultFilterForm,
  decodeFiltersPreset,
  type FilterFormState,
  type QuerySnapshot,
  type TimeRangeWithId
} from "@/lib/log-client-utils";
import type { LogFilters, PaginatedUaStats } from "@/types/log";

interface SaveArchiveResponse {
  id: number;
}

type UaSortKey = "request_ua_hash" | "request_ua" | "total_count" | "unique_user_count" | "blocked_count";

export function UaPage() {
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  const [form, setForm] = useState<FilterFormState>(createDefaultFilterForm());
  const [ranges, setRanges] = useState<TimeRangeWithId[]>([]);
  const [statsData, setStatsData] = useState<PaginatedUaStats>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [snapshot, setSnapshot] = useState<QuerySnapshot | null>(null);

  const [sort, setSort] = useState<{ key: UaSortKey; direction: SortDirection }>({
    key: "total_count",
    direction: "desc"
  });

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(statsData.total / statsData.pageSize));
  }, [statsData.pageSize, statsData.total]);

  const queryByPayload = useCallback(async (payload: LogFilters) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await postApiJson<PaginatedUaStats>("/api/logs/ua-stats", payload);
      setStatsData(data);
      setSnapshot({
        filters: payload,
        resultTotal: data.total,
        resultPayload: data
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "查询失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const runQuery = useCallback(
    async (
      page = 1,
      nextSort: { key: UaSortKey; direction: SortDirection } = sort
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
    <>
      <SaveNoteDialog
        open={saveDialogOpen}
        title="保存 UA 统计结果"
        confirmText="保存统计"
        loading={saveLoading}
        onCancel={() => setSaveDialogOpen(false)}
        onConfirm={async (remark) => {
          if (!snapshot) {
            return;
          }

          setSaveLoading(true);
          setError("");
          setSuccessMessage("");

          try {
            const saved = await postApiJson<SaveArchiveResponse>("/api/logs/history", {
              actionType: "ua",
              filters: snapshot.filters,
              resultTotal: snapshot.resultTotal,
              resultPayload: snapshot.resultPayload,
              remark
            });

            setSuccessMessage(`UA统计保存成功（归档ID: ${saved.id}）`);
            setSaveDialogOpen(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : "保存失败");
          } finally {
            setSaveLoading(false);
          }
        }}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">UA 聚合统计</CardTitle>
            <CardDescription>按 request_ua_hash + request_ua 聚合统计请求行为。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <LogFilterFields form={form} onFormChange={setForm} ranges={ranges} onRangesChange={setRanges} />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => void runQuery()} disabled={loading || saveLoading}>
                <BarChart3 className="mr-2 h-4 w-4" />
                统计 UA
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!snapshot || loading || saveLoading}
                onClick={() => {
                  setSaveDialogOpen(true);
                }}
              >
                <Save className="mr-2 h-4 w-4" />
                保存统计结果
              </Button>

              {loading && <Badge variant="secondary">统计中</Badge>}
              {saveLoading && <Badge variant="secondary">保存中</Badge>}
              {error && <Badge variant="destructive">{error}</Badge>}
              {successMessage && <Badge variant="secondary">{successMessage}</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">统计结果</CardTitle>
            <CardDescription>
              共 {statsData.total} 组 UA 聚合结果，当前第 {statsData.page}/{totalPages} 页
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <TableSortHeader
                      label="UA Hash"
                      activeDirection={sort.key === "request_ua_hash" ? sort.direction : null}
                      onAsc={() => {
                        const nextSort = { key: "request_ua_hash" as const, direction: "asc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                      onDesc={() => {
                        const nextSort = { key: "request_ua_hash" as const, direction: "desc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortHeader
                      label="UA"
                      activeDirection={sort.key === "request_ua" ? sort.direction : null}
                      onAsc={() => {
                        const nextSort = { key: "request_ua" as const, direction: "asc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                      onDesc={() => {
                        const nextSort = { key: "request_ua" as const, direction: "desc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortHeader
                      label="请求次数"
                      activeDirection={sort.key === "total_count" ? sort.direction : null}
                      onAsc={() => {
                        const nextSort = { key: "total_count" as const, direction: "asc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                      onDesc={() => {
                        const nextSort = { key: "total_count" as const, direction: "desc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortHeader
                      label="去重用户数"
                      activeDirection={sort.key === "unique_user_count" ? sort.direction : null}
                      onAsc={() => {
                        const nextSort = { key: "unique_user_count" as const, direction: "asc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                      onDesc={() => {
                        const nextSort = { key: "unique_user_count" as const, direction: "desc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortHeader
                      label="限速命中数"
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsData.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500">
                      暂无统计数据
                    </TableCell>
                  </TableRow>
                ) : (
                  statsData.items.map((row) => (
                    <TableRow key={`${row.request_ua_hash}_${row.request_ua || "empty"}`}>
                      <TableCell className="max-w-[240px] truncate">{row.request_ua_hash}</TableCell>
                      <TableCell className="max-w-[560px] truncate">{row.request_ua || "-"}</TableCell>
                      <TableCell>{row.total_count}</TableCell>
                      <TableCell>{row.unique_user_count}</TableCell>
                      <TableCell>{row.blocked_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <PaginationControls
              page={statsData.page}
              pageSize={statsData.pageSize}
              total={statsData.total}
              disabled={loading}
              onPageChange={(nextPage) => {
                void runQuery(nextPage);
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
