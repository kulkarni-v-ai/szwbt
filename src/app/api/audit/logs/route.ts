import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
      const action = searchParams.get("action");
      const resourceType = searchParams.get("resourceType");

      const whereClause: any = {};
      if (action) whereClause.action = action.toUpperCase();
      if (resourceType) whereClause.resourceType = resourceType.toLowerCase();

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: "desc" },
        take: limit,
      });

      return NextResponse.json({
        success: true,
        count: logs.length,
        logs: logs.map((log) => ({
          id: log.id,
          actorUserId: log.actorUserId,
          actorEmail: log.actorEmail,
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          timestamp: log.timestamp,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
        })),
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  { permissions: [PERMISSIONS.AUDIT_READ] }
);
