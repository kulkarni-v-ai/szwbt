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
      totalMatches,
      liveCount,
      scheduledCount,
      completedCount,
      matches,
    ] = await Promise.all([
      prisma.match.count(),
      prisma.match.count({ where: { status: "LIVE" } }),
      prisma.match.count({ where: { status: { in: ["SCHEDULED", "UPCOMING", "READY"] } } }),
      prisma.match.count({ where: { status: "COMPLETED" } }),
      prisma.match.findMany({
        include: { day: true },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      }),
    ]);

    const liveMatches = matches.filter((m) => m.status === "LIVE");
    const upcomingMatches = matches.filter(
      (m) => m.status === "SCHEDULED" || m.status === "UPCOMING" || m.status === "READY"
    );
    const completedMatches = matches.filter((m) => m.status === "COMPLETED");

    const formatMatch = (m: any) => ({
      id: m.id,
      matchNumber: m.matchNumber,
      category: m.category,
      court: m.court,
      time: m.time,
      date: m.day ? `${m.day.dayNumber} (${m.day.date})` : "OCT 18",
      stage: m.day ? m.day.stage : "Knockout Prelims",
      status: m.status,
      playerA: m.playerA,
      institutionA: m.institutionA,
      playerB: m.playerB,
      institutionB: m.institutionB,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      winner: m.winner,
      interruptionReason: m.interruptionReason,
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalMatches,
        liveCount,
        scheduledCount,
        completedCount,
      },
      liveMatches: liveMatches.map(formatMatch),
      upcomingMatches: upcomingMatches.map(formatMatch),
      completedMatches: completedMatches.map(formatMatch),
      allMatches: matches.map(formatMatch),
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer/matches:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
