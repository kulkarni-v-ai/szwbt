import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifySuperAdminClearance } from "@/lib/system/auth";
import { prisma } from "@/lib/prisma";
import { ALL_PERMISSIONS } from "@/lib/rbac/permissions";

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

    const dbPermissions = await prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    });

    // Group by resource
    const grouped: Record<string, any[]> = {};
    for (const p of dbPermissions) {
      if (!grouped[p.resource]) {
        grouped[p.resource] = [];
      }
      grouped[p.resource].push({
        id: p.id,
        code: p.code,
        resource: p.resource,
        action: p.action,
        description: p.description,
      });
    }

    return NextResponse.json({
      success: true,
      totalCount: dbPermissions.length,
      grouped,
      permissions: dbPermissions,
    });
  } catch (err: any) {
    console.error("Error in GET /api/system/permissions:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
