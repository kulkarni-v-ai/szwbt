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

    const completedMatches = await prisma.match.findMany({
      where: { status: "COMPLETED" },
      include: { day: true },
      orderBy: { actualEndTime: "desc" },
    });

    const results = completedMatches.map((m) => {
      const winnerName = m.winner === "PLAYER_A" ? m.playerA : m.playerB;
      const winnerInstitution = m.winner === "PLAYER_A" ? m.institutionA : m.institutionB;

      return {
        id: m.id,
        matchNumber: m.matchNumber,
        category: m.category,
        court: m.court,
        stage: m.day ? m.day.stage : "Tournament Stage",
        date: m.day ? `${m.day.dayNumber} (${m.day.date})` : "OCT 18",
        playerA: m.playerA,
        institutionA: m.institutionA,
        playerB: m.playerB,
        institutionB: m.institutionB,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        winner: m.winner,
        winnerName,
        winnerInstitution,
        completedAt: m.actualEndTime || m.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      totalCompleted: results.length,
      results,
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer/results:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
