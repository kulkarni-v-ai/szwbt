import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/accommodation/allocations
 * Atomic transaction to allocate an eligible person to a specific bed.
 * CRITICAL CONCURRENCY CONTROL:
 * Uses Prisma $transaction to check that the bed status is 'AVAILABLE' atomically.
 * If another operator has already taken the bed, returns 409 CONFLICT:
 * "BED NO LONGER AVAILABLE. Please select another bed."
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { bedId, participantId, teamId } = body;

      if (!bedId || !participantId) {
        return NextResponse.json(
          { success: false, error: "bedId and participantId are required." },
          { status: 400 }
        );
      }

      // 1. Verify Participant exists
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: {
          bedAllocations: {
            where: { status: "ACTIVE" },
            include: {
              bed: {
                include: { room: true },
              },
            },
          },
        },
      });

      if (!participant) {
        return NextResponse.json(
          { success: false, error: "Participant not found." },
          { status: 404 }
        );
      }

      // 2. Prevent duplicate allocation: Check if person already has an active bed
      if (participant.bedAllocations.length > 0) {
        const existing = participant.bedAllocations[0];
        return NextResponse.json(
          {
            success: false,
            error: `Participant is already allocated to Room ${existing.bed.room.roomNumber} (${existing.bed.bedNumber}). Vacate or move them first.`,
            code: "PERSON_ALREADY_ALLOCATED",
          },
          { status: 400 }
        );
      }

      // 3. Inspect Bed & Hostel Eligibility
      const bed = await prisma.bed.findUnique({
        where: { id: bedId },
        include: {
          room: {
            include: {
              hostel: true,
            },
          },
        },
      });

      if (!bed) {
        return NextResponse.json(
          { success: false, error: "Bed not found." },
          { status: 404 }
        );
      }

      if (bed.status !== "AVAILABLE") {
        return NextResponse.json(
          {
            success: false,
            error: `BED NO LONGER AVAILABLE. Bed is currently ${bed.status}. Another operator may have allocated this bed.`,
            code: "BED_OCCUPIED",
          },
          { status: 409 } // 409 CONFLICT
        );
      }

      // 4. Enforce Hostel Eligibility Rules
      const gender = (participant.gender || "FEMALE").toUpperCase();
      const hostelId = bed.room.hostelId;

      if (hostelId === "SHALMALA" && gender === "MALE") {
        return NextResponse.json(
          {
            success: false,
            error: "ELIGIBILITY RESTRICTION: Male team managers and support staff must be accommodated in Vindhya Boys Hostel.",
            code: "HOSTEL_NOT_ELIGIBLE",
          },
          { status: 400 }
        );
      }

      if (hostelId === "VINDHYA" && gender === "FEMALE") {
        return NextResponse.json(
          {
            success: false,
            error: "ELIGIBILITY RESTRICTION: Female participants and managers must be accommodated in Shalmala Hostel.",
            code: "HOSTEL_NOT_ELIGIBLE",
          },
          { status: 400 }
        );
      }

      // 5. ATOMIC TRANSACTION: Lock & Allocate
      const result = await prisma.$transaction(async (tx) => {
        // Atomic read to guarantee concurrency safety
        const atomicBed = await tx.bed.findFirst({
          where: {
            id: bedId,
            status: "AVAILABLE",
          },
        });

        if (!atomicBed) {
          throw new Error("409_CONFLICT: Bed was claimed by another operator during submission.");
        }

        // Occupy Bed
        const updatedBed = await tx.bed.update({
          where: { id: bedId },
          data: { status: "OCCUPIED" },
        });

        // Create Allocation
        const allocation = await tx.accommodationAllocation.create({
          data: {
            bedId,
            participantId,
            teamId: teamId || null,
            allocatedBy: context.user.email,
            status: "ACTIVE",
          },
        });

        // Update Participant record
        await tx.participant.update({
          where: { id: participantId },
          data: {
            hostel: bed.room.hostel.name,
            room: `${bed.room.roomNumber} (${bed.bedNumber})`,
          },
        });

        return { allocation, updatedBed };
      });

      // 6. Record Audit Event
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "ACCOMMODATION_ALLOCATED",
        resourceType: "accommodation",
        resourceId: result.allocation.id,
        metadata: {
          allocationId: result.allocation.id,
          bedId,
          bedNumber: bed.bedNumber,
          roomNumber: bed.room.roomNumber,
          hostelName: bed.room.hostel.name,
          participantId,
          participantName: participant.name,
          teamId,
          operator: context.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `ALLOCATION CONFIRMED: ${participant.name} allocated to ${bed.room.hostel.name}, Room ${bed.room.roomNumber}, ${bed.bedNumber}.`,
        allocation: {
          id: result.allocation.id,
          hostelName: bed.room.hostel.name,
          roomNumber: bed.room.roomNumber,
          bedNumber: bed.bedNumber,
          participantName: participant.name,
          allocatedBy: context.user.email,
          checkInDate: result.allocation.checkInDate.toISOString(),
        },
      });
    } catch (err: any) {
      if (err.message && err.message.startsWith("409_CONFLICT")) {
        return NextResponse.json(
          {
            success: false,
            error: "BED NO LONGER AVAILABLE. Another accommodation operator has allocated this bed. Please select another bed.",
            code: "BED_OCCUPIED",
          },
          { status: 409 }
        );
      }

      console.error("[ACCOMMODATION_ALLOCATION_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_ALLOCATE],
    auditAction: "ACCOMMODATION_ALLOCATED",
    auditResource: "accommodation",
  }
);
