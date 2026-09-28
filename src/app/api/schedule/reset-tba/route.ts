import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dayId } = body;

    if (!dayId) {
      return NextResponse.json(
        { success: false, error: "dayId is required." },
        { status: 400 }
      );
    }

    const cleanDayId = dayId.toUpperCase().trim();

    await prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({
        where: { dayId: cleanDayId },
      });

      await tx.tournamentDay.update({
        where: { id: cleanDayId },
        data: { isPublished: false },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Reset ${cleanDayId} to TBA in PostgreSQL.`,
      dayId: cleanDayId,
    });
  } catch (error: any) {
    console.error("Reset TBA error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reset day in database." },
      { status: 500 }
    );
  }
}
