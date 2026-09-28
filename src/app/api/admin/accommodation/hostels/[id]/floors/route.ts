import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/admin/accommodation/hostels/[id]/floors
 * Returns all floors in a hostel with rooms count and beds count.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const floors = await prisma.floor.findMany({
        where: { hostelId: id },
        orderBy: { floorNumber: "asc" },
        include: {
          rooms: {
            include: {
              beds: true,
            },
          },
        },
      });

      const formatted = floors.map((f) => {
        let totalBeds = 0;
        let occupiedBeds = 0;
        let availableBeds = 0;

        f.rooms.forEach((r) => {
          totalBeds += r.beds.length;
          r.beds.forEach((b) => {
            if (b.status === "OCCUPIED") occupiedBeds++;
            else if (b.status === "AVAILABLE") availableBeds++;
          });
        });

        return {
          id: f.id,
          hostelId: f.hostelId,
          name: f.name,
          floorNumber: f.floorNumber,
          status: f.status,
          roomsCount: f.rooms.length,
          totalBeds,
          occupiedBeds,
          availableBeds,
        };
      });

      return NextResponse.json({
        success: true,
        floors: formatted,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message || "Failed to load floors." },
        { status: 500 }
      );
    }
  },
  { permissions: [PERMISSIONS.SYSTEM_CONFIGURE] }
);
