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

    if (!clearance.canManageCategories) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to modify tournament round." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const round = await prisma.tournamentRound.findUnique({
      where: { id },
    });

    if (!round) {
      return NextResponse.json({ success: false, error: "Round not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, code, sequence, status, matchCount } = body;

    const data: any = {};
    if (name) data.name = String(name).trim();
    if (code) data.code = String(code).trim().toUpperCase();
    if (sequence !== undefined) data.sequence = Number(sequence);
    if (matchCount !== undefined) data.matchCount = Number(matchCount);

    if (status) {
      const VALID_STATUSES = ["PENDING", "SCHEDULED", "IN_PROGRESS", "COMPLETED"];
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid round status '${status}'. Allowed: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      data.status = status;
    }

    const updated = await prisma.tournamentRound.update({
      where: { id },
      data,
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "ROUND_UPDATED",
      resourceType: "tournament_round",
      resourceId: updated.id,
      metadata: { code: updated.code, name: updated.name, status: updated.status },
    });

    return NextResponse.json({
      success: true,
      round: updated,
    });
  } catch (err: any) {
    console.error("Error in PATCH /api/tournament/rounds/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
