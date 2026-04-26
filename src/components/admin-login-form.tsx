"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ApiResult<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_15%,rgba(56,189,248,0.35),transparent_35%),radial-gradient(circle_at_88%_80%,rgba(34,197,94,0.28),transparent_38%)]" />

      <Card className="w-full max-w-md border-slate-200/80 bg-white/85 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.65)] backdrop-blur">
        <CardHeader className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-900">
            <Sparkles className="h-3.5 w-3.5" />
            管理员工作台
          </div>
          <CardTitle className="font-display text-2xl">管理员登录</CardTitle>
          <CardDescription>输入管理员密码后进入多页面查询后台，服务端按 SHA256 哈希比对。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password">密码</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入管理员密码"
              autoFocus
            />
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={async () => {
              setError("");
              setLoading(true);
              try {
                const res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ password })
                });

                const json = (await res.json()) as ApiResult<undefined>;
                if (!res.ok || !json.success) {
                  throw new Error(json.message || "登录失败");
                }

                router.replace("/logs");
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "登录失败");
              } finally {
                setLoading(false);
              }
            }}
          >
            <LockKeyhole className="mr-2 h-4 w-4" />
            {loading ? "登录中..." : "登录"}
          </Button>

          {error && <Badge variant="destructive">{error}</Badge>}
        </CardContent>
      </Card>
    </div>
  );
}
