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

    if (!clearance.canManageCourts) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to modify arena court." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const court = await prisma.court.findUnique({
      where: { id },
    });

    if (!court) {
      return NextResponse.json({ success: false, error: "Court not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { status, venue, umpire, notes, isActive } = body;

    const data: any = {};
    if (venue) data.venue = String(venue).trim();
    if (umpire !== undefined) data.umpire = umpire ? String(umpire).trim() : null;
    if (notes !== undefined) data.notes = notes ? String(notes).trim() : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    let isStatusChange = false;
    if (status && status !== court.status) {
      const VALID_STATUSES = ["READY", "LIVE", "BREAK", "DELAYED", "MAINTENANCE", "UNAVAILABLE"];
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid court status '${status}'. Allowed: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      data.status = status;
      isStatusChange = true;
    }

    const updated = await prisma.court.update({
      where: { id },
      data,
    });

    const action = isStatusChange ? "COURT_STATUS_CHANGED" : "COURT_UPDATED";
    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action,
      resourceType: "tournament_court",
      resourceId: updated.id,
      metadata: { courtNumber: updated.courtNumber, oldStatus: court.status, newStatus: updated.status },
    });

    return NextResponse.json({
      success: true,
      court: updated,
    });
  } catch (err: any) {
    console.error("Error in PATCH /api/tournament/courts/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
