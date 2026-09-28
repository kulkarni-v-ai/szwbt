import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/transport/boarding/scan
 * Resolves opaque QR code token, verifies athlete authorization, and performs wrong-trip protection.
 * Opaque token only — NEVER encodes personal/financial data into QR.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { qrToken, tripId } = body;

      if (!qrToken || typeof qrToken !== "string") {
        return NextResponse.json(
          { success: false, error: "QR scan token is required." },
          { status: 400 }
        );
      }

      const trimmedToken = qrToken.trim();

      // 1. Resolve participant from tournament QR code or player ID
      let participant = await prisma.participant.findFirst({
        where: {
          OR: [
            { qrCode: trimmedToken },
            { playerId: trimmedToken },
            { id: trimmedToken },
          ],
        },
        include: {
          teamMemberships: { include: { team: true } },
          transportBookings: {
            include: {
              trip: {
                include: { route: true, vehicle: true, driver: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      // If not resolved as individual, check if it's a team QR token
      if (!participant) {
        const team = await prisma.team.findFirst({
          where: {
            OR: [
              { teamQrToken: trimmedToken },
              { teamCode: trimmedToken },
            ],
          },
          include: {
            members: {
              include: {
                participant: {
                  include: {
                    teamMemberships: { include: { team: true } },
                    transportBookings: {
                      include: {
                        trip: {
                          include: { route: true, vehicle: true, driver: true },
                        },
                      },
                      orderBy: { createdAt: "desc" },
                    },
                  },
                },
              },
            },
          },
        });

        if (team && team.members.length > 0) {
          // Default to team captain or first member
          participant = team.members[0].participant as any;
        }
      }

      if (!participant) {
        return NextResponse.json(
          {
            success: false,
            code: "PASSENGER_NOT_FOUND",
            error: `QR code resolution failed: No tournament participant matches token [${trimmedToken}].`,
          },
          { status: 404 }
        );
      }

      const team = participant.teamMemberships[0]?.team;
      const primaryAssignment = participant.transportBookings[0] || null;

      // 2. If a specific trip was targeted for boarding, check assignment
      let targetTrip = null;
      let isAssignedToThisTrip = false;
      let isWrongTrip = false;
      let alreadyBoarded = false;
      let existingBookingOnThisTrip = null;

      if (tripId) {
        targetTrip = await prisma.transportTrip.findUnique({
          where: { id: tripId },
          include: { route: true, vehicle: true },
        });

        existingBookingOnThisTrip = participant.transportBookings.find((b) => b.tripId === tripId);
        if (existingBookingOnThisTrip) {
          isAssignedToThisTrip = true;
          if (existingBookingOnThisTrip.boardingStatus === "BOARDED") {
            alreadyBoarded = true;
          }
        } else if (primaryAssignment && primaryAssignment.tripId !== tripId) {
          // WRONG TRIP PROTECTION!
          isWrongTrip = true;
        }
      }

      // Log scan audit
      await logAuditEvent({
        actorEmail: context.user.email,
        actorUserId: context.user.id,
        action: "QR_SCANNED",
        resourceType: "transport",
        resourceId: participant.id,
        metadata: {
          participantName: participant.name,
          playerId: participant.playerId,
          targetTripId: tripId || null,
          isWrongTrip,
          alreadyBoarded,
        },
      });

      return NextResponse.json({
        success: true,
        participant: {
          id: participant.id,
          playerId: participant.playerId,
          name: participant.name,
          institution: participant.institution,
          category: participant.category,
          gender: participant.gender,
          phone: participant.phone,
          hostel: participant.hostel,
          room: participant.room,
          qrCode: participant.qrCode,
          team: team ? { id: team.id, teamCode: team.teamCode, name: team.name } : null,
        },
        assignment: existingBookingOnThisTrip
          ? {
              id: existingBookingOnThisTrip.id,
              tripId: existingBookingOnThisTrip.tripId,
              tripCode: existingBookingOnThisTrip.trip.tripCode,
              route: existingBookingOnThisTrip.trip.route?.name || existingBookingOnThisTrip.trip.routeName,
              pickupPoint: existingBookingOnThisTrip.pickupPoint,
              boardingStatus: existingBookingOnThisTrip.boardingStatus,
              boardedAt: existingBookingOnThisTrip.boardedAt?.toISOString() || null,
              boardedBy: existingBookingOnThisTrip.boardedBy || null,
            }
          : primaryAssignment
          ? {
              id: primaryAssignment.id,
              tripId: primaryAssignment.tripId,
              tripCode: primaryAssignment.trip.tripCode,
              route: primaryAssignment.trip.route?.name || primaryAssignment.trip.routeName,
              pickupPoint: primaryAssignment.pickupPoint,
              boardingStatus: primaryAssignment.boardingStatus,
              boardedAt: primaryAssignment.boardedAt?.toISOString() || null,
              boardedBy: primaryAssignment.boardedBy || null,
            }
          : null,
        verification: {
          isAssignedToThisTrip,
          isWrongTrip,
          alreadyBoarded,
          assignedTripCode: primaryAssignment?.trip?.tripCode || null,
          assignedRouteName: primaryAssignment?.trip?.route?.name || primaryAssignment?.trip?.routeName || null,
          targetTripCode: targetTrip?.tripCode || null,
        },
      });
    } catch (error: any) {
      console.error("Error in POST /api/transport/boarding/scan:", error);
      return NextResponse.json(
        { success: false, error: "QR scanner resolution error: " + error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_BOARDING],
  }
);
