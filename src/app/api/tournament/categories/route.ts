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

    const categories = await prisma.tournamentCategory.findMany({
      include: {
        events: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            format: true,
            maxEntries: true,
            seedCount: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        description: c.description,
        status: c.status,
        format: c.format,
        eligibility: c.eligibility,
        eventsCount: c.events.length,
        events: c.events,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      canManage: clearance.canManageCategories,
    });
  } catch (err: any) {
    console.error("Error in GET /api/tournament/categories:", err);
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
        { success: false, error: "403 Forbidden: Insufficient clearance to create tournament category." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, code, description, format, eligibility } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: "Validation failed: 'name' and 'code' are required fields." },
        { status: 400 }
      );
    }

    const cleanCode = String(code).trim().toUpperCase();
    const existing = await prisma.tournamentCategory.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `Category code '${cleanCode}' is already in use.` },
        { status: 400 }
      );
    }

    const category = await prisma.tournamentCategory.create({
      data: {
        name: String(name).trim(),
        code: cleanCode,
        description: description ? String(description).trim() : null,
        format: format || "KNOCKOUT",
        eligibility: eligibility ? String(eligibility).trim() : null,
        status: "ACTIVE",
      },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "CATEGORY_CREATED",
      resourceType: "tournament_category",
      resourceId: category.id,
      metadata: { code: category.code, name: category.name },
    });

    return NextResponse.json({
      success: true,
      category,
    });
  } catch (err: any) {
    console.error("Error in POST /api/tournament/categories:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
