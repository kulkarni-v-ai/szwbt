import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * PATCH /api/admin/accommodation/floors/[id]
 * Updates floor details or status.
 */
export const PATCH = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { name, floorNumber, status } = body;

      const existing = await prisma.floor.findUnique({
        where: { id },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Floor not found." },
          { status: 404 }
        );
      }

      const updated = await prisma.floor.update({
        where: { id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          floorNumber: floorNumber !== undefined ? Number(floorNumber) : undefined,
          status: status !== undefined ? status : undefined,
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: status === "INACTIVE" ? "FLOOR_DEACTIVATED" : "FLOOR_UPDATED",
        resourceType: "accommodation",
        resourceId: id,
        metadata: {
          previous: { name: existing.name, status: existing.status },
          updated: { name: updated.name, status: updated.status },
        },
      });

      return NextResponse.json({
        success: true,
        floor: updated,
        message: "Floor updated successfully.",
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to update floor." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);
