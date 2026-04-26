import { NextRequest, NextResponse } from "next/server";
import { parseLogFilters } from "@/lib/filter-parser";
import { queryUserDistinctDetail } from "@/lib/log-service";
import { requireAdminAuth } from "@/lib/route-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await req.json()) as {
      userId?: unknown;
      filters?: unknown;
    };

    const userId = Number(body.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ success: false, message: "userId 参数非法" }, { status: 400 });
    }

    const filters = parseLogFilters(body.filters ?? {});
    const data = await queryUserDistinctDetail(filters, userId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
