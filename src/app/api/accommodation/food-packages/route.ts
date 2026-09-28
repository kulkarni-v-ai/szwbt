import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { ensureFoodPackagesSeeded } from "@/lib/food/service";

/**
 * GET /api/accommodation/food-packages
 * Returns all active daily bundled food packages, with participant assignment context if provided.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const participantId = searchParams.get("participantId");

      // Ensure food packages exist
      let packages = await prisma.foodPackage.findMany({
        where: { status: "ACTIVE" },
        orderBy: { date: "asc" },
      });

      if (packages.length === 0) {
        packages = await ensureFoodPackagesSeeded();
      }

      // If participantId is specified, fetch their current assignments
      let assignments: any[] = [];
      if (participantId) {
        assignments = await prisma.foodPackageAssignment.findMany({
          where: { participantId },
          include: { foodPackage: true },
        });
      }

      const formatted = packages.map((pkg) => {
        const assignment = assignments.find((a) => a.packageId === pkg.id && a.status === "ASSIGNED");
        return {
          id: pkg.id,
          date: pkg.date,
          dayNumber: pkg.dayNumber,
          name: pkg.name,
          components: pkg.components,
          status: pkg.status,
          assignment: assignment
            ? {
                id: assignment.id,
                status: assignment.status,
                assignedBy: assignment.assignedBy,
                assignedAt: assignment.assignedAt,
              }
            : null,
        };
      });

      return NextResponse.json({
        success: true,
        packages: formatted,
      });
    } catch (err: any) {
      console.error("[FOOD_PACKAGES_GET_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_READ],
  }
);
