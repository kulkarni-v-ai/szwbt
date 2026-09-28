import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/admin/accommodation/rooms/[id]
 * Returns single room with configured beds and occupant dossier.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const room = await prisma.room.findUnique({
        where: { id },
        include: {
          hostel: true,
          floor: true,
          beds: {
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
          },
        },
      });

      if (!room) {
        return NextResponse.json(
          { success: false, error: "Room not found." },
          { status: 404 }
        );
      }

      const activeOccupants = room.beds
        .filter((b) => b.status === "OCCUPIED" && b.allocations.length > 0)
        .map((b) => ({
          bedId: b.id,
          bedNumber: b.bedNumber,
          occupantName: b.allocations[0].participant?.name || "Unknown",
          role: b.allocations[0].participant?.category || "ATHLETE",
          teamName: b.allocations[0].team?.name || "Independent",
        }));

      return NextResponse.json({
        success: true,
        room,
        activeOccupantsCount: activeOccupants.length,
        activeOccupants,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to load room." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);

/**
 * PATCH /api/admin/accommodation/rooms/[id]
 * Updates room configuration (number, displayName, status, capacity).
 * Enforces occupant safety rules.
 */
export const PATCH = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { roomNumber, displayName, capacity, status, forceOverrideOccupants } = body;

      const existing = await prisma.room.findUnique({
        where: { id },
        include: {
          beds: {
            include: {
              allocations: {
                where: { status: "ACTIVE" },
              },
            },
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Room not found." },
          { status: 404 }
        );
      }

      const activeOccupantsCount = existing.beds.reduce(
        (acc, b) => acc + (b.status === "OCCUPIED" ? 1 : 0),
        0
      );

      // Safety check: Deactivating room with active occupants
      if (status === "INACTIVE" && activeOccupantsCount > 0 && !forceOverrideOccupants) {
        return NextResponse.json(
          {
            success: false,
            error: `THIS ROOM CURRENTLY HAS ACTIVE OCCUPANTS (${activeOccupantsCount} occupants). Please vacate or move occupants before deactivating.`,
            requiresConfirmation: true,
            activeOccupantsCount,
          },
          { status: 400 }
        );
      }

      // Check unique roomNumber if renaming
      if (roomNumber && roomNumber.trim() !== existing.roomNumber) {
        const duplicate = await prisma.room.findUnique({
          where: {
            hostelId_roomNumber: {
              hostelId: existing.hostelId,
              roomNumber: roomNumber.trim(),
            },
          },
        });
        if (duplicate) {
          return NextResponse.json(
            { success: false, error: `Room '${roomNumber.trim()}' already exists in this hostel.` },
            { status: 409 }
          );
        }
      }

      // Update room and adjust beds if capacity increased
      const updated = await prisma.$transaction(async (tx) => {
        const newCap = capacity ? Number(capacity) : existing.capacity;

        const updatedRoom = await tx.room.update({
          where: { id },
          data: {
            roomNumber: roomNumber !== undefined ? roomNumber.trim() : undefined,
            displayName: displayName !== undefined ? displayName.trim() : undefined,
            status: status !== undefined ? status : undefined,
            capacity: newCap,
          },
        });

        // If capacity increased beyond current beds count, create new beds
        const currentBedsCount = existing.beds.length;
        if (newCap > currentBedsCount) {
          const additionalBeds = [];
          for (let i = currentBedsCount + 1; i <= newCap; i++) {
            const numStr = String(i).padStart(2, "0");
            additionalBeds.push({
              roomId: id,
              bedNumber: `BED ${numStr}`,
              displayName: `Bed ${i}`,
              status: "AVAILABLE",
            });
          }
          await tx.bed.createMany({
            data: additionalBeds,
          });
        }

        return updatedRoom;
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: status === "INACTIVE" ? "ROOM_DEACTIVATED" : "ROOM_UPDATED",
        resourceType: "accommodation",
        resourceId: id,
        metadata: {
          previous: { roomNumber: existing.roomNumber, capacity: existing.capacity, status: existing.status },
          updated: { roomNumber: updated.roomNumber, capacity: updated.capacity, status: updated.status },
        },
      });

      return NextResponse.json({
        success: true,
        room: updated,
        message: "Room configuration updated successfully.",
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to update room." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);
