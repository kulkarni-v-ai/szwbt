import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

interface BulkAllocationItem {
  bedId: string;
  participantId: string;
  teamId?: string;
}

/**
 * POST /api/accommodation/bulk-allocate
 * Atomically allocates multiple beds to participants in a single DB transaction.
 * If ANY bed becomes unavailable or any participant already has an allocation,
 * the ENTIRE operation is rolled back.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { allocations }: { allocations: BulkAllocationItem[] } = body;

      if (!Array.isArray(allocations) || allocations.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one allocation is required." },
          { status: 400 }
        );
      }

      // Validate all items have required fields
      for (let i = 0; i < allocations.length; i++) {
        const item = allocations[i];
        if (!item.bedId || !item.participantId) {
          return NextResponse.json(
            { success: false, error: `Allocation ${i + 1}: bedId and participantId are required.` },
            { status: 400 }
          );
        }
      }

      // Check for duplicate bed or participant references within the request
      const bedIds = allocations.map((a) => a.bedId);
      const participantIds = allocations.map((a) => a.participantId);
      if (new Set(bedIds).size !== bedIds.length) {
        return NextResponse.json(
          { success: false, error: "Duplicate bed selections in request." },
          { status: 400 }
        );
      }
      if (new Set(participantIds).size !== participantIds.length) {
        return NextResponse.json(
          { success: false, error: "Duplicate participant assignments in request." },
          { status: 400 }
        );
      }

      // Execute atomic bulk allocation
      const results = await prisma.$transaction(async (tx) => {
        const created: any[] = [];

        for (const item of allocations) {
          // 1. Re-check bed availability
          const bed = await tx.bed.findUnique({
            where: { id: item.bedId },
            include: {
              room: { include: { hostel: true } },
              allocations: { where: { status: "ACTIVE" } },
            },
          });

          if (!bed) {
            throw new Error(`Bed not found: ${item.bedId}`);
          }

          if (bed.status !== "AVAILABLE") {
            throw new Error(
              `Allocation could not be completed because ${bed.bedNumber} in ${bed.room.roomNumber} is no longer available.`
            );
          }

          if (bed.allocations.length > 0) {
            throw new Error(
              `${bed.bedNumber} in ${bed.room.roomNumber} already has an active allocation.`
            );
          }

          // 2. Check participant doesn't already have active allocation
          const existingAllocation = await tx.accommodationAllocation.findFirst({
            where: { participantId: item.participantId, status: "ACTIVE" },
            include: { bed: { include: { room: true } } },
          });

          if (existingAllocation) {
            const participant = await tx.participant.findUnique({ where: { id: item.participantId } });
            throw new Error(
              `${participant?.name || "Participant"} already has an active allocation at ${existingAllocation.bed.room.roomNumber} ${existingAllocation.bed.bedNumber}. Cannot create duplicate.`
            );
          }

          // 3. Check participant exists
          const participant = await tx.participant.findUnique({ where: { id: item.participantId } });
          if (!participant) {
            throw new Error(`Participant not found: ${item.participantId}`);
          }

          // 4. Create allocation
          const allocation = await tx.accommodationAllocation.create({
            data: {
              bedId: item.bedId,
              participantId: item.participantId,
              teamId: item.teamId || null,
              allocatedBy: context.user.email,
              status: "ACTIVE",
            },
          });

          // 5. Update bed status
          await tx.bed.update({
            where: { id: item.bedId },
            data: { status: "OCCUPIED" },
          });

          // 6. Update participant
          await tx.participant.update({
            where: { id: item.participantId },
            data: {
              hostel: bed.room.hostel.name,
              room: `${bed.room.roomNumber} (${bed.bedNumber})`,
            },
          });

          created.push({
            allocationId: allocation.id,
            bedNumber: bed.bedNumber,
            roomNumber: bed.room.roomNumber,
            hostelName: bed.room.hostel.name,
            participantId: item.participantId,
            participantName: participant.name,
          });
        }

        return created;
      });

      // Audit log
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "BULK_ALLOCATION_CONFIRMED",
        resourceType: "accommodation",
        metadata: {
          count: results.length,
          allocations: results.map((r) => ({
            bed: r.bedNumber,
            room: r.roomNumber,
            participant: r.participantName,
          })),
          operator: context.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `${results.length} bed(s) allocated successfully.`,
        allocations: results,
      });
    } catch (err: any) {
      console.error("[BULK_ALLOCATE_ERROR]", err);

      // Log failed attempt
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "BULK_ALLOCATION_FAILED",
        resourceType: "accommodation",
        metadata: { error: err.message, operator: context.user.email },
      }).catch(() => {});

      return NextResponse.json({ success: false, error: err.message }, { status: 409 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_ALLOCATE],
  }
);
