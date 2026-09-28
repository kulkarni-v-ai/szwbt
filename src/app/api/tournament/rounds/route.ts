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

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const where: any = {};
    if (eventId) where.eventId = eventId;

    const rounds = await prisma.tournamentRound.findMany({
      where,
      include: {
        event: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ eventId: "asc" }, { sequence: "asc" }],
    });

    return NextResponse.json({
      success: true,
      rounds,
      canManage: clearance.canManageCategories,
    });
  } catch (err: any) {
    console.error("Error in GET /api/tournament/rounds:", err);
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

    if (!clearance.canManageCategories) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to create tournament round." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { eventId, name, code, sequence, matchCount } = body;

    if (!eventId || !name || !code) {
      return NextResponse.json(
        { success: false, error: "Validation failed: 'eventId', 'name', and 'code' are required." },
        { status: 400 }
      );
    }

    const round = await prisma.tournamentRound.create({
      data: {
        eventId,
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
        sequence: Number(sequence) || 1,
        matchCount: Number(matchCount) || 0,
        status: "PENDING",
      },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "ROUND_CREATED",
      resourceType: "tournament_round",
      resourceId: round.id,
      metadata: { code: round.code, name: round.name, eventId: round.eventId },
    });

    return NextResponse.json({
      success: true,
      round,
    });
  } catch (err: any) {
    console.error("Error in POST /api/tournament/rounds:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
