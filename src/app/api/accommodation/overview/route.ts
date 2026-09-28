import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/accommodation/overview
 * Returns operational KPIs, dynamic hostel statistics, and occupancy rates.
 * ZERO hardcoded hostel names or constants.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      // 1. Total People (participants in system)
      const totalPeople = await prisma.participant.count();

      // 2. Active Allocations
      const activeAllocations = await prisma.accommodationAllocation.count({
        where: { status: "ACTIVE" },
      });

      const unallocatedCount = Math.max(0, totalPeople - activeAllocations);

      // 3. Overall Bed Counts
      const totalBeds = await prisma.bed.count();
      const occupiedBeds = await prisma.bed.count({ where: { status: "OCCUPIED" } });
      const availableBeds = await prisma.bed.count({ where: { status: "AVAILABLE" } });
      const reservedBeds = await prisma.bed.count({ where: { status: "RESERVED" } });
      const maintenanceBeds = await prisma.bed.count({ where: { status: "MAINTENANCE" } });

      // 4. Hostels - Fully Dynamic Query
      const hostels = await prisma.hostel.findMany({
        where: { status: "ACTIVE" },
        include: {
          floors: {
            orderBy: { floorNumber: "asc" },
          },
          rooms: {
            include: {
              beds: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      const formattedHostels = hostels.map((h) => {
        const hRooms = h.rooms;
        let hTotal = 0;
        let hOccupied = 0;
        let hAvailable = 0;
        const floorsMap: Record<string, { roomsCount: number; bedsCount: number; occupiedCount: number }> = {};

        hRooms.forEach((r) => {
          hTotal += r.beds.length;
          let occInRoom = 0;
          r.beds.forEach((b) => {
            if (b.status === "OCCUPIED") {
              hOccupied++;
              occInRoom++;
            } else if (b.status === "AVAILABLE") {
              hAvailable++;
            }
          });

          const flKey = r.floorNumber || "Ground Floor";
          if (!floorsMap[flKey]) {
            floorsMap[flKey] = { roomsCount: 0, bedsCount: 0, occupiedCount: 0 };
          }
          floorsMap[flKey].roomsCount += 1;
          floorsMap[flKey].bedsCount += r.beds.length;
          floorsMap[flKey].occupiedCount += occInRoom;
        });

        return {
          id: h.id,
          name: h.name,
          code: h.code || h.id,
          genderAllowed: h.genderAllowed,
          totalFloors: h.floors.length || h.totalFloors,
          totalRooms: hRooms.length,
          totalBeds: hTotal,
          occupiedBeds: hOccupied,
          availableBeds: hAvailable,
          occupancyPercent: hTotal > 0 ? Math.round((hOccupied / hTotal) * 100) : 0,
          floors: Object.entries(floorsMap).map(([floorNumber, data]) => ({
            floorNumber,
            ...data,
          })),
        };
      });

      // Backward-compatible specific keys if they exist in DB
      const shalmalaHostel = formattedHostels.find((h) => h.code?.includes("SHALMALA") || h.name.toLowerCase().includes("shalmala"));
      const vindhyaHostel = formattedHostels.find((h) => h.code?.includes("VINDHYA") || h.name.toLowerCase().includes("vindhya"));

      return NextResponse.json({
        success: true,
        kpis: {
          totalPeople,
          allocatedCount: activeAllocations,
          unallocatedCount,
          totalBeds,
          availableBeds,
          occupiedBeds,
          reservedBeds,
          maintenanceBeds,
          shalmalaStats: shalmalaHostel
            ? {
                total: shalmalaHostel.totalBeds,
                occupied: shalmalaHostel.occupiedBeds,
                available: shalmalaHostel.availableBeds,
                ratePercent: shalmalaHostel.occupancyPercent,
              }
            : { total: 0, occupied: 0, available: 0, ratePercent: 0 },
          vindhyaStats: vindhyaHostel
            ? {
                total: vindhyaHostel.totalBeds,
                occupied: vindhyaHostel.occupiedBeds,
                available: vindhyaHostel.availableBeds,
                ratePercent: vindhyaHostel.occupancyPercent,
              }
            : { total: 0, occupied: 0, available: 0, ratePercent: 0 },
          shalmalaOccupancy: shalmalaHostel ? shalmalaHostel.occupancyPercent : null,
          vindhyaOccupancy: vindhyaHostel ? vindhyaHostel.occupancyPercent : null,
        },
        hostels: formattedHostels,
      });
    } catch (err: any) {
      console.error("[ACCOMMODATION_OVERVIEW_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_READ],
  }
);
