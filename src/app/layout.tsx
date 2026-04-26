import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSPanel 限速日志后台",
  description: "日志筛选、UA统计、交集用户、SQLite查询归档多页面管理后台"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
