import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * POST /api/admin/accommodation/rooms
 * Creates a new Room with configured capacity and automatically generates Bed records.
 * Super Admin clearance only.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { hostelId, floorId, roomNumber, displayName, capacity = 5, status = "ACTIVE" } = body;

      if (!hostelId || !roomNumber || !roomNumber.trim()) {
        return NextResponse.json(
          { success: false, error: "Hostel ID and Room Number/Name are required." },
          { status: 400 }
        );
      }

      const cleanRoomNumber = roomNumber.trim();
      const parsedCapacity = Math.max(1, Number(capacity) || 5);

      // Verify hostel exists
      const hostel = await prisma.hostel.findUnique({
        where: { id: hostelId },
      });

      if (!hostel) {
        return NextResponse.json(
          { success: false, error: "Hostel not found." },
          { status: 404 }
        );
      }

      // Verify floor if provided
      let floorName = "Ground Floor";
      if (floorId) {
        const floor = await prisma.floor.findUnique({
          where: { id: floorId },
        });
        if (floor) {
          floorName = floor.name;
        }
      }

      // Check unique roomNumber within this hostel
      const existing = await prisma.room.findUnique({
        where: {
          hostelId_roomNumber: {
            hostelId,
            roomNumber: cleanRoomNumber,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: `Room '${cleanRoomNumber}' already exists in ${hostel.name}.` },
          { status: 409 }
        );
      }

      // Atomic room and initial beds creation
      const result = await prisma.$transaction(async (tx) => {
        const newRoom = await tx.room.create({
          data: {
            hostelId,
            floorId: floorId || null,
            floorNumber: floorName,
            roomNumber: cleanRoomNumber,
            displayName: displayName?.trim() || cleanRoomNumber,
            capacity: parsedCapacity,
            status,
          },
        });

        // Create individual Bed records
        const bedData = Array.from({ length: parsedCapacity }).map((_, idx) => {
          const numStr = String(idx + 1).padStart(2, "0");
          return {
            roomId: newRoom.id,
            bedNumber: `BED ${numStr}`,
            displayName: `Bed ${idx + 1}`,
            status: "AVAILABLE",
          };
        });

        await tx.bed.createMany({
          data: bedData,
        });

        const createdBeds = await tx.bed.findMany({
          where: { roomId: newRoom.id },
          orderBy: { bedNumber: "asc" },
        });

        return {
          room: newRoom,
          beds: createdBeds,
        };
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "ROOM_CREATED",
        resourceType: "accommodation",
        resourceId: result.room.id,
        metadata: {
          hostelId,
          hostelName: hostel.name,
          roomNumber: cleanRoomNumber,
          capacity: parsedCapacity,
          bedsCreated: result.beds.length,
        },
      });

      return NextResponse.json({
        success: true,
        room: result.room,
        beds: result.beds,
        message: `Room ${cleanRoomNumber} with ${result.beds.length} beds created successfully.`,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to create room." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);
