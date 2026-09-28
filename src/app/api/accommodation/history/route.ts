import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/accommodation/history
 * Returns audit trail of recent accommodation operations (Allocations, Transfers, Vacates).
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const actionFilter = searchParams.get("action"); // "ALLOCATED", "MOVED", "VACATED"
      const hostelFilter = searchParams.get("hostel");

      // Query audit logs for accommodation actions
      const whereClause: any = {
        resourceType: "accommodation",
      };

      if (actionFilter && actionFilter !== "ALL") {
        whereClause.action = actionFilter;
      }

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: "desc" },
        take: 50,
      });

      const formatted = logs.map((log) => {
        let meta: any = {};
        try {
          if (log.metadata) meta = JSON.parse(log.metadata);
        } catch {}

        return {
          id: log.id,
          action: log.action.replace("ACCOMMODATION_", "").replace("BED_", ""),
          actorEmail: log.actorEmail,
          timestamp: log.timestamp.toISOString().replace("T", " ").slice(0, 16),
          personName: meta.participantName || meta.personName || "Athlete",
          hostelName: meta.hostelName || (meta.to ? meta.to.hostel : "Shalmala Hostel"),
          roomNumber: meta.roomNumber || (meta.to ? meta.to.room : "—"),
          bedNumber: meta.bedNumber || (meta.to ? meta.to.bed : "—"),
          details: meta.from ? `From ${meta.from.room} (${meta.from.bed}) → To ${meta.to.room} (${meta.to.bed})` : undefined,
        };
      });

      let results = formatted;
      if (hostelFilter && hostelFilter !== "ALL") {
        results = results.filter((item) =>
          item.hostelName.toLowerCase().includes(hostelFilter.toLowerCase())
        );
      }

      return NextResponse.json({
        success: true,
        count: results.length,
        history: results,
      });
    } catch (err: any) {
      console.error("[ACCOMMODATION_HISTORY_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_READ],
  }
);
