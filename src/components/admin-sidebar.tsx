"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, BarChart3, Database, LogOut, Radar, ScrollText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menus = [
  { href: "/logs", label: "日志查询", icon: ScrollText },
  { href: "/ua", label: "UA 统计", icon: BarChart3 },
  { href: "/user-subscribe-counts", label: "用户订阅次数", icon: Users },
  { href: "/intersection", label: "交集用户", icon: Radar },
  { href: "/archives", label: "查询归档", icon: Archive }
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-6 lg:h-fit">
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.5)] backdrop-blur">
        <div className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <p className="font-display text-sm uppercase tracking-[0.2em]">SSPanel</p>
          </div>
          <p className="mt-1 text-xs text-cyan-50">低流量订阅限速日志后台</p>
        </div>

        <nav className="mt-4 space-y-2">
          {menus.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                  active
                    ? "border-cyan-300 bg-cyan-50 text-cyan-900 shadow-sm"
                    : "border-transparent bg-slate-50/80 text-slate-700 hover:border-slate-200 hover:bg-white"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-cyan-700" : "text-slate-500 group-hover:text-slate-800")} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          onClick={async () => {
            const res = await fetch("/api/auth/logout", { method: "POST" });
            if (res.ok) {
              window.location.href = "/login";
              return;
            }

            const json = (await res.json().catch(() => ({ message: "退出登录失败" }))) as { message?: string };
            alert(json.message || "退出登录失败");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </Button>
      </div>
    </aside>
  );
}
