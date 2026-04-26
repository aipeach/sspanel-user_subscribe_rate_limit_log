import { NextRequest, NextResponse } from "next/server";
import { parseLogFilters } from "@/lib/filter-parser";
import { queryIntersectionUsersByRanges } from "@/lib/log-service";
import { requireAdminAuth } from "@/lib/route-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await req.json();
    const filters = parseLogFilters(body);
    const data = await queryIntersectionUsersByRanges(filters);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
