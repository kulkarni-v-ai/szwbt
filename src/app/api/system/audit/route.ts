import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifySuperAdminClearance } from "@/lib/system/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const adminAuth = verifySuperAdminClearance(context);
    if (adminAuth.errorResponse) {
      return adminAuth.errorResponse;
    }

    if (!adminAuth.canViewAudit) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance for Audit log inspection (AUDIT_READ required)." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const actorFilter = searchParams.get("actor")?.trim() || "";
    const actionFilter = searchParams.get("action")?.trim() || "";
    const resourceFilter = searchParams.get("resource")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (actorFilter) where.actorEmail = { contains: actorFilter, mode: "insensitive" };
    if (actionFilter) where.action = actionFilter;
    if (resourceFilter) where.resourceType = resourceFilter;
    if (search) {
      where.OR = [
        { actorEmail: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { resourceType: { contains: search, mode: "insensitive" } },
        { resourceId: { contains: search, mode: "insensitive" } },
      ];
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [logs, totalCount, todayCount, securityAlertsCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: "desc" },
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({ where: { timestamp: { gte: todayStart } } }),
      prisma.auditLog.count({
        where: {
          action: { in: ["SYSTEM_ACCESS_DENIED", "USER_ROLE_CHANGED", "USER_DISABLED", "ROLE_ASSIGNED"] },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      logs: logs.map((l) => ({
        id: l.id,
        timestamp: l.timestamp,
        actorEmail: l.actorEmail,
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId || "N/A",
        requestId: l.requestId || "N/A",
        metadata: l.metadata ? JSON.parse(l.metadata) : null,
      })),
      totalCount,
      todayCount,
      securityAlertsCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (err: any) {
    console.error("Error in GET /api/system/audit:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
