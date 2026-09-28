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
        liveMatch: null,
        upcomingMatches: [],
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

    // Query matches where team name or institution or any member is a participant
    const matches = await prisma.match.findMany({
      where: {
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
      },
      orderBy: { createdAt: "desc" },
    });

    // Classify matches
    const liveMatch = matches.find((m) => m.status === "LIVE") || null;
    const upcoming = matches.filter(
      (m) => m.status === "UPCOMING" || m.status === "SCHEDULED" || m.status === "READY"
    );

    const formatMatch = (m: any) => {
      // Determine which player is ours and which is opponent
      const isPlayerAOurTeam =
        m.institutionA.toLowerCase().includes(team.institution.toLowerCase()) ||
        m.playerA.toLowerCase().includes(team.name.toLowerCase()) ||
        memberNames.includes(m.playerA);

      const ourSide = isPlayerAOurTeam ? "A" : "B";
      const ourPlayer = isPlayerAOurTeam ? m.playerA : m.playerB;
      const ourInstitution = isPlayerAOurTeam ? m.institutionA : m.institutionB;
      const ourScore = isPlayerAOurTeam ? m.scoreA : m.scoreB;

      const opponentPlayer = isPlayerAOurTeam ? m.playerB : m.playerA;
      const opponentInstitution = isPlayerAOurTeam ? m.institutionB : m.institutionA;
      const opponentScore = isPlayerAOurTeam ? m.scoreB : m.scoreA;

      return {
        id: m.id,
        matchNumber: m.matchNumber,
        category: m.category,
        court: m.court,
        time: m.time,
        date: m.day ? `${m.day.dayNumber} (${m.day.date})` : "OCT 18",
        stage: m.day?.stage || "Round 1",
        status: m.status, // LIVE, UPCOMING, SCHEDULED, COMPLETED, PAUSED
        ourPlayer,
        ourInstitution,
        ourScore,
        opponentPlayer,
        opponentInstitution,
        opponentScore,
        rawScoreA: m.scoreA,
        rawScoreB: m.scoreB,
        playerA: m.playerA,
        institutionA: m.institutionA,
        playerB: m.playerB,
        institutionB: m.institutionB,
        winner: m.winner,
        interruptionReason: m.interruptionReason,
      };
    };

    return NextResponse.json({
      success: true,
      teamId: selectedTeamId,
      teamName: team.name,
      liveMatch: liveMatch ? formatMatch(liveMatch) : null,
      upcomingMatches: upcoming.map(formatMatch),
      totalMatches: matches.length,
    });
  } catch (err: any) {
    console.error("Error in GET /api/team/matches:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
