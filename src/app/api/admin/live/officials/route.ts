import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/admin/live/officials
 * Returns all active users holding the MATCH_OFFICIAL role.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const officials = await prisma.user.findMany({
        where: {
          isActive: true,
          userRoles: { some: { role: { name: "MATCH_OFFICIAL" } } },
        },
        select: {
          id: true,
          name: true,
          email: true,
          officialId: true,
          badge: true,
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json({
        success: true,
        data: officials,
      });
    } catch (error: any) {
      console.error("[GET /api/admin/live/officials] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.LIVE_READ],
  }
);
