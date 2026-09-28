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

    const lock = await prisma.scheduleLock.findUnique({
      where: { id: "CURRENT_SCHEDULE_LOCK" },
    });

    return NextResponse.json({
      success: true,
      lock: {
        isLocked: Boolean(lock?.isLocked),
        lockedBy: lock?.lockedBy || null,
        lockedAt: lock?.lockedAt || null,
        reason: lock?.reason || null,
      },
      canLockSchedule: clearance.canLockSchedule,
    });
  } catch (err: any) {
    console.error("Error in GET /api/tournament/schedule/lock:", err);
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

    if (!clearance.canLockSchedule) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to modify schedule lock state." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { isLocked, reason } = body;

    const lockState = Boolean(isLocked);

    const updated = await prisma.scheduleLock.upsert({
      where: { id: "CURRENT_SCHEDULE_LOCK" },
      update: {
        isLocked: lockState,
        lockedBy: lockState ? context.user.email : null,
        lockedAt: lockState ? new Date() : null,
        reason: lockState ? (reason ? String(reason).trim() : "Administrative Lock") : null,
      },
      create: {
        id: "CURRENT_SCHEDULE_LOCK",
        isLocked: lockState,
        lockedBy: lockState ? context.user.email : null,
        lockedAt: lockState ? new Date() : null,
        reason: lockState ? (reason ? String(reason).trim() : "Administrative Lock") : null,
      },
    });

    const action = lockState ? "SCHEDULE_LOCKED" : "SCHEDULE_UNLOCKED";
    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action,
      resourceType: "tournament_schedule",
      resourceId: "LOCK",
      metadata: { isLocked: lockState, reason: updated.reason },
    });

    return NextResponse.json({
      success: true,
      message: lockState ? "Championship schedule locked successfully." : "Championship schedule unlocked.",
      lock: updated,
    });
  } catch (err: any) {
    console.error("Error in POST /api/tournament/schedule/lock:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
