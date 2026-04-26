import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export function requireAdminAuth(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ success: false, message: "未登录或登录已失效" }, { status: 401 });
  }

  return null;
}
