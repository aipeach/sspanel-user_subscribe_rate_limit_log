"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { genRangeId, type FilterFormState, type TimeRangeWithId } from "@/lib/log-client-utils";

interface LogFilterFieldsProps {
  form: FilterFormState;
  onFormChange: (next: FilterFormState) => void;
  ranges: TimeRangeWithId[];
  onRangesChange: (next: TimeRangeWithId[]) => void;
}

export function LogFilterFields({ form, onFormChange, ranges, onRangesChange }: LogFilterFieldsProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="userId">用户ID</Label>
          <Input
            id="userId"
            type="number"
            placeholder="如 72815"
            value={form.userId}
            onChange={(e) => onFormChange({ ...form, userId: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subscribeType">订阅类型</Label>
          <Input
            id="subscribeType"
            placeholder="如 Clash / AnyTLS"
            value={form.subscribeType}
            onChange={(e) => onFormChange({ ...form, subscribeType: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nodeGroup">节点分组</Label>
          <Input
            id="nodeGroup"
            type="number"
            placeholder="如 501"
            value={form.nodeGroup}
            onChange={(e) => onFormChange({ ...form, nodeGroup: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="isBlocked">是否命中限速</Label>
          <select
            id="isBlocked"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600"
            value={form.isBlocked}
            onChange={(e) => onFormChange({ ...form, isBlocked: e.target.value as FilterFormState["isBlocked"] })}
          >
            <option value="">全部</option>
            <option value="0">未命中</option>
            <option value="1">已命中</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="requestIp">请求IP（模糊匹配）</Label>
          <Input
            id="requestIp"
            placeholder="支持 IPv4 / IPv6 片段"
            value={form.requestIp}
            onChange={(e) => onFormChange({ ...form, requestIp: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="uaKeyword">UA关键词（模糊匹配）</Label>
          <Input
            id="uaKeyword"
            placeholder="如 clash-verge"
            value={form.uaKeyword}
            onChange={(e) => onFormChange({ ...form, uaKeyword: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startTime">高级筛选开始时间</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => onFormChange({ ...form, startTime: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">高级筛选结束时间</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={form.endTime}
            onChange={(e) => onFormChange({ ...form, endTime: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-cyan-100 bg-gradient-to-r from-cyan-50/80 to-blue-50/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-semibold tracking-wide text-slate-900">多时间段筛选</h3>
            <p className="text-xs text-slate-600">日志查询按多个时间段 OR 匹配；交集用户查询返回每个时间段都出现过的用户ID。</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRangesChange([...ranges, { id: genRangeId(), start: "", end: "" }])}
          >
            <Plus className="mr-1 h-4 w-4" />
            新增时间段
          </Button>
        </div>

        {!ranges.length && <p className="text-xs text-slate-500">当前未添加时间段</p>}

        <div className="space-y-3">
          {ranges.map((range, index) => (
            <div key={range.id} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label>时间段 {index + 1} - 开始</Label>
                <Input
                  type="datetime-local"
                  value={range.start}
                  onChange={(e) => {
                    const value = e.target.value;
                    onRangesChange(ranges.map((it) => (it.id === range.id ? { ...it, start: value } : it)));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>时间段 {index + 1} - 结束</Label>
                <Input
                  type="datetime-local"
                  value={range.end}
                  onChange={(e) => {
                    const value = e.target.value;
                    onRangesChange(ranges.map((it) => (it.id === range.id ? { ...it, end: value } : it)));
                  }}
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => onRangesChange(ranges.filter((it) => it.id !== range.id))}
                aria-label="删除时间段"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="w-32 space-y-2">
        <Label htmlFor="pageSize">每页条数</Label>
        <Input
          id="pageSize"
          type="number"
          min={1}
          max={200}
          value={form.pageSize}
          onChange={(e) => onFormChange({ ...form, pageSize: e.target.value })}
        />
      </div>
    </div>
  );
}
