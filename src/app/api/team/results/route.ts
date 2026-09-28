import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthorizedTeam } from "@/lib/team/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const teamAuth = await resolveAuthorizedTeam(req, context);
    if (teamAuth.errorResponse) {
      return teamAuth.errorResponse;
    }

    const { selectedTeamId } = teamAuth;
    if (!selectedTeamId) {
      return NextResponse.json({
        success: true,
        results: [],
        message: "No team assigned.",
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: selectedTeamId },
      include: {
        members: { include: { participant: true } },
      },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found." }, { status: 404 });
    }

    const memberNames = team.members.map((m) => m.participant.name);

    const completedMatches = await prisma.match.findMany({
      where: {
        status: "COMPLETED",
        OR: [
          { institutionA: { contains: team.institution, mode: "insensitive" } },
          { institutionB: { contains: team.institution, mode: "insensitive" } },
          { playerA: { in: memberNames } },
          { playerB: { in: memberNames } },
          { playerA: { contains: team.name, mode: "insensitive" } },
          { playerB: { contains: team.name, mode: "insensitive" } },
        ],
      },
      include: {
        day: true,
        events: {
          orderBy: { timestamp: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const results = completedMatches.map((m) => {
      const isPlayerAOurTeam =
        m.institutionA.toLowerCase().includes(team.institution.toLowerCase()) ||
        m.playerA.toLowerCase().includes(team.name.toLowerCase()) ||
        memberNames.includes(m.playerA);

      const ourSide = isPlayerAOurTeam ? "PLAYER_A" : "PLAYER_B";
      const isWinner = m.winner === ourSide;

      const ourPlayer = isPlayerAOurTeam ? m.playerA : m.playerB;
      const ourScore = isPlayerAOurTeam ? m.scoreA : m.scoreB;
      const opponentPlayer = isPlayerAOurTeam ? m.playerB : m.playerA;
      const opponentInstitution = isPlayerAOurTeam ? m.institutionB : m.institutionA;
      const opponentScore = isPlayerAOurTeam ? m.scoreB : m.scoreA;

      return {
        id: m.id,
        matchNumber: m.matchNumber,
        category: m.category,
        court: m.court,
        date: m.day ? `${m.day.dayNumber} (${m.day.date})` : "OCT 18",
        stage: m.day?.stage || "Round 1",
        status: m.status,
        ourPlayer,
        ourScore,
        opponentPlayer,
        opponentInstitution,
        opponentScore,
        outcome: isWinner ? "WON" : "LOST",
        winnerLabel: isWinner ? "VICTORY" : "DEFEAT",
        setScores: `${ourScore} - ${opponentScore}`,
        actualStartTime: m.actualStartTime,
        actualEndTime: m.actualEndTime,
      };
    });

    return NextResponse.json({
      success: true,
      teamId: selectedTeamId,
      totalCompleted: results.length,
      results,
    });
  } catch (err: any) {
    console.error("Error in GET /api/team/results:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
