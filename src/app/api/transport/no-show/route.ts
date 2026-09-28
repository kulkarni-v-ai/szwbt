import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/transport/no-show
 * Marks an unboarded passenger as NO-SHOW.
 * Rejects if passenger is already boarded.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { tripId, participantId } = body;

      if (!tripId || !participantId) {
        return NextResponse.json(
          { success: false, error: "Missing required fields: tripId, participantId." },
          { status: 400 }
        );
      }

      const passenger = await prisma.transportPassenger.findFirst({
        where: { tripId, participantId },
        include: { participant: true, trip: true },
      });

      if (!passenger) {
        return NextResponse.json(
          { success: false, error: "Passenger assignment not found on this trip." },
          { status: 404 }
        );
      }

      if (passenger.boardingStatus === "BOARDED") {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot mark as No-Show: Passenger has already boarded this trip.",
          },
          { status: 400 }
        );
      }

      const updated = await prisma.transportPassenger.update({
        where: { id: passenger.id },
        data: {
          boardingStatus: "NO_SHOW",
        },
      });

      await logAuditEvent({
        actorEmail: context.user.email,
        actorUserId: context.user.id,
        action: "NO_SHOW_RECORDED",
        resourceType: "transport",
        resourceId: updated.id,
        metadata: {
          participantName: passenger.participant?.name,
          playerId: passenger.participant?.playerId,
          tripCode: passenger.trip.tripCode,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Passenger marked as NO-SHOW",
        passenger: updated,
      });
    } catch (error: any) {
      console.error("Error in POST /api/transport/no-show:", error);
      return NextResponse.json(
        { success: false, error: "Failed to record no-show: " + error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_BOARDING],
  }
);
