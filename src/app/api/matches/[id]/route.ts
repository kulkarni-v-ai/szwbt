import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScoringConfigForCategory } from "@/lib/scoring/rules";

/**
 * GET /api/matches/[id]
 * Retrieves the real Match record by its database UUID/cuid or publicMatchNumber.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Match ID is required." }, { status: 400 });
    }

    // Lookup by internal ID or public match number
    const match = await prisma.match.findFirst({
      where: {
        OR: [{ id }, { publicMatchNumber: id }],
      },
      include: {
        day: { select: { id: true, date: true, dayNumber: true, stage: true } },
        events: { orderBy: { timestamp: "desc" } },
      },
    });

    if (!match) {
      return NextResponse.json({ success: false, error: `Match "${id}" not found.` }, { status: 404 });
    }

    // Upstream and downstream matches for bracket context
    let sourceAMatch: any = null;
    let sourceBMatch: any = null;
    let downstreamMatch: any = null;

    if (match.sourceAMatchNumber) {
      sourceAMatch = await prisma.match.findUnique({
        where: { publicMatchNumber: match.sourceAMatchNumber },
        select: { id: true, publicMatchNumber: true, playerA: true, playerB: true, winner: true, status: true },
      });
    }

    if (match.sourceBMatchNumber) {
      sourceBMatch = await prisma.match.findUnique({
        where: { publicMatchNumber: match.sourceBMatchNumber },
        select: { id: true, publicMatchNumber: true, playerA: true, playerB: true, winner: true, status: true },
      });
    }

    if (match.downstreamMatchNumber) {
      downstreamMatch = await prisma.match.findUnique({
        where: { publicMatchNumber: match.downstreamMatchNumber },
        select: { id: true, publicMatchNumber: true, roundName: true, status: true },
      });
    }

    const scoringConfig = getScoringConfigForCategory(match.category);

    return NextResponse.json({
      success: true,
      match: {
        ...match,
        sourceAMatch,
        sourceBMatch,
        downstreamMatch,
        scoringConfig,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/matches/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve match", details: error.message },
      { status: 500 }
    );
  }
}
