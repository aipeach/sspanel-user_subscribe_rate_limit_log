"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SaveNoteDialogProps {
  open: boolean;
  title: string;
  confirmText?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (remark: string) => void;
}

export function SaveNoteDialog({
  open,
  title,
  confirmText = "确认保存",
  loading = false,
  onCancel,
  onConfirm
}: SaveNoteDialogProps) {
  const [remark, setRemark] = useState("");

  useEffect(() => {
    if (open) {
      setRemark("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">请填写本次保存备注，便于后续追溯。</p>

        <div className="mt-4 space-y-2">
          <label htmlFor="save-remark" className="text-sm font-medium text-slate-700">
            备注
          </label>
          <Input
            id="save-remark"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="例如：晚高峰异常流量排查"
            maxLength={120}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button
            type="button"
            disabled={loading || !remark.trim()}
            onClick={() => {
              onConfirm(remark.trim());
            }}
          >
            {loading ? "保存中..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
