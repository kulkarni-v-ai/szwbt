import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOrganizerClearance } from "@/lib/organizer/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const orgAuth = verifyOrganizerClearance(context);
    if (orgAuth.errorResponse) {
      return orgAuth.errorResponse;
    }

    // 1. Query dynamic hostels with floors, rooms, and beds
    const hostels = await prisma.hostel.findMany({
      include: {
        rooms: {
          include: {
            beds: {
              include: {
                allocations: {
                  where: { status: "ACTIVE" },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const totalParticipants = await prisma.participant.count();
    let totalCapacity = 0;
    let totalOccupied = 0;

    const hostelStats = hostels.map((h) => {
      let hCapacity = 0;
      let hOccupied = 0;

      h.rooms.forEach((r) => {
        hCapacity += r.beds.length;
        r.beds.forEach((b) => {
          if (b.allocations.length > 0) {
            hOccupied++;
          }
        });
      });

      totalCapacity += hCapacity;
      totalOccupied += hOccupied;

      const hAvailable = Math.max(0, hCapacity - hOccupied);
      const occupancyRate = hCapacity > 0 ? Math.round((hOccupied / hCapacity) * 100) : 0;

      return {
        id: h.id,
        name: h.name,
        code: h.code,
        genderAllowed: h.genderAllowed,
        totalRooms: h.rooms.length,
        capacity: hCapacity,
        occupied: hOccupied,
        available: hAvailable,
        occupancyRate,
      };
    });

    const totalAvailable = Math.max(0, totalCapacity - totalOccupied);
    const unallocatedCount = Math.max(0, totalParticipants - totalOccupied);

    // Recent active allocations
    const recentAllocations = await prisma.accommodationAllocation.findMany({
      where: { status: "ACTIVE" },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        participant: { select: { id: true, name: true, institution: true, playerId: true } },
        bed: {
          include: {
            room: {
              include: { hostel: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalCapacity,
        occupiedBeds: totalOccupied,
        availableBeds: totalAvailable,
        totalParticipants,
        unallocatedCount,
        overallOccupancyRate: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
      },
      hostels: hostelStats,
      recentAllocations: recentAllocations.map((a) => ({
        id: a.id,
        participantName: a.participant?.name || "Contingent Member",
        playerId: a.participant?.playerId || "—",
        institution: a.participant?.institution || "—",
        hostelName: a.bed.room.hostel.name,
        roomNumber: a.bed.room.roomNumber,
        bedNumber: a.bed.bedNumber,
        checkInDate: a.checkInDate,
      })),
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer/accommodation:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
