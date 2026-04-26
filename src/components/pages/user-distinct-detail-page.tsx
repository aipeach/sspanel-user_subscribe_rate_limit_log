"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogFilterFields } from "@/components/features/log-filter-fields";
import { postApiJson } from "@/lib/client-api";
import {
  applyLogFiltersToForm,
  buildLogFilters,
  createDefaultFilterForm,
  decodeFiltersPreset,
  type FilterFormState,
  type TimeRangeWithId
} from "@/lib/log-client-utils";
import type { LogFilters, UserDistinctDetail } from "@/types/log";

export function UserDistinctDetailPage() {
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  const [form, setForm] = useState<FilterFormState>(createDefaultFilterForm());
  const [ranges, setRanges] = useState<TimeRangeWithId[]>([]);
  const [detail, setDetail] = useState<UserDistinctDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const queryByFilters = useCallback(async (filters: LogFilters, userId: number) => {
    setLoading(true);
    setError("");

    try {
      const data = await postApiJson<UserDistinctDetail>("/api/logs/user-distinct-detail", {
        userId,
        filters
      });
      setDetail(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "查询失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const runQuery = useCallback(async () => {
    const userId = Number(form.userId.trim());
    if (!Number.isFinite(userId) || userId <= 0) {
      setError("请先填写有效的用户ID");
      return;
    }

    const payload = {
      ...buildLogFilters(form, ranges, { page: 1 }),
      userId
    };
    await queryByFilters(payload, userId);
  }, [form, queryByFilters, ranges]);

  useEffect(() => {
    if (initialized.current) {
      return;
    }

    initialized.current = true;

    const preset = decodeFiltersPreset(searchParams.get("preset"));
    const userIdRaw = Number(searchParams.get("userId") || 0);

    if (preset) {
      const mapped = applyLogFiltersToForm(preset);
      if (Number.isFinite(userIdRaw) && userIdRaw > 0) {
        mapped.form.userId = String(userIdRaw);
      }

      setForm(mapped.form);
      setRanges(mapped.ranges);

      if (mapped.form.userId.trim()) {
        const userId = Number(mapped.form.userId.trim());
        if (Number.isFinite(userId) && userId > 0) {
          const payload = {
            ...buildLogFilters(mapped.form, mapped.ranges, { page: 1 }),
            userId
          };
          void queryByFilters(payload, userId);
        }
      }
      return;
    }

    if (Number.isFinite(userIdRaw) && userIdRaw > 0) {
      const nextForm = {
        ...createDefaultFilterForm(),
        userId: String(userIdRaw)
      };
      setForm(nextForm);
      const payload = {
        ...buildLogFilters(nextForm, [], { page: 1 }),
        userId: userIdRaw
      };
      void queryByFilters(payload, userIdRaw);
    }
  }, [queryByFilters, searchParams]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">用户去重明细</CardTitle>
          <CardDescription>展示指定用户去重 IP 与去重 UA，并标注每个值出现次数。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <LogFilterFields form={form} onFormChange={setForm} ranges={ranges} onRangesChange={setRanges} />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void runQuery()} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              查询去重明细
            </Button>
            {loading && <Badge variant="secondary">查询中</Badge>}
            {error && <Badge variant="destructive">{error}</Badge>}
          </div>
        </CardContent>
      </Card>

      {detail && (
        <Card className="border-cyan-200/80 bg-cyan-50/40">
          <CardHeader>
            <CardTitle className="font-display text-2xl">用户 {detail.user_id} 去重明细</CardTitle>
            <CardDescription>当前筛选条件下该用户的去重统计汇总。</CardDescription>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline">总请求 {detail.total_request_count} 次</Badge>
              <Badge variant="outline">去重IP {detail.distinct_ip_total} 个</Badge>
              <Badge variant="outline">IP出现总次数 {detail.ip_total_count} 次</Badge>
              <Badge variant="outline">去重UA {detail.distinct_ua_total} 个</Badge>
              <Badge variant="outline">UA出现总次数 {detail.ua_total_count} 次</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 font-display text-xl text-slate-900">去重 IP 列表</h3>
                <div className="max-h-[420px] space-y-2 overflow-auto">
                  {detail.ip_items.length === 0 ? (
                    <p className="text-sm text-slate-500">无 IP 数据</p>
                  ) : (
                    detail.ip_items.map((item) => (
                      <div key={item.request_ip} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                        <p className="break-all text-sm text-slate-700">{item.request_ip}</p>
                        <Badge variant="secondary">{item.request_count} 次</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 font-display text-xl text-slate-900">去重 UA 列表</h3>
                <div className="max-h-[420px] space-y-2 overflow-auto">
                  {detail.ua_items.length === 0 ? (
                    <p className="text-sm text-slate-500">无 UA 数据</p>
                  ) : (
                    detail.ua_items.map((item) => (
                      <div key={item.request_ua} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                        <p className="break-all text-sm text-slate-700">{item.request_ua}</p>
                        <Badge variant="secondary">{item.request_count} 次</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
