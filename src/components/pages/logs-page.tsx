"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Save, Search } from "lucide-react";
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
import type { LogFilters, PaginatedLogs } from "@/types/log";

interface SaveArchiveResponse {
  id: number;
}

type LogsSortKey =
  | "id"
  | "user_id"
  | "subscribe_type"
  | "node_group"
  | "request_ip"
  | "request_ua"
  | "request_time"
  | "is_blocked";

export function LogsPage() {
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  const [form, setForm] = useState<FilterFormState>(createDefaultFilterForm());
  const [ranges, setRanges] = useState<TimeRangeWithId[]>([]);
  const [logsData, setLogsData] = useState<PaginatedLogs>({ items: [], total: 0, page: 1, pageSize: 20 });
  const [snapshot, setSnapshot] = useState<QuerySnapshot | null>(null);

  const [sort, setSort] = useState<{ key: LogsSortKey; direction: SortDirection }>({
    key: "request_time",
    direction: "desc"
  });

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(logsData.total / logsData.pageSize));
  }, [logsData.pageSize, logsData.total]);

  const queryByPayload = useCallback(async (payload: LogFilters) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await postApiJson<PaginatedLogs>("/api/logs/query", payload);
      setLogsData(data);
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
      nextSort: { key: LogsSortKey; direction: SortDirection } = sort
    ) => {
      const payload = buildLogFilters(form, ranges, {
        page,
        sortBy: nextSort.key,
        sortOrder: nextSort.direction
      });
      await queryByPayload(payload);
    },
    [form, ranges, queryByPayload, sort]
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
      const payload = buildLogFilters(mapped.form, mapped.ranges, {
        page: 1,
        sortBy: sort.key,
        sortOrder: sort.direction
      });
      void queryByPayload(payload);
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
        title="保存日志查询结果"
        confirmText="保存日志结果"
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
              actionType: "logs",
              filters: snapshot.filters,
              resultTotal: snapshot.resultTotal,
              resultPayload: snapshot.resultPayload,
              remark
            });

            setSuccessMessage(`日志结果保存成功（归档ID: ${saved.id}）`);
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
            <CardTitle className="font-display text-2xl">日志筛选查询</CardTitle>
            <CardDescription>按用户、节点、IP、UA、时间段进行组合筛选，支持多时间段 OR。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <LogFilterFields form={form} onFormChange={setForm} ranges={ranges} onRangesChange={setRanges} />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => void runQuery(1)} disabled={loading || saveLoading}>
                <Search className="mr-2 h-4 w-4" />
                开始查询
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
                保存查询结果
              </Button>

              {loading && <Badge variant="secondary">查询中</Badge>}
              {saveLoading && <Badge variant="secondary">保存中</Badge>}
              {error && <Badge variant="destructive">{error}</Badge>}
              {successMessage && <Badge variant="secondary">{successMessage}</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">日志结果</CardTitle>
            <CardDescription>
              共 {logsData.total} 条，当前第 {logsData.page}/{totalPages} 页
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <TableSortHeader
                      label="ID"
                      activeDirection={sort.key === "id" ? sort.direction : null}
                      onAsc={() => {
                        const nextSort = { key: "id" as const, direction: "asc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                      onDesc={() => {
                        const nextSort = { key: "id" as const, direction: "desc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                    />
                  </TableHead>
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
                      label="订阅类型"
                      activeDirection={sort.key === "subscribe_type" ? sort.direction : null}
                      onAsc={() => {
                        const nextSort = { key: "subscribe_type" as const, direction: "asc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                      onDesc={() => {
                        const nextSort = { key: "subscribe_type" as const, direction: "desc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortHeader
                      label="节点分组"
                      activeDirection={sort.key === "node_group" ? sort.direction : null}
                      onAsc={() => {
                        const nextSort = { key: "node_group" as const, direction: "asc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                      onDesc={() => {
                        const nextSort = { key: "node_group" as const, direction: "desc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortHeader
                      label="请求IP"
                      activeDirection={sort.key === "request_ip" ? sort.direction : null}
                      onAsc={() => {
                        const nextSort = { key: "request_ip" as const, direction: "asc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                      onDesc={() => {
                        const nextSort = { key: "request_ip" as const, direction: "desc" as const };
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
                      label="请求时间"
                      activeDirection={sort.key === "request_time" ? sort.direction : null}
                      onAsc={() => {
                        const nextSort = { key: "request_time" as const, direction: "asc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                      onDesc={() => {
                        const nextSort = { key: "request_time" as const, direction: "desc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                    />
                  </TableHead>
                  <TableHead>
                    <TableSortHeader
                      label="限速"
                      activeDirection={sort.key === "is_blocked" ? sort.direction : null}
                      onAsc={() => {
                        const nextSort = { key: "is_blocked" as const, direction: "asc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                      onDesc={() => {
                        const nextSort = { key: "is_blocked" as const, direction: "desc" as const };
                        setSort(nextSort);
                        void runQuery(1, nextSort);
                      }}
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsData.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  logsData.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.user_id}</TableCell>
                      <TableCell>{row.subscribe_type}</TableCell>
                      <TableCell>{row.node_group}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{row.request_ip}</TableCell>
                      <TableCell className="max-w-[560px] truncate">{row.request_ua || "-"}</TableCell>
                      <TableCell>{row.request_time}</TableCell>
                      <TableCell>
                        {row.is_blocked === 1 ? <Badge variant="destructive">命中</Badge> : <Badge variant="secondary">未命中</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <PaginationControls
              page={logsData.page}
              pageSize={logsData.pageSize}
              total={logsData.total}
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
