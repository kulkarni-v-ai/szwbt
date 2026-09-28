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
        { success: false, error: "403 Forbidden: Insufficient clearance to update tournament category." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const category = await prisma.tournamentCategory.findUnique({
      where: { id },
      include: { events: true },
    });

    if (!category) {
      return NextResponse.json({ success: false, error: "Category not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, description, status, format, eligibility } = body;

    const data: any = {};
    if (name) data.name = String(name).trim();
    if (description !== undefined) data.description = description ? String(description).trim() : null;
    if (format) data.format = String(format);
    if (eligibility !== undefined) data.eligibility = eligibility ? String(eligibility).trim() : null;

    if (status) {
      const VALID_STATUSES = ["ACTIVE", "ARCHIVED", "DRAFT"];
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status '${status}'. Allowed: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      data.status = status;
    }

    const updated = await prisma.tournamentCategory.update({
      where: { id },
      data,
    });

    const action = status === "ARCHIVED" ? "CATEGORY_ARCHIVED" : "CATEGORY_UPDATED";
    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action,
      resourceType: "tournament_category",
      resourceId: updated.id,
      metadata: { code: updated.code, name: updated.name, status: updated.status },
    });

    return NextResponse.json({
      success: true,
      category: updated,
    });
  } catch (err: any) {
    console.error("Error in PATCH /api/tournament/categories/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
