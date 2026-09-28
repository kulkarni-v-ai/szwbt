import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/accommodation/food-packages/assign
 * Assigns a bundled daily food package to a participant.
 * Enforces:
 * - Day package bundling (no individual meal selection)
 * - Duplicate assignment prevention
 * - Concurrency protection
 * - Audit trail
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { packageId, participantId, teamId, notes } = body;

      if (!packageId || !participantId) {
        return NextResponse.json(
          { success: false, error: "Package ID and Participant ID are required." },
          { status: 400 }
        );
      }

      // 1. Verify participant exists
      const participant = await prisma.participant.findUnique({
        where: { id: participantId },
        include: {
          bedAllocations: { where: { status: "ACTIVE" } },
        },
      });

      if (!participant) {
        return NextResponse.json(
          { success: false, error: "Participant not found." },
          { status: 404 }
        );
      }

      // 2. Verify food package exists
      const foodPackage = await prisma.foodPackage.findUnique({
        where: { id: packageId },
      });

      if (!foodPackage) {
        return NextResponse.json(
          { success: false, error: "Food package not found." },
          { status: 404 }
        );
      }

      // 3. Concurrency & Duplicate Check
      // Use upsert or transaction to prevent race conditions
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.foodPackageAssignment.findUnique({
          where: {
            packageId_participantId: {
              packageId,
              participantId,
            },
          },
        });

        if (existing && existing.status === "ASSIGNED") {
          return { alreadyAssigned: true, assignment: existing };
        }

        const assignment = await tx.foodPackageAssignment.upsert({
          where: {
            packageId_participantId: {
              packageId,
              participantId,
            },
          },
          update: {
            status: "ASSIGNED",
            assignedBy: context.user.email,
            assignedAt: new Date(),
            notes: notes || null,
          },
          create: {
            packageId,
            participantId,
            teamId: teamId || null,
            assignedBy: context.user.email,
            status: "ASSIGNED",
            notes: notes || null,
          },
        });

        return { alreadyAssigned: false, assignment };
      });

      // 4. Audit Log
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "FOOD_PACKAGE_ASSIGNED",
        resourceType: "accommodation",
        resourceId: result.assignment.id,
        metadata: {
          participantId: participant.id,
          playerId: participant.playerId,
          athleteName: participant.name,
          packageId: foodPackage.id,
          date: foodPackage.date,
          dayNumber: foodPackage.dayNumber,
          packageName: foodPackage.name,
          components: foodPackage.components,
          assignedBy: context.user.email,
        },
      });

      if (result.alreadyAssigned) {
        return NextResponse.json(
          {
            success: false,
            error: `Food package '${foodPackage.name}' (${foodPackage.date}) is already assigned to ${participant.name}.`,
            code: "FOOD_PACKAGE_ALREADY_ASSIGNED",
            assignment: {
              id: result.assignment.id,
              packageId: foodPackage.id,
              date: foodPackage.date,
              dayNumber: foodPackage.dayNumber,
              packageName: foodPackage.name,
              status: result.assignment.status,
              assignedAt: result.assignment.assignedAt,
            },
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Assigned ${foodPackage.name} (${foodPackage.date}) to ${participant.name}.`,
        assignment: {
          id: result.assignment.id,
          packageId: foodPackage.id,
          date: foodPackage.date,
          dayNumber: foodPackage.dayNumber,
          packageName: foodPackage.name,
          status: result.assignment.status,
          assignedAt: result.assignment.assignedAt,
        },
      });
    } catch (err: any) {
      console.error("[FOOD_PACKAGE_ASSIGN_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_ALLOCATE],
  }
);
