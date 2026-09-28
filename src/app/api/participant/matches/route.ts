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
        matches: [],
        nextMatch: null,
        liveMatch: null,
        message: "No athlete record linked.",
      });
    }

    // Matches involving this participant by name or player ID
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { playerA: { contains: participant.name, mode: "insensitive" } },
          { playerB: { contains: participant.name, mode: "insensitive" } },
          { playerA: { contains: participant.playerId, mode: "insensitive" } },
          { playerB: { contains: participant.playerId, mode: "insensitive" } },
        ],
      },
      include: {
        day: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const liveMatch = matches.find((m) => m.status === "LIVE") || null;
    const upcomingMatches = matches.filter(
      (m) => m.status === "UPCOMING" || m.status === "SCHEDULED" || m.status === "READY"
    );
    const completedMatches = matches.filter((m) => m.status === "COMPLETED");

    const formatMatch = (m: any) => {
      const isPlayerA =
        m.playerA.toLowerCase().includes(participant.name.toLowerCase()) ||
        m.playerA.toLowerCase().includes(participant.playerId.toLowerCase());

      const opponentName = isPlayerA ? m.playerB : m.playerA;
      const opponentInstitution = isPlayerA ? m.institutionB : m.institutionA;
      const myInstitution = isPlayerA ? m.institutionA : m.institutionB;

      return {
        id: m.id,
        matchNumber: m.matchNumber,
        category: m.category,
        court: m.court,
        time: m.time,
        date: m.day ? `${m.day.dayNumber} (${m.day.date})` : "OCT 18",
        stage: m.day ? m.day.stage : "Tournament Stage",
        status: m.status,
        opponentName,
        opponentInstitution,
        myInstitution,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        winner: m.winner,
        interruptionReason: m.interruptionReason,
        isViewerOnly: true, // Strictly read-only for participant
      };
    };

    return NextResponse.json({
      success: true,
      totalMatches: matches.length,
      nextMatch: upcomingMatches[0] ? formatMatch(upcomingMatches[0]) : null,
      liveMatch: liveMatch ? formatMatch(liveMatch) : null,
      upcoming: upcomingMatches.map(formatMatch),
      completed: completedMatches.map(formatMatch),
      all: matches.map(formatMatch),
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/matches:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
