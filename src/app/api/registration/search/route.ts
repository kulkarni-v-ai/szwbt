import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/registration/search
 * Comprehensive search across participants, teams, and institutions.
 * Enables quick lookup by name, email, mobile, ID, team, or institution.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const query = (searchParams.get("q") || "").trim();

      if (!query) {
        return NextResponse.json({
          success: true,
          participants: [],
          teams: [],
        });
      }

      const [participants, teams] = await Promise.all([
        prisma.participant.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
              { playerId: { contains: query, mode: "insensitive" } },
              { institution: { contains: query, mode: "insensitive" } },
              { state: { contains: query, mode: "insensitive" } },
              { qrCode: { contains: query, mode: "insensitive" } },
              {
                teamMemberships: {
                  some: {
                    team: {
                      OR: [
                        { name: { contains: query, mode: "insensitive" } },
                        { teamCode: { contains: query, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              },
            ],
          },
          include: {
            teamMemberships: { include: { team: true } },
            documents: true,
            bedAllocations: { where: { status: "ACTIVE" } },
            qrPasses: { where: { status: "ACTIVE" } },
          },
          take: 25,
          orderBy: { updatedAt: "desc" },
        }),

        prisma.team.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { institution: { contains: query, mode: "insensitive" } },
              { teamCode: { contains: query, mode: "insensitive" } },
              { id: query },
            ],
          },
          include: {
            members: { include: { participant: true } },
            qrPasses: { where: { status: "ACTIVE" } },
          },
          take: 15,
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      return NextResponse.json({
        success: true,
        count: participants.length + teams.length,
        participants: participants.map((p) => {
          const team = p.teamMemberships[0]?.team;
          const verifiedDocs = p.documents.filter((d) => d.status === "VERIFIED").length;
          return {
            id: p.id,
            playerId: p.playerId,
            name: p.name,
            email: p.email,
            phone: p.phone,
            institution: p.institution,
            state: p.state,
            status: p.status,
            qrToken: p.qrCode || p.qrPasses[0]?.token || null,
            hasQr: !!(p.qrCode || p.qrPasses.length > 0),
            teamId: team?.id || null,
            teamCode: team?.teamCode || "INDEPENDENT",
            teamName: team?.name || "Independent Contingent",
            documentsCount: p.documents.length,
            verifiedDocumentsCount: verifiedDocs,
            isAccommodated: p.bedAllocations.length > 0,
          };
        }),
        teams: teams.map((t) => ({
          id: t.id,
          teamCode: t.teamCode,
          name: t.name,
          institution: t.institution,
          state: t.state,
          managerName: t.managerName,
          status: t.status,
          qrToken: t.teamQrToken || t.qrPasses[0]?.token || null,
          memberCount: t.members.length,
        })),
      });
    } catch (err: any) {
      console.error("[REGISTRATION_SEARCH_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.REGISTRATION_READ],
  }
);
