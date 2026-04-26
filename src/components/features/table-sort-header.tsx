"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

interface TableSortHeaderProps {
  label: string;
  activeDirection?: SortDirection | null;
  onAsc: () => void;
  onDesc: () => void;
}

export function TableSortHeader({ label, activeDirection = null, onAsc, onDesc }: TableSortHeaderProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{label}</span>
      <button
        type="button"
        className={cn(
          "rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",
          activeDirection === "asc" && "bg-cyan-100 text-cyan-700"
        )}
        onClick={onAsc}
        aria-label={`${label}升序`}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={cn(
          "rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700",
          activeDirection === "desc" && "bg-cyan-100 text-cyan-700"
        )}
        onClick={onDesc}
        aria-label={`${label}降序`}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
