import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/transport/trips/[id]
 * Trip detail and full Passenger Manifest.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const trip = await prisma.transportTrip.findUnique({
        where: { id },
        include: {
          route: {
            include: { stops: { orderBy: { orderIndex: "asc" } } },
          },
          vehicle: true,
          driver: true,
          passengers: {
            include: {
              participant: {
                select: {
                  id: true,
                  playerId: true,
                  name: true,
                  institution: true,
                  category: true,
                  phone: true,
                  email: true,
                  hostel: true,
                  room: true,
                  qrCode: true,
                },
              },
              team: {
                select: {
                  id: true,
                  teamCode: true,
                  name: true,
                  institution: true,
                },
              },
            },
            orderBy: [{ boardingStatus: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      if (!trip) {
        return NextResponse.json(
          { success: false, error: "Trip not found." },
          { status: 404 }
        );
      }

      const expected = trip.passengers.length;
      const boarded = trip.passengers.filter((p) => p.boardingStatus === "BOARDED").length;
      const remaining = trip.passengers.filter((p) => p.boardingStatus === "PENDING").length;
      const noShows = trip.passengers.filter((p) => p.boardingStatus === "NO_SHOW").length;

      const manifest = trip.passengers.map((p) => ({
        id: p.id,
        participantId: p.participantId,
        name: p.participant?.name || "Unknown Participant",
        playerId: p.participant?.playerId || "—",
        team: p.team?.name || p.participant?.institution || "Independent",
        institution: p.participant?.institution || p.team?.institution || "—",
        pickupPoint: p.pickupPoint || trip.pickupPoint || "—",
        dropPoint: p.dropPoint || trip.dropPoint || "—",
        boardingStatus: p.boardingStatus,
        boardedAt: p.boardedAt ? p.boardedAt.toISOString() : null,
        boardedBy: p.boardedBy || null,
        isOverride: p.isOverride,
        overrideReason: p.overrideReason || null,
        phone: p.participant?.phone || "—",
        email: p.participant?.email || "—",
        hostel: p.participant?.hostel || "—",
        room: p.participant?.room || "—",
        qrCode: p.participant?.qrCode || "—",
      }));

      return NextResponse.json({
        success: true,
        trip: {
          id: trip.id,
          tripCode: trip.tripCode,
          date: trip.scheduledDate,
          time: trip.scheduledTime,
          estimatedArrival: trip.estimatedArrival,
          route: trip.route,
          routeName: trip.route ? trip.route.name : trip.routeName || "—",
          routeCode: trip.route?.code || "—",
          vehicle: trip.vehicle,
          vehicleNo: trip.vehicle ? trip.vehicle.registrationNumber : trip.vehicleNo || "—",
          driver: trip.driver,
          driverName: trip.driver ? trip.driver.name : trip.driverName || "—",
          driverPhone: trip.driver ? trip.driver.phone : trip.driverPhone || "—",
          pickupPoint: trip.pickupPoint || trip.route?.origin || "—",
          dropPoint: trip.dropPoint || trip.route?.destination || "—",
          status: trip.status,
          delayMinutes: trip.delayMinutes,
          capacity: trip.capacity,
          expected,
          boarded,
          remaining,
          noShows,
          manifest,
        },
      });
    } catch (error: any) {
      console.error("Error in GET /api/transport/trips/[id]:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch trip details." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_READ],
  }
);
