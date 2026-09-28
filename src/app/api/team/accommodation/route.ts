import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthorizedTeam } from "@/lib/team/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const teamAuth = await resolveAuthorizedTeam(req, context);
    if (teamAuth.errorResponse) {
      return teamAuth.errorResponse;
    }

    const { selectedTeamId } = teamAuth;
    if (!selectedTeamId) {
      return NextResponse.json({
        success: true,
        hostels: [],
        memberAllocations: [],
        message: "No team assigned.",
      });
    }

    // Load team members and their active bed allocations
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: selectedTeamId },
      include: {
        participant: {
          include: {
            bedAllocations: {
              where: { status: "ACTIVE" },
              include: {
                bed: {
                  include: {
                    room: {
                      include: {
                        hostel: true,
                        floor: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Also find any direct team bed allocations
    const teamDirectAllocations = await prisma.accommodationAllocation.findMany({
      where: {
        teamId: selectedTeamId,
        status: "ACTIVE",
      },
      include: {
        bed: {
          include: {
            room: {
              include: {
                hostel: true,
                floor: true,
              },
            },
          },
        },
        participant: true,
      },
    });

    const memberAllocations = teamMembers.map((tm) => {
      const p = tm.participant;
      // Check participant bed allocation or direct allocation
      const direct = teamDirectAllocations.find((a) => a.participantId === p.id);
      const alloc = p.bedAllocations[0] || direct;

      if (alloc && alloc.bed && alloc.bed.room && alloc.bed.room.hostel) {
        const room = alloc.bed.room;
        const hostel = room.hostel;
        const floor = room.floor;

        return {
          participantId: p.id,
          name: p.name,
          role: tm.role,
          gender: p.gender,
          isAllocated: true,
          allocationId: alloc.id,
          hostelName: hostel.name,
          hostelId: hostel.id,
          floorName: floor?.name || room.floorNumber || "Ground Floor",
          roomNumber: room.roomNumber,
          roomDisplayName: room.displayName || `Room ${room.roomNumber}`,
          roomCapacity: room.capacity, // read dynamically from configured room capacity
          bedNumber: alloc.bed.bedNumber,
          bedDisplayName: alloc.bed.displayName || alloc.bed.bedNumber,
          status: alloc.status,
          checkInDate: alloc.checkInDate,
        };
      }

      return {
        participantId: p.id,
        name: p.name,
        role: tm.role,
        gender: p.gender,
        isAllocated: false,
        allocationId: null,
        hostelName: p.hostel || "NOT ALLOCATED",
        hostelId: null,
        floorName: "—",
        roomNumber: p.room || "—",
        roomDisplayName: "—",
        roomCapacity: null,
        bedNumber: "—",
        bedDisplayName: "—",
        status: "NOT ALLOCATED",
        checkInDate: null,
      };
    });

    const allocatedCount = memberAllocations.filter((m) => m.isAllocated).length;
    const totalCount = memberAllocations.length;

    // Unique hostels assigned to this team
    const assignedHostelNames = Array.from(
      new Set(memberAllocations.filter((m) => m.isAllocated).map((m) => m.hostelName))
    );

    return NextResponse.json({
      success: true,
      teamId: selectedTeamId,
      summary: {
        totalMembers: totalCount,
        allocatedCount,
        pendingCount: totalCount - allocatedCount,
        assignedHostels: assignedHostelNames,
        status:
          allocatedCount === totalCount && totalCount > 0
            ? "COMPLETED"
            : allocatedCount > 0
            ? "PARTIALLY_ALLOCATED"
            : "PENDING_ALLOCATION",
      },
      memberAllocations,
      policyNotice: "Hostel rooms and bed slots are configured by University Administration and allocated by the Accommodation Desk.",
    });
  } catch (err: any) {
    console.error("Error in GET /api/team/accommodation:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
