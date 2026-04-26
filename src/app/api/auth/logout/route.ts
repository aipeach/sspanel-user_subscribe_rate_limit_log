import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";
import { requireAdminAuth } from "@/lib/route-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return res;
}
