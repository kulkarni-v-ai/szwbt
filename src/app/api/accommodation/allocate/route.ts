import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/accommodation/allocate
 * Allocates a single bed to a participant with full transactional safety.
 * Re-validates bed availability and duplicate allocation within DB transaction.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { participantId, teamId, bedId } = body;

      if (!bedId) {
        return NextResponse.json(
          { success: false, error: "bedId is required." },
          { status: 400 }
        );
      }

      if (!participantId) {
        return NextResponse.json(
          { success: false, error: "participantId is required." },
          { status: 400 }
        );
      }

      // Execute allocation in a serialized transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Re-check bed is AVAILABLE
        const bed = await tx.bed.findUnique({
          where: { id: bedId },
          include: {
            room: { include: { hostel: true } },
            allocations: { where: { status: "ACTIVE" } },
          },
        });

        if (!bed) {
          throw new Error("Bed not found.");
        }

        if (bed.status !== "AVAILABLE") {
          throw new Error(`Bed ${bed.bedNumber} is no longer available. Current status: ${bed.status}`);
        }

        if (bed.allocations.length > 0) {
          throw new Error(`Bed ${bed.bedNumber} already has an active allocation.`);
        }

        // 2. Check participant doesn't already have active allocation
        const existingAllocation = await tx.accommodationAllocation.findFirst({
          where: { participantId, status: "ACTIVE" },
          include: { bed: { include: { room: { include: { hostel: true } } } } },
        });

        if (existingAllocation) {
          throw new Error(
            `Participant already allocated to ${existingAllocation.bed.room.hostel.name} Room ${existingAllocation.bed.room.roomNumber} ${existingAllocation.bed.bedNumber}. Move or vacate first.`
          );
        }

        // 3. Create allocation
        const allocation = await tx.accommodationAllocation.create({
          data: {
            bedId: bed.id,
            participantId,
            teamId: teamId || null,
            allocatedBy: context.user.email,
            status: "ACTIVE",
          },
        });

        // 4. Update bed status to OCCUPIED
        await tx.bed.update({
          where: { id: bed.id },
          data: { status: "OCCUPIED" },
        });

        // 5. Update participant hostel/room fields
        await tx.participant.update({
          where: { id: participantId },
          data: {
            hostel: bed.room.hostel.name,
            room: `${bed.room.roomNumber} (${bed.bedNumber})`,
          },
        });

        return {
          allocation,
          bed,
          room: bed.room,
          hostel: bed.room.hostel,
        };
      });

      // Audit Log
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "BED_ALLOCATED",
        resourceType: "accommodation",
        resourceId: result.allocation.id,
        metadata: {
          bedId: result.bed.id,
          bedNumber: result.bed.bedNumber,
          roomNumber: result.room.roomNumber,
          hostelName: result.hostel.name,
          participantId,
          teamId: teamId || null,
          operator: context.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `${result.bed.bedNumber} in ${result.room.roomNumber} (${result.hostel.name}) allocated successfully.`,
        allocation: {
          id: result.allocation.id,
          hostelName: result.hostel.name,
          roomNumber: result.room.roomNumber,
          bedNumber: result.bed.bedNumber,
          participantId,
          allocatedBy: context.user.email,
          timestamp: result.allocation.createdAt,
        },
      });
    } catch (err: any) {
      console.error("[ACCOMMODATION_ALLOCATE_ERROR]", err);
      const status = err.message?.includes("no longer available") || err.message?.includes("already") ? 409 : 500;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_ALLOCATE],
  }
);
