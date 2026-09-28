import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthenticatedParticipant } from "@/lib/participant/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const partAuth = await resolveAuthenticatedParticipant(req, context);
    if (partAuth.errorResponse) {
      return partAuth.errorResponse;
    }

    const { participant } = partAuth;
    if (!participant) {
      return NextResponse.json({
        success: true,
        results: [],
        message: "No athlete record linked.",
      });
    }

    const completedMatches = await prisma.match.findMany({
      where: {
        status: "COMPLETED",
        OR: [
          { playerA: { contains: participant.name, mode: "insensitive" } },
          { playerB: { contains: participant.name, mode: "insensitive" } },
          { playerA: { contains: participant.playerId, mode: "insensitive" } },
          { playerB: { contains: participant.playerId, mode: "insensitive" } },
        ],
      },
      include: { day: true },
      orderBy: { createdAt: "desc" },
    });

    const results = completedMatches.map((m) => {
      const isPlayerA =
        m.playerA.toLowerCase().includes(participant.name.toLowerCase()) ||
        m.playerA.toLowerCase().includes(participant.playerId.toLowerCase());

      const opponentName = isPlayerA ? m.playerB : m.playerA;
      const opponentInstitution = isPlayerA ? m.institutionB : m.institutionA;

      const myWon = (isPlayerA && m.winner === "PLAYER_A") || (!isPlayerA && m.winner === "PLAYER_B");

      return {
        id: m.id,
        matchNumber: m.matchNumber,
        category: m.category,
        stage: m.day ? m.day.stage : "Knockout Stage",
        date: m.day ? `${m.day.dayNumber} (${m.day.date})` : "OCT 18",
        court: m.court,
        opponent: opponentName,
        opponentInstitution,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        myResult: myWon ? "WON" : "LOST",
        winner: m.winner,
      };
    });

    return NextResponse.json({
      success: true,
      totalCompleted: results.length,
      wins: results.filter((r) => r.myResult === "WON").length,
      losses: results.filter((r) => r.myResult === "LOST").length,
      results,
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/results:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
