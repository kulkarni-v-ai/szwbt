import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/admin/accommodation/rooms/[id]/beds
 * Returns all beds in a room.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const beds = await prisma.bed.findMany({
        where: { roomId: id },
        orderBy: { bedNumber: "asc" },
        include: {
          allocations: {
            where: { status: "ACTIVE" },
            include: {
              participant: true,
              team: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        beds,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to load beds." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);

/**
 * POST /api/admin/accommodation/rooms/[id]/beds
 * Adds a new Bed to a room and increases room capacity count.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { bedNumber, displayName, status = "AVAILABLE" } = body;

      if (!bedNumber || !bedNumber.trim()) {
        return NextResponse.json(
          { success: false, error: "Bed Number is required." },
          { status: 400 }
        );
      }

      const cleanBedNumber = bedNumber.trim();

      // Check room exists
      const room = await prisma.room.findUnique({
        where: { id },
      });

      if (!room) {
        return NextResponse.json(
          { success: false, error: "Room not found." },
          { status: 404 }
        );
      }

      // Check duplicate bedNumber in this room
      const existing = await prisma.bed.findUnique({
        where: {
          roomId_bedNumber: {
            roomId: id,
            bedNumber: cleanBedNumber,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Bed '${cleanBedNumber}' already exists in this room.` },
          { status: 409 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const newBed = await tx.bed.create({
          data: {
            roomId: id,
            bedNumber: cleanBedNumber,
            displayName: displayName?.trim() || cleanBedNumber,
            status,
          },
        });

        const totalBedsInRoom = await tx.bed.count({
          where: { roomId: id },
        });

        // Update room capacity to match actual bed count
        await tx.room.update({
          where: { id },
          data: { capacity: totalBedsInRoom },
        });

        return newBed;
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "BED_CREATED",
        resourceType: "accommodation",
        resourceId: result.id,
        metadata: {
          roomId: id,
          roomNumber: room.roomNumber,
          bedNumber: cleanBedNumber,
          status: result.status,
        },
      });

      return NextResponse.json({
        success: true,
        bed: result,
        message: "Bed added successfully.",
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to add bed." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);
