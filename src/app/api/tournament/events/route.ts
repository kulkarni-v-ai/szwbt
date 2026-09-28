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

    const events = await prisma.tournamentEvent.findMany({
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
        rounds: {
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      events,
      canManage: clearance.canManageCategories,
    });
  } catch (err: any) {
    console.error("Error in GET /api/tournament/events:", err);
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
        { success: false, error: "403 Forbidden: Insufficient clearance to create tournament event." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { categoryId, name, code, format, maxEntries, seedCount } = body;

    if (!categoryId || !name || !code) {
      return NextResponse.json(
        { success: false, error: "Validation failed: 'categoryId', 'name', and 'code' are required." },
        { status: 400 }
      );
    }

    const category = await prisma.tournamentCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Parent category not found." },
        { status: 404 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await prisma.tournamentEvent.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Event code '${cleanCode}' already exists.` },
        { status: 400 }
      );
    }

    const event = await prisma.tournamentEvent.create({
      data: {
        categoryId,
        name: String(name).trim(),
        code: cleanCode,
        format: format || "KNOCKOUT",
        maxEntries: Number(maxEntries) || 64,
        seedCount: Number(seedCount) || 8,
        status: "OPEN",
      },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "EVENT_CREATED",
      resourceType: "tournament_event",
      resourceId: event.id,
      metadata: { code: event.code, name: event.name },
    });

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (err: any) {
    console.error("Error in POST /api/tournament/events:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
