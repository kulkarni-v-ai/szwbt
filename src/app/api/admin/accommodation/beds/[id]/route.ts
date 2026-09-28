import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * PATCH /api/admin/accommodation/beds/[id]
 * Updates bed details or status.
 * Prevents manually overriding an OCCUPIED bed if active allocation exists.
 */
export const PATCH = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { bedNumber, displayName, status } = body;

      const existing = await prisma.bed.findUnique({
        where: { id },
        include: {
          allocations: {
            where: { status: "ACTIVE" },
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Bed not found." },
          { status: 404 }
        );
      }

      // Authoritative check: Prevent manually setting an occupied bed to AVAILABLE without vacating
      if (status === "AVAILABLE" && existing.allocations.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot manually set bed to AVAILABLE while an active allocation exists. Please use the Vacate operation to safely release the bed.",
          },
          { status: 400 }
        );
      }

      // Check unique bedNumber if renaming
      if (bedNumber && bedNumber.trim() !== existing.bedNumber) {
        const duplicate = await prisma.bed.findUnique({
          where: {
            roomId_bedNumber: {
              roomId: existing.roomId,
              bedNumber: bedNumber.trim(),
            },
          },
        });
        if (duplicate) {
          return NextResponse.json(
            { success: false, error: `Bed '${bedNumber.trim()}' already exists in this room.` },
            { status: 409 }
          );
        }
      }

      const updated = await prisma.bed.update({
        where: { id },
        data: {
          bedNumber: bedNumber !== undefined ? bedNumber.trim() : undefined,
          displayName: displayName !== undefined ? displayName.trim() : undefined,
          status: status !== undefined ? status : undefined,
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "BED_STATUS_CHANGED",
        resourceType: "accommodation",
        resourceId: id,
        metadata: {
          previousStatus: existing.status,
          newStatus: updated.status,
          bedNumber: updated.bedNumber,
        },
      });

      return NextResponse.json({
        success: true,
        bed: updated,
        message: "Bed updated successfully.",
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to update bed." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);
