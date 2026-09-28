import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/admin/accommodation/floors/[id]/rooms
 * Returns all rooms on a floor with beds and occupancy.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const rooms = await prisma.room.findMany({
        where: { floorId: id },
        orderBy: { roomNumber: "asc" },
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
      });

      const formatted = rooms.map((r) => {
        const occupied = r.beds.filter((b) => b.status === "OCCUPIED").length;
        const available = r.beds.filter((b) => b.status === "AVAILABLE").length;
        return {
          id: r.id,
          roomNumber: r.roomNumber,
          displayName: r.displayName,
          capacity: r.capacity,
          status: r.status,
          totalBeds: r.beds.length,
          occupiedCount: occupied,
          availableCount: available,
          beds: r.beds,
        };
      });

      return NextResponse.json({
        success: true,
        rooms: formatted,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to load rooms." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);
