import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/accommodation/unallocated
 * Returns eligible participants who have no active bed allocation.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const hostelFilter = searchParams.get("hostel"); // "SHALMALA", "VINDHYA"
      const roleFilter = searchParams.get("role");
      const query = (searchParams.get("q") || "").trim();

      // Find participants who DO NOT have an ACTIVE allocation
      const whereClause: any = {
        bedAllocations: {
          none: {
            status: "ACTIVE",
          },
        },
      };

      if (query) {
        whereClause.OR = [
          { name: { contains: query, mode: "insensitive" } },
          { playerId: { contains: query, mode: "insensitive" } },
          { institution: { contains: query, mode: "insensitive" } },
          { teamMemberships: { some: { team: { name: { contains: query, mode: "insensitive" } } } } },
        ];
      }

      if (hostelFilter === "SHALMALA") {
        whereClause.gender = "FEMALE";
      } else if (hostelFilter === "VINDHYA") {
        whereClause.gender = "MALE";
      }

      const unallocatedParticipants = await prisma.participant.findMany({
        where: whereClause,
        include: {
          teamMemberships: {
            include: {
              team: true,
            },
          },
        },
        orderBy: { name: "asc" },
        take: 100,
      });

      const formatted = unallocatedParticipants.map((p) => {
        const team = p.teamMemberships[0]?.team;
        const role = p.teamMemberships[0]?.role || p.category || "PLAYER";
        const gender = p.gender || "FEMALE";
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
          teamId: team?.id || null,
          teamName: team?.name || "Independent",
          teamCode: team?.teamCode || null,
          eligibleHostelId: isFemale ? "SHALMALA" : "VINDHYA",
          eligibleHostelName: isFemale ? "Shalmala Hostel" : "Vindhya Boys Hostel",
        };
      });

      let results = formatted;
      if (roleFilter && roleFilter !== "ALL") {
        results = results.filter((p) => p.role.toUpperCase() === roleFilter.toUpperCase());
      }

      return NextResponse.json({
        success: true,
        count: results.length,
        unallocated: results,
      });
    } catch (err: any) {
      console.error("[ACCOMMODATION_UNALLOCATED_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.ACCOMMODATION_READ],
  }
);
