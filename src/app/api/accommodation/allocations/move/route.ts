import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/accommodation/allocations/move
 * Move an allocated person from their current bed to a new target bed.
 * ATOMIC TRANSACTION:
 * If the target bed allocation fails, the old bed allocation remains completely intact.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { allocationId, targetBedId } = body;

      if (!allocationId || !targetBedId) {
        return NextResponse.json(
          { success: false, error: "allocationId and targetBedId are required." },
          { status: 400 }
        );
      }

      // 1. Fetch active allocation
      const currentAllocation = await prisma.accommodationAllocation.findUnique({
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

      if (!currentAllocation || currentAllocation.status !== "ACTIVE") {
        return NextResponse.json(
          { success: false, error: "Active allocation record not found." },
          { status: 404 }
        );
      }

      // 2. Fetch and check target bed
      const targetBed = await prisma.bed.findUnique({
        where: { id: targetBedId },
        include: {
          room: {
            include: { hostel: true },
          },
        },
      });

      if (!targetBed) {
        return NextResponse.json(
          { success: false, error: "Target bed not found." },
          { status: 404 }
        );
      }

      if (targetBed.status !== "AVAILABLE") {
        return NextResponse.json(
          {
            success: false,
            error: "TARGET BED OCCUPIED. Target bed is no longer available. Please select another bed.",
            code: "BED_OCCUPIED",
          },
          { status: 409 }
        );
      }

      // 3. Enforce gender/hostel eligibility
      const participant = currentAllocation.participant;
      const gender = (participant?.gender || "FEMALE").toUpperCase();
      const targetHostelId = targetBed.room.hostelId;

      if (targetHostelId === "SHALMALA" && gender === "MALE") {
        return NextResponse.json(
          { success: false, error: "Male participants must stay in Vindhya Boys Hostel." },
          { status: 400 }
        );
      }

      if (targetHostelId === "VINDHYA" && gender === "FEMALE") {
        return NextResponse.json(
          { success: false, error: "Female participants must stay in Shalmala Hostel." },
          { status: 400 }
        );
      }

      // 4. ATOMIC TRANSACTION: Move
      const result = await prisma.$transaction(async (tx) => {
        // Double-check target bed is still available
        const atomicTarget = await tx.bed.findFirst({
          where: { id: targetBedId, status: "AVAILABLE" },
        });

        if (!atomicTarget) {
          throw new Error("409_CONFLICT: Target bed was claimed by another operator.");
        }

        // 1. Release old bed
        await tx.bed.update({
          where: { id: currentAllocation.bedId },
          data: { status: "AVAILABLE" },
        });

        // 2. Occupy new bed
        await tx.bed.update({
          where: { id: targetBedId },
          data: { status: "OCCUPIED" },
        });

        // 3. Update Allocation record
        const updatedAllocation = await tx.accommodationAllocation.update({
          where: { id: allocationId },
          data: {
            bedId: targetBedId,
            allocatedBy: context.user.email,
          },
        });

        // 4. Update Participant room string
        if (participant) {
          await tx.participant.update({
            where: { id: participant.id },
            data: {
              hostel: targetBed.room.hostel.name,
              room: `${targetBed.room.roomNumber} (${targetBed.bedNumber})`,
            },
          });
        }

        return { updatedAllocation };
      });

      // 5. Audit Log
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "ALLOCATION_MOVED",
        resourceType: "accommodation",
        resourceId: allocationId,
        metadata: {
          allocationId,
          participantName: participant?.name,
          from: {
            hostel: currentAllocation.bed.room.hostel.name,
            room: currentAllocation.bed.room.roomNumber,
            bed: currentAllocation.bed.bedNumber,
          },
          to: {
            hostel: targetBed.room.hostel.name,
            room: targetBed.room.roomNumber,
            bed: targetBed.bedNumber,
          },
          operator: context.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `TRANSFER CONFIRMED: ${participant?.name} moved to ${targetBed.room.hostel.name}, Room ${targetBed.room.roomNumber} (${targetBed.bedNumber}).`,
        allocation: result.updatedAllocation,
      });
    } catch (err: any) {
      if (err.message && err.message.startsWith("409_CONFLICT")) {
        return NextResponse.json(
          { success: false, error: "Target bed is no longer available. Please select another bed.", code: "BED_OCCUPIED" },
          { status: 409 }
        );
      }
      console.error("[ACCOMMODATION_MOVE_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_MOVE],
    auditAction: "ALLOCATION_MOVED",
    auditResource: "accommodation",
  }
);
