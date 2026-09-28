import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOperationsClearance } from "@/lib/operations/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const opsAuth = verifyOperationsClearance(authResult.context);
    if (opsAuth.errorResponse) {
      return opsAuth.errorResponse;
    }

    const [courts, liveMatches, upcomingMatches] = await Promise.all([
      prisma.court.findMany({
        orderBy: { courtNumber: "asc" },
      }),
      prisma.match.findMany({
        where: { status: "LIVE" },
        include: { day: true },
      }),
      prisma.match.findMany({
        where: { status: { in: ["UPCOMING", "SCHEDULED", "READY"] } },
        include: { day: true },
        orderBy: { scheduledStartTime: "asc" },
      }),
    ]);

    const courtOverview = courts.map((court) => {
      const activeMatch = liveMatches.find((m) => m.court === court.courtNumber);
      const nextMatch = upcomingMatches.find((m) => m.court === court.courtNumber);

      return {
        id: court.id,
        courtNumber: court.courtNumber,
        status: court.status,
        umpire: court.umpire || "Unassigned",
        currentMatch: activeMatch
          ? {
              id: activeMatch.id,
              matchNumber: activeMatch.matchNumber,
              category: activeMatch.category,
              playerA: activeMatch.playerA,
              institutionA: activeMatch.institutionA,
              playerB: activeMatch.playerB,
              institutionB: activeMatch.institutionB,
              scoreA: activeMatch.scoreA || "0",
              scoreB: activeMatch.scoreB || "0",
              interruptionReason: activeMatch.interruptionReason,
              interruptionNotes: activeMatch.interruptionNotes,
            }
          : null,
        nextMatch: nextMatch
          ? {
              id: nextMatch.id,
              matchNumber: nextMatch.matchNumber,
              playerA: nextMatch.playerA,
              playerB: nextMatch.playerB,
              time: nextMatch.time,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      courts: courtOverview,
      total: courtOverview.length,
    });
  } catch (error: any) {
    console.error("Operations courts overview error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load courts overview." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const opsAuth = verifyOperationsClearance(authResult.context);
    if (opsAuth.errorResponse) {
      return opsAuth.errorResponse;
    }

    const body = await req.json();
    const { courtNumber, status, umpire } = body;

    if (!courtNumber || !status) {
      return NextResponse.json(
        { success: false, error: "Missing courtNumber or status." },
        { status: 400 }
      );
    }

    const existingCourt = await prisma.court.findUnique({
      where: { courtNumber },
    });

    if (!existingCourt) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Court not found." },
        { status: 404 }
      );
    }

    const updatedCourt = await prisma.court.update({
      where: { courtNumber },
      data: {
        status,
        ...(umpire !== undefined ? { umpire } : {}),
      },
    });

    await logAuditEvent({
      actorUserId: authResult.context.user.id,
      actorEmail: authResult.context.user.email,
      action: "COURT_STATUS_CHANGED",
      resourceType: "court",
      resourceId: courtNumber,
      metadata: {
        courtNumber,
        previousStatus: existingCourt.status,
        newStatus: updatedCourt.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${courtNumber} status updated to ${updatedCourt.status}.`,
      court: updatedCourt,
    });
  } catch (error: any) {
    console.error("Operations court update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update court status." },
      { status: 500 }
    );
  }
}
