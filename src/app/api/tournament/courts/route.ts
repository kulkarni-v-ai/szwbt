import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyTournamentAdminClearance } from "@/lib/tournament/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const clearance = verifyTournamentAdminClearance(context);
    if (clearance.errorResponse) {
      return clearance.errorResponse;
    }

    const courts = await prisma.court.findMany({
      orderBy: { courtNumber: "asc" },
    });

    // Also fetch live matches mapped to courts
    const liveMatches = await prisma.match.findMany({
      where: { status: "LIVE" },
      select: {
        id: true,
        matchNumber: true,
        court: true,
        playerA: true,
        playerB: true,
        scoreA: true,
        scoreB: true,
      },
    });

    const liveMatchMap: Record<string, any> = {};
    for (const lm of liveMatches) {
      liveMatchMap[lm.court] = lm;
    }

    const enrichedCourts = courts.map((c) => ({
      ...c,
      currentMatch: liveMatchMap[c.courtNumber] || null,
    }));

    return NextResponse.json({
      success: true,
      courts: enrichedCourts,
      canManage: clearance.canManageCourts,
    });
  } catch (err: any) {
    console.error("Error in GET /api/tournament/courts:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const clearance = verifyTournamentAdminClearance(context);
    if (clearance.errorResponse) {
      return clearance.errorResponse;
    }

    if (!clearance.canManageCourts) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to configure tournament courts." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { courtNumber, venue, status, umpire, notes } = body;

    if (!courtNumber) {
      return NextResponse.json(
        { success: false, error: "Validation failed: 'courtNumber' is required (e.g. 'Court 09')." },
        { status: 400 }
      );
    }

    const cleanNumber = String(courtNumber).trim();
    const existing = await prisma.court.findUnique({
      where: { courtNumber: cleanNumber },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Court '${cleanNumber}' already exists.` },
        { status: 400 }
      );
    }

    const court = await prisma.court.create({
      data: {
        courtNumber: cleanNumber,
        venue: venue ? String(venue).trim() : "KLE Tech Indoor Stadium, Hubballi",
        status: status || "READY",
        umpire: umpire ? String(umpire).trim() : null,
        notes: notes ? String(notes).trim() : null,
        isActive: true,
      },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "COURT_CREATED",
      resourceType: "tournament_court",
      resourceId: court.id,
      metadata: { courtNumber: court.courtNumber, status: court.status },
    });

    return NextResponse.json({
      success: true,
      court,
    });
  } catch (err: any) {
    console.error("Error in POST /api/tournament/courts:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
