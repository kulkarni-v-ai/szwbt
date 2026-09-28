import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/transport/history
 * Server-side paginated history of past trips and transport audit trail.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15")));
      const status = searchParams.get("status");
      const date = searchParams.get("date");
      const skip = (page - 1) * limit;

      const whereClause: any = {};
      if (status && status !== "ALL") {
        whereClause.status = status;
      }
      if (date) {
        whereClause.scheduledDate = date;
      }

      const [totalCount, trips, auditLogs] = await Promise.all([
        prisma.transportTrip.count({ where: whereClause }),
        prisma.transportTrip.findMany({
          where: whereClause,
          include: {
            route: true,
            vehicle: true,
            driver: true,
            passengers: {
              select: { boardingStatus: true },
            },
          },
          orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }],
          skip,
          take: limit,
        }),
        prisma.auditLog.findMany({
          where: { resourceType: "transport" },
          orderBy: { timestamp: "desc" },
          take: 20,
        }),
      ]);

      const formattedTrips = trips.map((trip) => {
        const expected = trip.passengers.length;
        const boarded = trip.passengers.filter((p) => p.boardingStatus === "BOARDED").length;
        const noShows = trip.passengers.filter((p) => p.boardingStatus === "NO_SHOW").length;

        return {
          id: trip.id,
          tripCode: trip.tripCode,
          date: trip.scheduledDate,
          time: trip.scheduledTime,
          route: trip.route ? trip.route.name : trip.routeName || "—",
          vehicle: trip.vehicle ? trip.vehicle.registrationNumber : trip.vehicleNo || "—",
          driver: trip.driver ? trip.driver.name : trip.driverName || "—",
          expected,
          boarded,
          noShows,
          finalStatus: trip.status,
          capacity: trip.capacity,
        };
      });

      const formattedLogs = auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorEmail: log.actorEmail,
        timestamp: log.timestamp.toISOString(),
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      }));

      return NextResponse.json({
        success: true,
        trips: formattedTrips,
        auditLogs: formattedLogs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error: any) {
      console.error("Error in GET /api/transport/history:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch transport history." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_READ],
  }
);
