import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";
import { generateTeamQr } from "@/lib/qr/service";

/**
 * GET /api/registration/teams
 * Searches or lists university teams from database.
 * Supports finding by institution name, team name, teamCode, or ID.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const query = (searchParams.get("q") || "").trim();

      const whereClause: any = {};
      if (query) {
        whereClause.OR = [
          { institution: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { teamCode: { contains: query, mode: "insensitive" } },
          { id: query },
        ];
      }

      const teams = await prisma.team.findMany({
        where: whereClause,
        include: {
          members: {
            include: {
              participant: {
                include: {
                  documents: true,
                  bedAllocations: { where: { status: "ACTIVE" } },
                  qrPasses: { where: { status: "ACTIVE" } },
                },
              },
            },
          },
          qrPasses: { where: { status: "ACTIVE" } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });

      return NextResponse.json({
        success: true,
        count: teams.length,
        teams: teams.map((t) => ({
          id: t.id,
          teamCode: t.teamCode,
          name: t.name,
          institution: t.institution,
          state: t.state,
          managerName: t.managerName || "—",
          managerPhone: t.managerPhone || "—",
          captainName: t.captainName || "—",
          status: t.status,
          qrToken: t.teamQrToken || t.qrPasses[0]?.token || null,
          memberCount: t.members.length,
          members: t.members.map((m) => {
            const p = m.participant;
            const verifiedDocs = p.documents.filter((d) => d.status === "VERIFIED").length;
            return {
              id: p.id,
              playerId: p.playerId,
              name: p.name,
              email: p.email,
              phone: p.phone,
              state: p.state,
              institution: p.institution,
              status: p.status,
              role: m.role,
              qrToken: p.qrCode || p.qrPasses[0]?.token || null,
              hasQr: !!(p.qrCode || p.qrPasses.length > 0),
              documentsCount: p.documents.length,
              verifiedDocumentsCount: verifiedDocs,
              documentsStatus: p.documents.length === 0 ? "DOCUMENTS_PENDING" : verifiedDocs >= 3 ? "VERIFIED" : "PENDING_VERIFICATION",
              isAccommodated: p.bedAllocations.length > 0,
            };
          }),
        })),
      });
    } catch (err: any) {
      console.error("[REGISTRATION_TEAMS_GET_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.REGISTRATION_READ],
  }
);

/**
 * POST /api/registration/teams
 * Creates a new university team record and immediately generates a Team QR pass.
 * Prevents duplicate creation if the team already exists.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { institution, name, state, managerName, managerPhone } = body;

      if (!institution || !name || !state) {
        return NextResponse.json(
          {
            success: false,
            error: "Institution / University name, Team name, and State are required.",
          },
          { status: 400 }
        );
      }

      const cleanInst = institution.trim();
      const cleanName = name.trim();
      const cleanState = state.trim();

      // Check if team already exists to prevent duplicate
      const existing = await prisma.team.findFirst({
        where: {
          OR: [
            { institution: { equals: cleanInst, mode: "insensitive" }, name: { equals: cleanName, mode: "insensitive" } },
            { name: { equals: cleanName, mode: "insensitive" } },
          ],
        },
        include: {
          members: { include: { participant: true } },
          qrPasses: { where: { status: "ACTIVE" } },
        },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          message: "Existing university team located. Loaded existing registration session.",
          isExisting: true,
          team: {
            id: existing.id,
            teamCode: existing.teamCode,
            name: existing.name,
            institution: existing.institution,
            state: existing.state,
            managerName: existing.managerName,
            managerPhone: existing.managerPhone,
            status: existing.status,
            qrToken: existing.teamQrToken || existing.qrPasses[0]?.token || null,
            memberCount: existing.members.length,
          },
        });
      }

      // Generate canonical team code
      const count = await prisma.team.count();
      const teamCode = `TM-SZ-${String(count + 101).padStart(3, "0")}`;

      const team = await prisma.team.create({
        data: {
          teamCode,
          name: cleanName,
          institution: cleanInst,
          state: cleanState,
          managerName: managerName?.trim() || null,
          managerPhone: managerPhone?.trim() || null,
          status: "INCOMPLETE",
        },
      });

      // Generate Team QR pass immediately
      const qrResult = await generateTeamQr(team.id, context.user.email);

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "TEAM_CREATED",
        resourceType: "team",
        resourceId: team.id,
        metadata: {
          teamCode: team.teamCode,
          teamName: team.name,
          institution: team.institution,
          qrToken: qrResult.token,
          createdBy: context.user.email,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "University team successfully registered.",
          isExisting: false,
          team: {
            id: team.id,
            teamCode: team.teamCode,
            name: team.name,
            institution: team.institution,
            state: team.state,
            managerName: team.managerName,
            managerPhone: team.managerPhone,
            status: team.status,
            qrToken: qrResult.token,
            memberCount: 0,
          },
        },
        { status: 201 }
      );
    } catch (err: any) {
      console.error("[REGISTRATION_TEAMS_POST_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.REGISTRATION_CREATE],
  }
);
