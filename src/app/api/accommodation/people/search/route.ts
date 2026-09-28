import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/accommodation/people/search
 * Server-side debounced search for people by name, playerId, email, phone, institution, or team.
 * Returns participant accreditation, active room/bed allocation, and eligible hostel.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const query = (searchParams.get("q") || "").trim();

      if (!query || query.length < 2) {
        return NextResponse.json({ success: true, count: 0, people: [] });
      }

      const participants = await prisma.participant.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { playerId: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
            { institution: { contains: query, mode: "insensitive" } },
            { teamMemberships: { some: { team: { name: { contains: query, mode: "insensitive" } } } } },
          ],
        },
        include: {
          teamMemberships: {
            include: {
              team: true,
            },
          },
          bedAllocations: {
            where: { status: "ACTIVE" },
            include: {
              bed: {
                include: {
                  room: {
                    include: {
                      hostel: true,
                    },
                  },
                },
              },
            },
          },
        },
        take: 25,
        orderBy: { name: "asc" },
      });

      const people = participants.map((p) => {
        const activeAlloc = p.bedAllocations[0];
        const team = p.teamMemberships[0]?.team;
        const role = p.teamMemberships[0]?.role || p.category || "PLAYER";
        const gender = p.gender || (role === "MANAGER" ? "MALE" : "FEMALE");
        const isFemale = gender.toUpperCase() === "FEMALE";

        return {
          id: p.id,
          name: p.name,
          playerId: p.playerId,
          email: p.email,
          phone: p.phone,
          institution: p.institution,
          state: p.state,
          role,
          gender,
          teamName: team?.name || "Independent",
          teamCode: team?.teamCode || null,
          eligibleHostelId: isFemale ? "SHALMALA" : "VINDHYA",
          eligibleHostelName: isFemale ? "Shalmala Hostel" : "Vindhya Boys Hostel",
          isAllocated: !!activeAlloc,
          allocation: activeAlloc
            ? {
                id: activeAlloc.id,
                hostelId: activeAlloc.bed.room.hostelId,
                hostelName: activeAlloc.bed.room.hostel.name,
                floorNumber: activeAlloc.bed.room.floorNumber,
                roomNumber: activeAlloc.bed.room.roomNumber,
                bedNumber: activeAlloc.bed.bedNumber,
                allocatedBy: activeAlloc.allocatedBy,
                checkInDate: activeAlloc.checkInDate.toISOString(),
              }
            : null,
        };
      });

      return NextResponse.json({
        success: true,
        count: people.length,
        people,
      });
    } catch (err: any) {
      console.error("[ACCOMMODATION_PERSON_SEARCH_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_READ],
  }
);
