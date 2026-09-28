import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/accommodation/allocations/vacate
 * Safely releases a bed and marks the allocation as VACATED.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { allocationId, bedId } = body;

      if (!allocationId && !bedId) {
        return NextResponse.json(
          { success: false, error: "Either allocationId or bedId is required." },
          { status: 400 }
        );
      }

      // 1. Locate active allocation
      let allocation = null;
      if (allocationId) {
        allocation = await prisma.accommodationAllocation.findUnique({
          where: { id: allocationId },
          include: {
            participant: true,
            bed: {
              include: {
                room: {
                  include: { hostel: true },
                },
              },
            },
          },
        });
      } else if (bedId) {
        allocation = await prisma.accommodationAllocation.findFirst({
          where: { bedId, status: "ACTIVE" },
          include: {
            participant: true,
            bed: {
              include: {
                room: {
                  include: { hostel: true },
                },
              },
            },
          },
        });
      }

      if (!allocation || allocation.status !== "ACTIVE") {
        return NextResponse.json(
          { success: false, error: "Active allocation record not found." },
          { status: 404 }
        );
      }

      const participantName = allocation.participant?.name || "Participant";
      const bedNumber = allocation.bed.bedNumber;
      const roomNumber = allocation.bed.room.roomNumber;
      const hostelName = allocation.bed.room.hostel.name;

      // 2. ATOMIC TRANSACTION: Vacate
      await prisma.$transaction(async (tx) => {
        // Mark allocation as VACATED
        await tx.accommodationAllocation.update({
          where: { id: allocation.id },
          data: {
            status: "VACATED",
            checkOutDate: new Date(),
          },
        });

        // Set bed status to AVAILABLE
        await tx.bed.update({
          where: { id: allocation.bedId },
          data: { status: "AVAILABLE" },
        });

        // Clear participant hostel/room
        if (allocation.participantId) {
          await tx.participant.update({
            where: { id: allocation.participantId },
            data: {
              hostel: null,
              room: null,
            },
          });
        }
      });

      // 3. Record Audit Event
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "BED_VACATED",
        resourceType: "accommodation",
        resourceId: allocation.id,
        metadata: {
          allocationId: allocation.id,
          bedId: allocation.bedId,
          bedNumber,
          roomNumber,
          hostelName,
          participantId: allocation.participantId,
          participantName,
          operator: context.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `BED VACATED: ${bedNumber} in ${roomNumber} (${hostelName}) is now AVAILABLE.`,
      });
    } catch (err: any) {
      console.error("[ACCOMMODATION_VACATE_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_VACATE],
    auditAction: "BED_VACATED",
    auditResource: "accommodation",
  }
);
