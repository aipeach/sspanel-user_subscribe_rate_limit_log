"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Radar, Save } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogFilterFields } from "@/components/features/log-filter-fields";
import { SaveNoteDialog } from "@/components/features/save-note-dialog";
import { postApiJson } from "@/lib/client-api";
import {
  applyLogFiltersToForm,
  buildLogFilters,
  createDefaultFilterForm,
  decodeFiltersPreset,
  getTimeRangeLabels,
  type FilterFormState,
  type QuerySnapshot,
  type TimeRangeWithId
} from "@/lib/log-client-utils";
import type { IntersectionUserResult, LogFilters } from "@/types/log";

interface SaveArchiveResponse {
  id: number;
}

export function IntersectionPage() {
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  const [form, setForm] = useState<FilterFormState>(createDefaultFilterForm());
  const [ranges, setRanges] = useState<TimeRangeWithId[]>([]);
  const [result, setResult] = useState<IntersectionUserResult>({ userIds: [], total: 0 });
  const [snapshot, setSnapshot] = useState<QuerySnapshot | null>(null);

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const queryByPayload = useCallback(async (payload: LogFilters) => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await postApiJson<IntersectionUserResult>("/api/logs/intersection-users", payload);
      setResult(data);
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

  const runQuery = useCallback(async () => {
    const payload = buildLogFilters(form, ranges, { page: 1 });
    await queryByPayload(payload);
  }, [form, ranges, queryByPayload]);

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
      void queryByPayload(buildLogFilters(mapped.form, mapped.ranges, { page: 1 }));
      return;
    }

    void queryByPayload(buildLogFilters(form, ranges, { page: 1 }));
  }, [form, queryByPayload, ranges, searchParams]);

  const timeLabels = snapshot ? getTimeRangeLabels(snapshot.filters) : [];

  return (
    <>
      <SaveNoteDialog
        open={saveDialogOpen}
        title="保存交集用户结果"
        confirmText="保存交集"
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
              actionType: "intersection",
              filters: snapshot.filters,
              resultTotal: snapshot.resultTotal,
              resultPayload: snapshot.resultPayload,
              remark
            });

            setSuccessMessage(`交集结果保存成功（归档ID: ${saved.id}）`);
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
            <CardTitle className="font-display text-2xl">多时间段交集用户</CardTitle>
            <CardDescription>找出在多个时间段内都出现过的 user_id，并支持单独保存该结果。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <LogFilterFields form={form} onFormChange={setForm} ranges={ranges} onRangesChange={setRanges} />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => void runQuery()} disabled={loading || saveLoading}>
                <Radar className="mr-2 h-4 w-4" />
                查询交集用户
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
                保存交集结果
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
            <CardTitle className="font-display">交集用户ID</CardTitle>
            <CardDescription>总数：{result.total}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white/70 p-4">
              {result.userIds.length === 0 ? (
                <span className="text-sm text-slate-500">暂无交集用户</span>
              ) : (
                result.userIds.map((id) => (
                  <Badge key={id} variant="outline" className="rounded-lg px-3 py-1 text-sm">
                    {id}
                  </Badge>
                ))
              )}
            </div>

            {timeLabels.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">本次查询时间段</p>
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
                  {timeLabels.map((label, idx) => (
                    <p key={idx} className="text-sm text-slate-700">
                      {label}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
