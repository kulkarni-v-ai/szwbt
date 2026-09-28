import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * DELETE /api/transport/passenger-assignments/[id]
 * Removes an unboarded passenger from a trip.
 */
export const DELETE = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const assignment = await prisma.transportPassenger.findUnique({
        where: { id },
        include: { participant: true, trip: true },
      });

      if (!assignment) {
        return NextResponse.json(
          { success: false, error: "Passenger assignment not found." },
          { status: 404 }
        );
      }

      // Check if already boarded
      if (assignment.boardingStatus === "BOARDED") {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot remove passenger: Passenger has already boarded this trip.",
          },
          { status: 400 }
        );
      }

      await prisma.transportPassenger.delete({
        where: { id },
      });

      await logAuditEvent({
        actorEmail: context.user.email,
        actorUserId: context.user.id,
        action: "PASSENGER_REMOVED",
        resourceType: "transport",
        resourceId: id,
        metadata: {
          participantName: assignment.participant?.name,
          tripCode: assignment.trip.tripCode,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Passenger successfully removed from trip manifest.",
      });
    } catch (error: any) {
      console.error("Error in DELETE /api/transport/passenger-assignments/[id]:", error);
      return NextResponse.json(
        { success: false, error: "Failed to remove passenger: " + error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_UPDATE],
  }
);
