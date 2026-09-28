import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const query = (searchParams.get("q") || "").trim();
      const status = searchParams.get("status");
      const searchType = searchParams.get("type") || "ALL"; // "ALL" | "PARTICIPANT" | "TEAM"

      // 1. Calculate Real KPIs from Database
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [
        totalParticipants,
        todayRegistrations,
        totalTeams,
        pendingRegistrations,
        participantsWithDocs,
        totalPayments,
      ] = await Promise.all([
        prisma.participant.count(),
        prisma.participant.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.team.count(),
        prisma.participant.count({ where: { status: { in: ["PENDING", "UNDER REVIEW", "INCOMPLETE"] } } }),
        prisma.participant.count({
          where: {
            documents: {
              some: { status: { in: ["PENDING", "UPLOADING"] } },
            },
          },
        }),
        prisma.paymentTransaction.count({ where: { category: "REGISTRATION" } }),
      ]);

      // Calculate real documents pending and payments pending
      const documentsPending = participantsWithDocs;
      const paymentsPending = Math.max(0, totalParticipants - totalPayments);

      // 2. Build Where Clause for Search
      const whereClause: any = {};
      if (status && status !== "ALL") {
        whereClause.status = status;
      }

      if (query) {
        if (searchType === "TEAM") {
          whereClause.teamMemberships = {
            some: {
              team: {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { teamCode: { contains: query, mode: "insensitive" } },
                  { institution: { contains: query, mode: "insensitive" } },
                ],
              },
            },
          };
        } else {
          whereClause.OR = [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } },
            { playerId: { contains: query, mode: "insensitive" } },
            { institution: { contains: query, mode: "insensitive" } },
            { state: { contains: query, mode: "insensitive" } },
            {
              teamMemberships: {
                some: {
                  team: {
                    name: { contains: query, mode: "insensitive" },
                  },
                },
              },
            },
          ];
        }
      }

      // 3. Fetch Recent Registrations
      const participants = await prisma.participant.findMany({
        where: whereClause,
        include: {
          teamMemberships: {
            include: {
              team: true,
            },
          },
          documents: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      // 4. Fetch Pending Action Items
      const pendingActions = await prisma.participant.findMany({
        where: {
          OR: [
            { status: "PENDING" },
            { status: "UNDER REVIEW" },
            { documents: { some: { status: "PENDING" } } },
          ],
        },
        include: {
          teamMemberships: { include: { team: true } },
          documents: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      });

      // 5. Fetch Recent Teams for Team Search
      const teams = await prisma.team.findMany({
        include: {
          members: { include: { participant: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });

      // 6. Audit Log View Action
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "REGISTRATION_LIST_VIEWED",
        resourceType: "registration",
        resourceId: "admin-desk",
        metadata: {
          resultCount: participants.length,
          query,
          status,
          searchType,
        },
      });

      return NextResponse.json({
        success: true,
        kpis: {
          todayRegistrations,
          totalParticipants,
          totalTeams,
          pendingRegistrations,
          documentsPending,
          paymentsPending,
          hasData: totalParticipants > 0,
        },
        count: participants.length,
        registrations: participants.map((p) => {
          const team = p.teamMemberships[0]?.team;
          const verifiedDocs = p.documents.filter((d) => d.status === "VERIFIED" || d.status === "READY").length;
          const totalDocs = Math.max(p.documents.length, 3);
          const docStatus = `${verifiedDocs}/${totalDocs} VERIFIED`;

          return {
            id: p.id,
            playerId: p.playerId,
            name: p.name,
            email: p.email || "—",
            phone: p.phone || "—",
            institution: p.institution,
            state: p.state,
            category: p.category,
            status: p.status,
            teamId: team?.id || null,
            teamName: team?.name || "Independent",
            teamCode: team?.teamCode || "—",
            documentsStatus: docStatus,
            documentsCount: p.documents.length,
            paymentStatus: p.status === "APPROVED" ? "PAID" : "PENDING",
            time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
            date: p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : "—",
            operator: "Priya Rao (Desk 02)",
          };
        }),
        pendingActions: pendingActions.map((pa) => ({
          id: pa.id,
          playerId: pa.playerId,
          name: pa.name,
          institution: pa.institution,
          issue: pa.documents.length < 3 ? "DOCUMENTS PENDING" : "VERIFICATION REQUIRED",
          status: pa.status,
        })),
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
          memberCount: t.members.length,
          qrToken: t.teamQrToken || null,
        })),
      });
    } catch (err: any) {
      console.error("Admin registrations API error:", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.REGISTRATION_READ],
  }
);
