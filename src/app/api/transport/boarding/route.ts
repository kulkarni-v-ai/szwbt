import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/transport/boarding
 * Mark passenger as BOARDED on a transport trip.
 * Enforces wrong-trip protection, already-boarded prevention, and capacity verification.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { tripId, participantId, isOverride, overrideReason, pickupPoint } = body;

      if (!tripId || !participantId) {
        return NextResponse.json(
          { success: false, error: "Missing required fields: tripId, participantId." },
          { status: 400 }
        );
      }

      // 1. Fetch Trip and Vehicle
      const trip = await prisma.transportTrip.findUnique({
        where: { id: tripId },
        include: { vehicle: true, passengers: true },
      });
      if (!trip) {
        return NextResponse.json(
          { success: false, error: "Trip not found." },
          { status: 404 }
        );
      }

      if (trip.status === "ARRIVED" || trip.status === "CANCELLED") {
        return NextResponse.json(
          { success: false, error: `Cannot board passenger: Trip is already ${trip.status.toLowerCase()}.` },
          { status: 400 }
        );
      }

      // 2. Fetch Participant
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: {
          teamMemberships: true,
          transportBookings: {
            include: { trip: true },
          },
        },
      });
      if (!participant) {
        return NextResponse.json(
          { success: false, error: "Participant not found." },
          { status: 404 }
        );
      }

      // 3. Check existing booking on THIS trip
      const existingBookingOnThisTrip = trip.passengers.find((p) => p.participantId === participantId);

      // 4. Check if already boarded on this trip
      if (existingBookingOnThisTrip && existingBookingOnThisTrip.boardingStatus === "BOARDED") {
        return NextResponse.json(
          {
            success: false,
            code: "PASSENGER_ALREADY_BOARDED",
            error: `ACTION ALREADY COMPLETED: Passenger ${participant.name} is already boarded on trip ${trip.tripCode}.`,
            boardedAt: existingBookingOnThisTrip.boardedAt?.toISOString(),
            boardedBy: existingBookingOnThisTrip.boardedBy,
          },
          { status: 409 }
        );
      }

      // 5. Wrong Trip Protection:
      // If participant is booked on another trip and not on this trip, check override
      const otherActiveBooking = participant.transportBookings.find(
        (b) => b.tripId !== tripId && ["SCHEDULED", "BOARDING", "IN_TRANSIT"].includes(b.trip.status)
      );

      if (!existingBookingOnThisTrip && otherActiveBooking && !isOverride) {
        return NextResponse.json(
          {
            success: false,
            code: "WRONG_TRIP",
            error: `PASSENGER ASSIGNED TO ANOTHER TRIP: ${participant.name} is scheduled for ${otherActiveBooking.trip.tripCode}. Override required to board on ${trip.tripCode}.`,
            assignedTrip: {
              tripCode: otherActiveBooking.trip.tripCode,
              status: otherActiveBooking.trip.status,
            },
            currentTrip: {
              tripCode: trip.tripCode,
              status: trip.status,
            },
          },
          { status: 400 }
        );
      }

      // 6. If override/new assignment, check capacity limit
      if (!existingBookingOnThisTrip) {
        const capacity = trip.vehicle?.capacity || trip.capacity;
        if (trip.passengers.length >= capacity) {
          return NextResponse.json(
            {
              success: false,
              code: "CAPACITY_EXCEEDED",
              error: `VEHICLE AT CAPACITY: Cannot board passenger. Trip ${trip.tripCode} is full (${trip.passengers.length}/${capacity}).`,
            },
            { status: 409 }
          );
        }
      }

      // 7. Record Boarding (Database transaction)
      const now = new Date();
      const operatorEmail = context.user.email;

      const record = await prisma.$transaction(async (tx) => {
        if (existingBookingOnThisTrip) {
          return await tx.transportPassenger.update({
            where: { id: existingBookingOnThisTrip.id },
            data: {
              boardingStatus: "BOARDED",
              boardedAt: now,
              boardedBy: operatorEmail,
              isOverride: Boolean(isOverride),
              overrideReason: overrideReason || null,
            },
          });
        } else {
          // Create assignment and board in one step (for authorized overrides)
          const teamId = participant.teamMemberships[0]?.teamId || null;
          return await tx.transportPassenger.create({
            data: {
              tripId: trip.id,
              participantId: participant.id,
              teamId,
              pickupPoint: pickupPoint || trip.pickupPoint || "On-Site Boarding",
              dropPoint: trip.dropPoint,
              boardingStatus: "BOARDED",
              boardedAt: now,
              boardedBy: operatorEmail,
              isOverride: Boolean(isOverride),
              overrideReason: overrideReason || "On-ground manual dispatch override",
            },
          });
        }
      });

      // 8. Audit Log
      await logAuditEvent({
        actorEmail: operatorEmail,
        actorUserId: context.user.id,
        action: isOverride ? "OVERRIDE_PERFORMED" : "BOARDING_RECORDED",
        resourceType: "transport",
        resourceId: record.id,
        metadata: {
          participantName: participant.name,
          playerId: participant.playerId,
          tripCode: trip.tripCode,
          isOverride: Boolean(isOverride),
          overrideReason: overrideReason || null,
        },
      });

      return NextResponse.json({
        success: true,
        message: "BOARDED",
        boarding: {
          id: record.id,
          participantName: participant.name,
          playerId: participant.playerId,
          tripCode: trip.tripCode,
          boardedAt: now.toISOString(),
          boardedBy: operatorEmail,
          isOverride: Boolean(isOverride),
        },
      });
    } catch (error: any) {
      console.error("Error in POST /api/transport/boarding:", error);
      return NextResponse.json(
        { success: false, error: "Failed to record boarding: " + error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_BOARDING],
  }
);
