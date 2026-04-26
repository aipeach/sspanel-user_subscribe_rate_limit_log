import { NextRequest, NextResponse } from "next/server";
import { archiveQuerySnapshot, deleteQueryArchiveById, listQueryArchives } from "@/lib/query-archive-service";
import { requireAdminAuth } from "@/lib/route-auth";
import type { LogFilters, QueryActionType } from "@/types/log";

export const runtime = "nodejs";

const VALID_ACTION_TYPES: QueryActionType[] = ["logs", "ua", "intersection"];

export async function GET(req: NextRequest) {
  const unauthorized = requireAdminAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { searchParams } = new URL(req.url);
    const pageRaw = Number(searchParams.get("page") || 1);
    const pageSizeRaw = Number(searchParams.get("pageSize") || searchParams.get("limit") || 20);
    const actionTypeRaw = searchParams.get("actionType");
    const sortByRaw = searchParams.get("sortBy") || undefined;
    const sortOrderRaw = searchParams.get("sortOrder");

    const actionType = VALID_ACTION_TYPES.includes(actionTypeRaw as QueryActionType)
      ? (actionTypeRaw as QueryActionType)
      : undefined;
    const sortOrder = sortOrderRaw === "asc" || sortOrderRaw === "desc" ? sortOrderRaw : undefined;

    const data = await listQueryArchives({
      actionType,
      page: pageRaw,
      pageSize: pageSizeRaw,
      sortBy: sortByRaw,
      sortOrder
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await req.json()) as {
      actionType?: unknown;
      filters?: unknown;
      resultTotal?: unknown;
      resultPayload?: unknown;
      remark?: unknown;
    };

    const actionTypeRaw = String(body.actionType || "");
    if (!VALID_ACTION_TYPES.includes(actionTypeRaw as QueryActionType)) {
      return NextResponse.json({ success: false, message: "不支持的归档类型" }, { status: 400 });
    }

    const resultTotal = Number(body.resultTotal || 0);
    if (!Number.isFinite(resultTotal) || resultTotal < 0) {
      return NextResponse.json({ success: false, message: "resultTotal 参数非法" }, { status: 400 });
    }

    const remark = String(body.remark || "").trim();
    if (!remark) {
      return NextResponse.json({ success: false, message: "请填写备注后再保存" }, { status: 400 });
    }

    const filters = (body.filters && typeof body.filters === "object" ? body.filters : {}) as LogFilters;
    const archiveId = await archiveQuerySnapshot(
      actionTypeRaw as QueryActionType,
      filters,
      resultTotal,
      body.resultPayload ?? null,
      remark
    );

    return NextResponse.json({ success: true, data: { id: archiveId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const unauthorized = requireAdminAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id") || 0);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ success: false, message: "id 参数非法" }, { status: 400 });
    }

    const deleted = await deleteQueryArchiveById(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "归档记录不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
