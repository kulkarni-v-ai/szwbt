import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOrganizerClearance } from "@/lib/organizer/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const orgAuth = verifyOrganizerClearance(context);
    if (orgAuth.errorResponse) {
      return orgAuth.errorResponse;
    }

    // Query safe operational audit entries
    const safeResourceTypes = [
      "registration",
      "participant",
      "team",
      "accommodation",
      "transport",
      "match",
      "announcement",
      "support",
    ];

    const logs = await prisma.auditLog.findMany({
      where: {
        resourceType: { in: safeResourceTypes },
      },
      orderBy: { timestamp: "desc" },
      take: 20,
    });

    const activities = logs.map((log) => ({
      id: log.id,
      action: log.action.replace(/_/g, " "),
      module: log.resourceType.toUpperCase(),
      actor: log.actorEmail.split("@")[0],
      timestamp: log.timestamp,
    }));

    return NextResponse.json({
      success: true,
      activities,
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer/activity:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
