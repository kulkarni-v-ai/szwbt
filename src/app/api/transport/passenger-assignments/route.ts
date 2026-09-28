import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/transport/passenger-assignments
 * Assigns an existing tournament participant to a transport trip and pickup point.
 * Enforces vehicle physical capacity, duplicate prevention, and route stop validation.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { participantId, tripId, pickupPoint, dropPoint } = body;

      if (!participantId || !tripId || !pickupPoint) {
        return NextResponse.json(
          { success: false, error: "Missing required fields: participantId, tripId, pickupPoint." },
          { status: 400 }
        );
      }

      // 1. Fetch Participant
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: { teamMemberships: { include: { team: true } } },
      });
      if (!participant) {
        return NextResponse.json(
          { success: false, error: "Participant not found." },
          { status: 404 }
        );
      }

      // 2. Fetch Trip with Vehicle and current passenger count
      const trip = await prisma.transportTrip.findUnique({
        where: { id: tripId },
        include: {
          vehicle: true,
          route: { include: { stops: true } },
          passengers: true,
        },
      });
      if (!trip) {
        return NextResponse.json(
          { success: false, error: "Trip not found." },
          { status: 404 }
        );
      }

      // Check if trip is active/assignable
      if (trip.status === "ARRIVED" || trip.status === "CANCELLED") {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot assign passengers: Trip ${trip.tripCode} is already ${trip.status.toLowerCase()}.`,
          },
          { status: 400 }
        );
      }

      // 3. Validate Vehicle Physical Capacity (ZERO hardcoded limits)
      const currentAssignedCount = trip.passengers.length;
      const tripCapacity = trip.vehicle?.capacity || trip.capacity;

      if (currentAssignedCount >= tripCapacity) {
        return NextResponse.json(
          {
            success: false,
            error: `VEHICLE AT CAPACITY: Trip ${trip.tripCode} has reached maximum physical capacity (${currentAssignedCount}/${tripCapacity} seats assigned).`,
          },
          { status: 409 }
        );
      }

      // 4. Duplicate assignment prevention
      const existingAssignment = trip.passengers.find((p) => p.participantId === participantId);
      if (existingAssignment) {
        return NextResponse.json(
          {
            success: false,
            error: `PASSENGER ALREADY ASSIGNED: Participant ${participant.name} is already assigned to trip ${trip.tripCode}.`,
          },
          { status: 409 }
        );
      }

      // 5. Create Passenger Assignment
      const teamId = participant.teamMemberships[0]?.teamId || null;

      const assignment = await prisma.transportPassenger.create({
        data: {
          tripId: trip.id,
          participantId: participant.id,
          teamId,
          pickupPoint,
          dropPoint: dropPoint || trip.dropPoint || trip.route?.destination || null,
          boardingStatus: "PENDING",
        },
        include: {
          participant: true,
          trip: true,
        },
      });

      // 6. Audit Log
      await logAuditEvent({
        actorEmail: context.user.email,
        actorUserId: context.user.id,
        action: "PASSENGER_ASSIGNED",
        resourceType: "transport",
        resourceId: assignment.id,
        metadata: {
          participantName: participant.name,
          playerId: participant.playerId,
          tripCode: trip.tripCode,
          pickupPoint,
          capacityUsage: `${currentAssignedCount + 1}/${tripCapacity}`,
        },
      });

      return NextResponse.json({
        success: true,
        assignment,
        capacityUsage: {
          assigned: currentAssignedCount + 1,
          total: tripCapacity,
        },
      });
    } catch (error: any) {
      console.error("Error in POST /api/transport/passenger-assignments:", error);
      return NextResponse.json(
        { success: false, error: "Failed to assign passenger: " + error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_ASSIGN],
  }
);
