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

    const [
      total,
      approved,
      pending,
      rejected,
      byCategory,
      byState,
      recentRegistrations,
    ] = await Promise.all([
      prisma.participant.count(),
      prisma.participant.count({ where: { status: "APPROVED" } }),
      prisma.participant.count({ where: { status: "PENDING" } }),
      prisma.participant.count({ where: { status: "REJECTED" } }),
      prisma.participant.groupBy({
        by: ["category"],
        _count: { id: true },
      }),
      prisma.participant.groupBy({
        by: ["state"],
        _count: { id: true },
      }),
      prisma.participant.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { teamMemberships: { include: { team: true } } },
      }),
    ]);

    const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return NextResponse.json({
      success: true,
      summary: {
        total,
        approved,
        pending,
        rejected,
        completionRate,
      },
      categories: byCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      states: byState.map((s) => ({
        state: s.state,
        count: s._count.id,
      })),
      recent: recentRegistrations.map((p) => ({
        id: p.id,
        playerId: p.playerId,
        name: p.name,
        institution: p.institution,
        category: p.category,
        status: p.status,
        teamName: p.teamMemberships[0]?.team?.name || "Independent",
        createdAt: p.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer/registration:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
