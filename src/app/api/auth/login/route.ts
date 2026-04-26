import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createSessionToken, verifyAdminPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { password?: string };
    const password = body.password?.trim() || "";

    if (!password) {
      return NextResponse.json({ success: false, message: "请输入密码" }, { status: 400 });
    }

    if (!verifyAdminPassword(password)) {
      return NextResponse.json({ success: false, message: "密码错误" }, { status: 401 });
    }

    const token = createSessionToken();
    const res = NextResponse.json({ success: true });
    res.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24
    });

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
