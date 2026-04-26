"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

type PageToken = number | "ellipsis-left" | "ellipsis-right";

function clampPage(value: number, totalPages: number): number {
  return Math.max(1, Math.min(totalPages, value));
}

function getVisiblePages(current: number, totalPages: number): PageToken[] {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }

  if (current >= totalPages - 3) {
    return [1, "ellipsis-left", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-left", current - 1, current, current + 1, "ellipsis-right", totalPages];
}

export function PaginationControls({ page, pageSize, total, disabled = false, onPageChange }: PaginationControlsProps) {
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);
  const safePage = clampPage(page, totalPages);
  const visiblePages = useMemo(() => getVisiblePages(safePage, totalPages), [safePage, totalPages]);
  const [jumpValue, setJumpValue] = useState(String(safePage));

  useEffect(() => {
    setJumpValue(String(safePage));
  }, [safePage]);

  const commitJump = () => {
    const parsed = Number(jumpValue.trim());
    if (!Number.isFinite(parsed)) {
      setJumpValue(String(safePage));
      return;
    }

    const target = clampPage(Math.floor(parsed), totalPages);
    setJumpValue(String(target));
    if (target !== safePage) {
      onPageChange(target);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        上一页
      </Button>

      {visiblePages.map((p) => (
        typeof p === "number" ? (
          <Button
            key={p}
            type="button"
            size="sm"
            variant={p === safePage ? "default" : "outline"}
            disabled={disabled}
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ) : (
          <span key={p} className="px-1 text-slate-500">
            ...
          </span>
        )
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
      >
        下一页
      </Button>

      <span className="ml-1 text-xs text-slate-600">
        {safePage}/{totalPages}
      </span>

      <Input
        type="number"
        min={1}
        max={totalPages}
        value={jumpValue}
        disabled={disabled}
        onChange={(e) => setJumpValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commitJump();
          }
        }}
        className="h-8 w-20"
      />
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={commitJump}>
        跳转
      </Button>
    </div>
  );
}
