import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dayParam = searchParams.get("day");

    // Fetch all tournament days from PostgreSQL
    const days = await prisma.tournamentDay.findMany({
      orderBy: { id: "asc" },
      include: {
        matches: {
          orderBy: { time: "asc" },
        },
      },
    });

    const scheduleByDay: Record<string, any> = {};

    for (const d of days) {
      scheduleByDay[d.id] = {
        id: d.id,
        date: d.date,
        dayNumber: d.dayNumber,
        stage: d.stage,
        isPublished: d.isPublished,
        matchesCount: d.matches.length,
        // If unpublished or empty, it's TBA
        isTba: !d.isPublished || d.matches.length === 0,
        matches: d.isPublished
          ? d.matches.map((m) => ({
              id: m.id,
              time: m.time,
              category: m.category,
              court: m.court,
              matchNumber: m.matchNumber,
              publicMatchNumber: m.publicMatchNumber,
              pool: m.pool,
              roundStage: m.roundStage,
              roundName: m.roundName,
              playerA: m.playerA,
              institutionA: m.institutionA,
              teamAId: m.teamAId,
              playerB: m.playerB,
              institutionB: m.institutionB,
              teamBId: m.teamBId,
              status: m.status,
              scoreA: m.scoreA ? m.scoreA.split(",").map(Number) : undefined,
              scoreB: m.scoreB ? m.scoreB.split(",").map(Number) : undefined,
            }))
          : [],
      };
    }

    if (dayParam) {
      const singleDay = scheduleByDay[dayParam.toUpperCase()];
      if (!singleDay) {
        return NextResponse.json({ success: false, error: "Day not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: singleDay });
    }

    return NextResponse.json({
      success: true,
      data: scheduleByDay,
    });
  } catch (error: any) {
    console.error("Error fetching schedule from PostgreSQL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch schedule from database" },
      { status: 500 }
    );
  }
}
