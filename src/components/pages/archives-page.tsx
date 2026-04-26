"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationControls } from "@/components/features/pagination-controls";
import { deleteApiJson, getApiJson } from "@/lib/client-api";
import {
  actionTypeLabel,
  encodeFiltersPreset,
  getTimeRangeLabels,
  normalizeDisplayDatetime
} from "@/lib/log-client-utils";
import { TableSortHeader, type SortDirection } from "@/components/features/table-sort-header";
import type { PaginatedArchives, QueryArchiveRecord } from "@/types/log";

const actionToPath: Record<QueryArchiveRecord["actionType"], string> = {
  logs: "/logs",
  ua: "/ua",
  intersection: "/intersection"
};

type ArchiveSortKey = "id" | "actionType" | "resultTotal" | "remark" | "createdAt";
const ARCHIVE_PAGE_SIZE = 20;

export function ArchivesPage() {
  const initialized = useRef(false);
  const [archiveData, setArchiveData] = useState<PaginatedArchives>({
    items: [],
    total: 0,
    page: 1,
    pageSize: ARCHIVE_PAGE_SIZE
  });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sort, setSort] = useState<{ key: ArchiveSortKey; direction: SortDirection }>({
    key: "id",
    direction: "desc"
  });

  const fetchArchives = useCallback(async (page = 1, nextSort: { key: ArchiveSortKey; direction: SortDirection } = sort) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(ARCHIVE_PAGE_SIZE),
        sortBy: nextSort.key,
        sortOrder: nextSort.direction
      });
      const data = await getApiJson<PaginatedArchives>(`/api/logs/history?${params.toString()}`);
      setArchiveData(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      return null;
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    if (initialized.current) {
      return;
    }

    initialized.current = true;
    void fetchArchives(1, sort);
  }, [fetchArchives]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">SQLite 查询归档</CardTitle>
          <CardDescription>支持排序、按备注识别记录、删除归档，并应用筛选条件跳回对应页面。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchArchives(archiveData.page, sort)}
              disabled={loading || deletingId !== null}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新归档
            </Button>

            {loading && <Badge variant="secondary">加载中</Badge>}
            {deletingId !== null && <Badge variant="secondary">删除中</Badge>}
            {error && <Badge variant="destructive">{error}</Badge>}
            {successMessage && <Badge variant="secondary">{successMessage}</Badge>}
          </div>

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
                      void fetchArchives(1, nextSort);
                    }}
                    onDesc={() => {
                      const nextSort = { key: "id" as const, direction: "desc" as const };
                      setSort(nextSort);
                      void fetchArchives(1, nextSort);
                    }}
                  />
                </TableHead>
                <TableHead>
                  <TableSortHeader
                    label="类型"
                    activeDirection={sort.key === "actionType" ? sort.direction : null}
                    onAsc={() => {
                      const nextSort = { key: "actionType" as const, direction: "asc" as const };
                      setSort(nextSort);
                      void fetchArchives(1, nextSort);
                    }}
                    onDesc={() => {
                      const nextSort = { key: "actionType" as const, direction: "desc" as const };
                      setSort(nextSort);
                      void fetchArchives(1, nextSort);
                    }}
                  />
                </TableHead>
                <TableHead>
                  <TableSortHeader
                    label="结果总数"
                    activeDirection={sort.key === "resultTotal" ? sort.direction : null}
                    onAsc={() => {
                      const nextSort = { key: "resultTotal" as const, direction: "asc" as const };
                      setSort(nextSort);
                      void fetchArchives(1, nextSort);
                    }}
                    onDesc={() => {
                      const nextSort = { key: "resultTotal" as const, direction: "desc" as const };
                      setSort(nextSort);
                      void fetchArchives(1, nextSort);
                    }}
                  />
                </TableHead>
                <TableHead>查询时间段</TableHead>
                <TableHead>
                  <TableSortHeader
                    label="备注"
                    activeDirection={sort.key === "remark" ? sort.direction : null}
                    onAsc={() => {
                      const nextSort = { key: "remark" as const, direction: "asc" as const };
                      setSort(nextSort);
                      void fetchArchives(1, nextSort);
                    }}
                    onDesc={() => {
                      const nextSort = { key: "remark" as const, direction: "desc" as const };
                      setSort(nextSort);
                      void fetchArchives(1, nextSort);
                    }}
                  />
                </TableHead>
                <TableHead>
                  <TableSortHeader
                    label="保存时间"
                    activeDirection={sort.key === "createdAt" ? sort.direction : null}
                    onAsc={() => {
                      const nextSort = { key: "createdAt" as const, direction: "asc" as const };
                      setSort(nextSort);
                      void fetchArchives(1, nextSort);
                    }}
                    onDesc={() => {
                      const nextSort = { key: "createdAt" as const, direction: "desc" as const };
                      setSort(nextSort);
                      void fetchArchives(1, nextSort);
                    }}
                  />
                </TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archiveData.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500">
                    暂无归档记录
                  </TableCell>
                </TableRow>
              ) : (
                archiveData.items.map((record) => {
                  const labels = getTimeRangeLabels(record.filters);
                  const preset = encodeFiltersPreset(record.filters);
                  const targetPath = `${actionToPath[record.actionType]}?preset=${preset}`;

                  return (
                    <TableRow key={record.id}>
                      <TableCell>{record.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{actionTypeLabel(record.actionType)}</Badge>
                      </TableCell>
                      <TableCell>{record.resultTotal}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {labels.map((label, idx) => (
                            <p key={`${record.id}_${idx}`} className="text-xs text-slate-700">
                              {label}
                            </p>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{record.remark || "-"}</TableCell>
                      <TableCell>{normalizeDisplayDatetime(record.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              window.location.href = targetPath;
                            }}
                          >
                            应用并跳转
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={deletingId !== null}
                            onClick={async () => {
                              if (!window.confirm(`确定删除归档 #${record.id} 吗？`)) {
                                return;
                              }

                              setError("");
                              setSuccessMessage("");
                              setDeletingId(record.id);

                              try {
                                await deleteApiJson<{ id: number }>(`/api/logs/history?id=${record.id}`);
                                setSuccessMessage(`归档 #${record.id} 已删除`);
                                const refreshed = await fetchArchives(archiveData.page, sort);
                                if (refreshed && refreshed.items.length === 0 && refreshed.page > 1) {
                                  await fetchArchives(refreshed.page - 1, sort);
                                }
                              } catch (e) {
                                setError(e instanceof Error ? e.message : "删除失败");
                              } finally {
                                setDeletingId(null);
                              }
                            }}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              共 {archiveData.total} 条，当前第 {archiveData.page} 页
            </p>
            <PaginationControls
              page={archiveData.page}
              pageSize={archiveData.pageSize}
              total={archiveData.total}
              disabled={loading || deletingId !== null}
              onPageChange={(nextPage) => {
                void fetchArchives(nextPage, sort);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
