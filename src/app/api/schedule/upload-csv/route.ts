import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dayId, csvContent } = body;

    if (!dayId || !csvContent) {
      return NextResponse.json(
        { success: false, error: "dayId and csvContent are required." },
        { status: 400 }
      );
    }

    const cleanDayId = dayId.toUpperCase().trim();

    // Verify day exists in database
    const day = await prisma.tournamentDay.findUnique({
      where: { id: cleanDayId },
    });

    if (!day) {
      return NextResponse.json(
        { success: false, error: `Tournament day ${cleanDayId} does not exist.` },
        { status: 404 }
      );
    }

    // Parse CSV
    const lines = csvContent
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    if (lines.length === 0) {
      return NextResponse.json(
        { success: false, error: "CSV content is empty." },
        { status: 400 }
      );
    }

    let startIndex = 0;
    const firstLine = lines[0].toLowerCase();
    if (
      firstLine.includes("time") ||
      firstLine.includes("category") ||
      firstLine.includes("court") ||
      firstLine.includes("player")
    ) {
      startIndex = 1;
    }

    const matchRows: Array<{
      dayId: string;
      time: string;
      category: string;
      court: string;
      matchNumber: string;
      playerA: string;
      institutionA: string;
      playerB: string;
      institutionB: string;
      status: string;
    }> = [];

    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;

    for (let i = startIndex; i < lines.length; i++) {
      const rawLine = lines[i];
      const cols: string[] = [];
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(rawLine)) !== null) {
        if (match.index === regex.lastIndex) regex.lastIndex++;
        let val = match[1] ?? "";
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1).replace(/""/g, '"');
        }
        cols.push(val.trim());
        if (regex.lastIndex >= rawLine.length) break;
      }

      if (cols.length >= 6) {
        const time = cols[0] || "10:00 IST";
        const category = cols[1] || "Women's Singles";
        const court = cols[2] || "Court 01";
        const matchNumber = cols[3] || `Match ${i}`;
        const playerA = cols[4] || "TBA";
        const institutionA = cols[5] || "TBA";
        const playerB = cols[6] || "TBA";
        const institutionB = cols[7] || "TBA";
        let statusRaw = (cols[8] || "UPCOMING").toUpperCase().trim();
        let status = "UPCOMING";
        if (statusRaw.includes("LIVE")) status = "LIVE";
        else if (statusRaw.includes("COMPLET")) status = "COMPLETED";

        matchRows.push({
          dayId: cleanDayId,
          time: time.includes("IST") ? time : `${time} IST`,
          category,
          court,
          matchNumber,
          playerA,
          institutionA,
          playerB,
          institutionB,
          status,
        });
      }
    }

    if (matchRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid match records could be extracted from CSV." },
        { status: 400 }
      );
    }

    // Atomic transaction in PostgreSQL: delete previous matches for this day, insert new, set isPublished = true
    await prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({
        where: { dayId: cleanDayId },
      });

      await tx.match.createMany({
        data: matchRows,
      });

      await tx.tournamentDay.update({
        where: { id: cleanDayId },
        data: { isPublished: true },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded and published ${matchRows.length} matches for ${cleanDayId} into PostgreSQL.`,
      count: matchRows.length,
      dayId: cleanDayId,
    });
  } catch (error: any) {
    console.error("CSV upload error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process CSV in PostgreSQL." },
      { status: 500 }
    );
  }
}
