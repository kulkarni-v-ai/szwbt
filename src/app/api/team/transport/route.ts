import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthorizedTeam } from "@/lib/team/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const teamAuth = await resolveAuthorizedTeam(req, context);
    if (teamAuth.errorResponse) {
      return teamAuth.errorResponse;
    }

    const { selectedTeamId } = teamAuth;
    if (!selectedTeamId) {
      return NextResponse.json({
        success: true,
        trips: [],
        passengers: [],
        message: "No team assigned.",
      });
    }

    // Load transport bookings for this team and its members
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: selectedTeamId },
      include: { participant: true },
    });

    const memberIds = teamMembers.map((m) => m.participantId);

    const passengers = await prisma.transportPassenger.findMany({
      where: {
        OR: [
          { teamId: selectedTeamId },
          { participantId: { in: memberIds } },
        ],
      },
      include: {
        participant: true,
        trip: {
          include: {
            route: {
              include: { stops: { orderBy: { orderIndex: "asc" } } },
            },
            vehicle: true,
            driver: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Extract unique trips
    const tripMap = new Map<string, any>();
    passengers.forEach((p) => {
      const trip = p.trip;
      if (!tripMap.has(trip.id)) {
        tripMap.set(trip.id, {
          tripId: trip.id,
          tripCode: trip.tripCode,
          routeName: trip.route?.name || trip.routeName || "Official Shuttle",
          routeCode: trip.route?.code || "RT-SZ",
          origin: trip.route?.origin || "Designated Transit Hub",
          destination: trip.route?.destination || "KLE Tech Arena / Hostels",
          scheduledDate: trip.scheduledDate,
          scheduledTime: trip.scheduledTime,
          estimatedArrival: trip.estimatedArrival,
          vehicleNo: trip.vehicle?.registrationNumber || trip.vehicleNo || "University Fleet",
          vehicleType: trip.vehicle?.type || "SHUTTLE_BUS",
          driverName: trip.driver?.name || trip.driverName || "Official Transport Driver",
          driverPhone: trip.driver?.phone || trip.driverPhone || null,
          status: trip.status, // SCHEDULED, BOARDING, IN_TRANSIT, ARRIVED, DELAYED
          delayMinutes: trip.delayMinutes,
        });
      }
    });

    const passengerList = passengers.map((p) => {
      const participant = p.participant;
      const teamMember = teamMembers.find((tm) => tm.participantId === p.participantId);

      return {
        id: p.id,
        passengerName: participant?.name || "Team Contingent",
        playerId: participant?.playerId || null,
        role: teamMember?.role || "MEMBER",
        tripCode: p.trip.tripCode,
        routeName: p.trip.route?.name || p.trip.routeName || "Official Shuttle",
        pickupPoint: p.pickupPoint || "Official Pickup Point",
        dropPoint: p.dropPoint || "Main Arena / Hostels",
        boardingStatus: p.boardingStatus, // PENDING, BOARDED, NO_SHOW
        boardedAt: p.boardedAt,
        boardedBy: p.boardedBy ? "Transport Staff" : null,
      };
    });

    return NextResponse.json({
      success: true,
      teamId: selectedTeamId,
      summary: {
        totalTrips: tripMap.size,
        totalBookings: passengerList.length,
        boardedCount: passengerList.filter((p) => p.boardingStatus === "BOARDED").length,
        status: passengerList.length > 0 ? "ASSIGNED" : "NOT ASSIGNED",
      },
      assignedTrips: Array.from(tripMap.values()),
      passengerManifest: passengerList,
      policyNotice: "Championship transit shuttles are provided free of cost by KLE Technological University for all accredited teams.",
    });
  } catch (err: any) {
    console.error("Error in GET /api/team/transport:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
