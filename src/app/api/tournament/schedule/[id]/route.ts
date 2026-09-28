import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyTournamentAdminClearance } from "@/lib/tournament/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: "403 Forbidden: Insufficient clearance to modify match schedule." },
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
          error: `Schedule is locked by ${lock.lockedBy || "Admin"}. Unlock the schedule before modifying fixtures.`,
        },
        { status: 423 }
      );
    }

    const { id } = await params;
    const match = await prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      return NextResponse.json({ success: false, error: "Match not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { time, court, dayId, assignedOfficialId, status, interruptionNotes } = body;

    const targetDay = dayId || match.dayId;
    const targetCourt = court || match.court;
    const targetTime = time || match.time;

    // 2. Validate Court Conflict if court, time, or dayId is changed
    if ((court && court !== match.court) || (time && time !== match.time) || (dayId && dayId !== match.dayId)) {
      const conflict = await prisma.match.findFirst({
        where: {
          id: { not: match.id },
          dayId: targetDay,
          court: targetCourt,
          time: targetTime,
        },
      });

      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error: `Court Conflict: ${targetCourt} is already occupied by match ${conflict.matchNumber} at ${targetTime} on ${targetDay}.`,
          },
          { status: 409 }
        );
      }
    }

    const data: any = {};
    const auditActions: string[] = [];

    if (time && time !== match.time) {
      data.time = time;
      auditActions.push("MATCH_RESCHEDULED");
    }
    if (court && court !== match.court) {
      data.court = court;
      auditActions.push("COURT_ASSIGNED");
    }
    if (dayId && dayId !== match.dayId) {
      data.dayId = dayId;
      auditActions.push("MATCH_RESCHEDULED");
    }
    if (assignedOfficialId !== undefined && assignedOfficialId !== match.assignedOfficialId) {
      data.assignedOfficialId = assignedOfficialId ? String(assignedOfficialId).trim() : null;
      auditActions.push("OFFICIAL_ASSIGNED");
    }
    if (status && status !== match.status) {
      data.status = status;
    }
    if (interruptionNotes !== undefined) {
      data.interruptionNotes = interruptionNotes;
    }

    const updated = await prisma.match.update({
      where: { id },
      data,
    });

    for (const action of auditActions) {
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action,
        resourceType: "tournament_match",
        resourceId: updated.id,
        metadata: { matchNumber: updated.matchNumber, court: updated.court, time: updated.time, dayId: updated.dayId },
      });
    }

    return NextResponse.json({
      success: true,
      match: updated,
    });
  } catch (err: any) {
    console.error("Error in PATCH /api/tournament/schedule/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
