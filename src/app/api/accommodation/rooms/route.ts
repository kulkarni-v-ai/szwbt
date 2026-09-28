import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/accommodation/rooms
 * Returns rooms and their EXACT 5 BEDS with live occupancy and active allocation details.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const hostelId = searchParams.get("hostelId") || "SHALMALA";
      const floor = searchParams.get("floor");
      const statusFilter = searchParams.get("status");

      const whereClause: any = {
        hostelId,
      };

      if (floor && floor !== "ALL") {
        whereClause.floorNumber = floor;
      }

      const rooms = await prisma.room.findMany({
        where: whereClause,
        include: {
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
        orderBy: [{ floorNumber: "asc" }, { roomNumber: "asc" }],
      });

      const formattedRooms = rooms.map((room) => {
        const beds = room.beds.map((bed) => {
          const activeAlloc = bed.allocations[0];
          return {
            id: bed.id,
            bedNumber: bed.bedNumber,
            status: bed.status, // "AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"
            occupant: activeAlloc?.participant
              ? {
                  allocationId: activeAlloc.id,
                  id: activeAlloc.participant.id,
                  name: activeAlloc.participant.name,
                  playerId: activeAlloc.participant.playerId,
                  gender: activeAlloc.participant.gender || "FEMALE",
                  institution: activeAlloc.participant.institution,
                  state: activeAlloc.participant.state,
                  role: activeAlloc.participant.category || "PLAYER",
                  teamName: activeAlloc.team?.name || activeAlloc.participant.institution,
                  allocatedBy: activeAlloc.allocatedBy,
                  checkInDate: activeAlloc.checkInDate.toISOString(),
                }
              : null,
          };
        });

        const occupiedCount = beds.filter((b) => b.status === "OCCUPIED").length;
        const availableCount = beds.filter((b) => b.status === "AVAILABLE").length;
        const reservedCount = beds.filter((b) => b.status === "RESERVED").length;
        const maintenanceCount = beds.filter((b) => b.status === "MAINTENANCE").length;

        return {
          id: room.id,
          hostelId: room.hostelId,
          roomNumber: room.roomNumber,
          floorNumber: room.floorNumber,
          capacity: room.capacity, // STRICT 5 BEDS
          occupiedCount,
          availableCount,
          reservedCount,
          maintenanceCount,
          isFull: occupiedCount >= room.capacity,
          beds,
        };
      });

      // Filter by bed status if specified
      let result = formattedRooms;
      if (statusFilter && statusFilter !== "ALL") {
        result = formattedRooms.filter((r) => r.beds.some((b) => b.status === statusFilter));
      }

      return NextResponse.json({
        success: true,
        hostelId,
        count: result.length,
        rooms: result,
      });
    } catch (err: any) {
      console.error("[ACCOMMODATION_ROOMS_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_READ],
  }
);
