import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

// Controlled status transition map
const VALID_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ["BOARDING", "DELAYED", "CANCELLED"],
  BOARDING: ["DEPARTED", "IN_TRANSIT", "DELAYED", "CANCELLED"],
  DEPARTED: ["IN_TRANSIT", "ARRIVED", "DELAYED"],
  IN_TRANSIT: ["ARRIVED", "DELAYED"],
  DELAYED: ["BOARDING", "DEPARTED", "IN_TRANSIT", "CANCELLED"],
  ARRIVED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * PATCH /api/transport/trips/[id]/status
 * Controlled status transitions for transport trips.
 */
export const PATCH = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { status: nextStatus, delayMinutes } = body;

      if (!nextStatus) {
        return NextResponse.json(
          { success: false, error: "Target status is required." },
          { status: 400 }
        );
      }

      const trip = await prisma.transportTrip.findUnique({
        where: { id },
        include: { vehicle: true, driver: true },
      });

      if (!trip) {
        return NextResponse.json(
          { success: false, error: "Trip not found." },
          { status: 404 }
        );
      }

      // Check allowed transition
      const allowedNext = VALID_TRANSITIONS[trip.status] || [];
      if (!allowedNext.includes(nextStatus) && trip.status !== nextStatus) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid status transition: Cannot change trip from ${trip.status} to ${nextStatus}. Allowed transitions: ${allowedNext.join(", ") || "None (Terminal State)"}`,
          },
          { status: 400 }
        );
      }

      // Update trip status
      const updatedTrip = await prisma.$transaction(async (tx) => {
        const updateData: any = { status: nextStatus };
        if (typeof delayMinutes === "number") {
          updateData.delayMinutes = delayMinutes;
        }

        const t = await tx.transportTrip.update({
          where: { id },
          data: updateData,
        });

        // Manage fleet status based on trip status
        if (["BOARDING", "DEPARTED", "IN_TRANSIT"].includes(nextStatus)) {
          if (trip.vehicleId) {
            await tx.transportVehicle.update({
              where: { id: trip.vehicleId },
              data: { status: "IN_SERVICE" },
            });
          }
          if (trip.driverId) {
            await tx.transportDriver.update({
              where: { id: trip.driverId },
              data: { status: "ASSIGNED" },
            });
          }
        } else if (["ARRIVED", "CANCELLED"].includes(nextStatus)) {
          // Release vehicle and driver back to AVAILABLE
          if (trip.vehicleId) {
            await tx.transportVehicle.update({
              where: { id: trip.vehicleId },
              data: { status: "AVAILABLE" },
            });
          }
          if (trip.driverId) {
            await tx.transportDriver.update({
              where: { id: trip.driverId },
              data: { status: "AVAILABLE" },
            });
          }
        }

        return t;
      });

      // Audit Log
      await logAuditEvent({
        actorEmail: context.user.email,
        actorUserId: context.user.id,
        action: "TRIP_STATUS_CHANGED",
        resourceType: "transport",
        resourceId: updatedTrip.id,
        metadata: {
          tripCode: updatedTrip.tripCode,
          previousStatus: trip.status,
          newStatus: nextStatus,
          delayMinutes: delayMinutes || 0,
        },
      });

      return NextResponse.json({
        success: true,
        trip: updatedTrip,
      });
    } catch (error: any) {
      console.error("Error in PATCH /api/transport/trips/[id]/status:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update trip status: " + error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.TRANSPORT_UPDATE],
  }
);
