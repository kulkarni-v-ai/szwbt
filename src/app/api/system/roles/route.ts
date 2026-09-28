import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifySuperAdminClearance } from "@/lib/system/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_DEFINITIONS } from "@/lib/rbac/roles";

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

    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const formattedRoles = roles.map((r) => {
      const def = ROLE_DEFINITIONS[r.name as keyof typeof ROLE_DEFINITIONS];
      return {
        id: r.id,
        name: r.name,
        displayName: r.displayName || def?.displayName || r.name,
        description: r.description || def?.description || "",
        isSystem: r.isSystem,
        userCount: r._count.userRoles,
        permissions: r.rolePermissions.map((rp) => rp.permission.code),
        permissionCount: r.rolePermissions.length,
      };
    });

    return NextResponse.json({
      success: true,
      roles: formattedRoles,
    });
  } catch (err: any) {
    console.error("Error in GET /api/system/roles:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
