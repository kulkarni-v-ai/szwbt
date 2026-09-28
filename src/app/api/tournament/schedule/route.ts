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
    const dayId = searchParams.get("dayId");
    const court = searchParams.get("court");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim() || "";

    const where: any = {};
    if (dayId) where.dayId = dayId;
    if (court) where.court = court;
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { matchNumber: { contains: search, mode: "insensitive" } },
        { playerA: { contains: search, mode: "insensitive" } },
        { playerB: { contains: search, mode: "insensitive" } },
        { institutionA: { contains: search, mode: "insensitive" } },
        { institutionB: { contains: search, mode: "insensitive" } },
      ];
    }

    const [matches, courts, days, lock] = await Promise.all([
      prisma.match.findMany({
        where,
        orderBy: [{ dayId: "asc" }, { time: "asc" }, { court: "asc" }],
      }),
      prisma.court.findMany({ orderBy: { courtNumber: "asc" } }),
      prisma.tournamentDay.findMany({ orderBy: { id: "asc" } }),
      prisma.scheduleLock.findUnique({ where: { id: "CURRENT_SCHEDULE_LOCK" } }),
    ]);

    return NextResponse.json({
      success: true,
      matches,
      totalCount: matches.length,
      courts,
      days,
      isLocked: Boolean(lock?.isLocked),
      canManage: clearance.canManageSchedule,
      canLockSchedule: clearance.canLockSchedule,
    });
  } catch (err: any) {
    console.error("Error in GET /api/tournament/schedule:", err);
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

    if (!clearance.canManageSchedule) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to schedule matches." },
        { status: 403 }
      );
    }

    // 1. Verify schedule lock
    const lock = await prisma.scheduleLock.findUnique({
      where: { id: "CURRENT_SCHEDULE_LOCK" },
    });
    if (lock?.isLocked) {
      return NextResponse.json(
        {
          success: false,
          error: `Schedule is locked by ${lock.lockedBy || "Admin"}. Unlock the schedule before adding new fixtures.`,
        },
        { status: 423 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      dayId,
      time,
      category,
      court,
      matchNumber,
      playerA,
      institutionA,
      playerB,
      institutionB,
      assignedOfficialId,
    } = body;

    if (!dayId || !time || !category || !court || !matchNumber || !playerA || !playerB) {
      return NextResponse.json(
        { success: false, error: "Validation failed: Required fixture parameters are missing." },
        { status: 400 }
      );
    }

    // 2. Validate Court Conflict (Same court, same day, same time)
    const existingConflict = await prisma.match.findFirst({
      where: {
        dayId,
        court,
        time,
      },
    });

    if (existingConflict) {
      return NextResponse.json(
        {
          success: false,
          error: `Court Conflict: ${court} is already booked for match ${existingConflict.matchNumber} at ${time} on ${dayId}.`,
        },
        { status: 409 }
      );
    }

    const match = await prisma.match.create({
      data: {
        dayId,
        time,
        category,
        court,
        matchNumber,
        playerA,
        institutionA: institutionA || "Affiliated University",
        playerB,
        institutionB: institutionB || "Affiliated University",
        assignedOfficialId: assignedOfficialId || null,
        status: "UPCOMING",
      },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "MATCH_SCHEDULED",
      resourceType: "tournament_match",
      resourceId: match.id,
      metadata: { matchNumber: match.matchNumber, court: match.court, time: match.time, dayId: match.dayId },
    });

    return NextResponse.json({
      success: true,
      match,
    });
  } catch (err: any) {
    console.error("Error in POST /api/tournament/schedule:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
