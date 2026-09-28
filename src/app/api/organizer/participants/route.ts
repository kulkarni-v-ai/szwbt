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

    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() || "";
    const categoryFilter = searchParams.get("category")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { playerId: { contains: q, mode: "insensitive" } },
        { institution: { contains: q, mode: "insensitive" } },
        { state: { contains: q, mode: "insensitive" } },
      ];
    }
    if (categoryFilter && categoryFilter !== "ALL") {
      where.category = categoryFilter;
    }
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const participants = await prisma.participant.findMany({
      where,
      include: {
        teamMemberships: {
          include: { team: true },
        },
        bedAllocations: {
          where: { status: "ACTIVE" },
          include: {
            bed: {
              include: {
                room: {
                  include: { hostel: true },
                },
              },
            },
          },
        },
        transportBookings: {
          include: {
            trip: true,
          },
        },
      },
      orderBy: { name: "asc" },
      take: 100, // Safe operational cap
    });

    const formatted = participants.map((p) => {
      const activeBed = p.bedAllocations[0];
      const activeTransport = p.transportBookings[0];
      const team = p.teamMemberships[0]?.team;

      return {
        id: p.id,
        playerId: p.playerId,
        name: p.name,
        institution: p.institution,
        state: p.state,
        category: p.category,
        gender: p.gender,
        registrationStatus: p.status,
        teamName: team ? team.name : "Independent",
        teamCode: team ? team.teamCode : "—",
        accommodation: activeBed
          ? `${activeBed.bed.room.hostel.name} • Room ${activeBed.bed.room.roomNumber} (Bed ${activeBed.bed.bedNumber})`
          : "NOT ALLOCATED",
        transport: activeTransport
          ? `${activeTransport.trip.tripCode} (${activeTransport.boardingStatus})`
          : "NOT ASSIGNED",
        hasBed: !!activeBed,
        hasTransport: !!activeTransport,
      };
    });

    return NextResponse.json({
      success: true,
      total: formatted.length,
      participants: formatted,
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer/participants:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
