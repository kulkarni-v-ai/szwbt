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

    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            "tournament.name",
            "tournament.shortName",
            "tournament.edition",
            "tournament.dates",
            "tournament.venue",
            "tournament.description",
            "tournament.status",
            "tournament.publicVisibility",
            "tournament.registrationStatus",
          ],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({
      success: true,
      settings: {
        name: settingsMap["tournament.name"] || "South Zone Inter-University Women's Badminton Championship 2026",
        shortName: settingsMap["tournament.shortName"] || "SZWBT 2026",
        edition: settingsMap["tournament.edition"] || "2026 Edition",
        dates: settingsMap["tournament.dates"] || "October 18 - 21, 2026",
        venue: settingsMap["tournament.venue"] || "KLE Technological University Indoor Stadium, Hubballi",
        description:
          settingsMap["tournament.description"] ||
          "Premier inter-university badminton tournament for women athletes across southern India under AIU.",
        status: settingsMap["tournament.status"] || "LIVE",
        publicVisibility: settingsMap["tournament.publicVisibility"] || "PUBLISHED",
        registrationStatus: settingsMap["tournament.registrationStatus"] || "CLOSED",
      },
      canConfigure: clearance.canConfigure,
    });
  } catch (err: any) {
    console.error("Error in GET /api/tournament/settings:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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

    if (!clearance.canConfigure) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to modify tournament settings." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, shortName, edition, dates, venue, description, status, publicVisibility, registrationStatus } = body;

    const updates: Array<{ key: string; value: string; desc: string }> = [];

    if (name) updates.push({ key: "tournament.name", value: String(name).trim(), desc: "Tournament full name" });
    if (shortName) updates.push({ key: "tournament.shortName", value: String(shortName).trim(), desc: "Short tournament code" });
    if (edition) updates.push({ key: "tournament.edition", value: String(edition).trim(), desc: "Championship edition" });
    if (dates) updates.push({ key: "tournament.dates", value: String(dates).trim(), desc: "Championship schedule dates" });
    if (venue) updates.push({ key: "tournament.venue", value: String(venue).trim(), desc: "Official stadium venue" });
    if (description) updates.push({ key: "tournament.description", value: String(description).trim(), desc: "Tournament description" });

    // Validate Status Transitions
    const VALID_STATUSES = ["DRAFT", "PREPARATION", "REGISTRATION_OPEN", "REGISTRATION_CLOSED", "SCHEDULED", "LIVE", "COMPLETED", "ARCHIVED"];
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid status '${status}'. Allowed statuses: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      updates.push({ key: "tournament.status", value: status, desc: "Tournament lifecycle status" });
    }

    const VALID_VISIBILITY = ["DRAFT", "PUBLISHED", "ARCHIVED"];
    if (publicVisibility) {
      if (!VALID_VISIBILITY.includes(publicVisibility)) {
        return NextResponse.json(
          { success: false, error: `Invalid visibility '${publicVisibility}'. Allowed: ${VALID_VISIBILITY.join(", ")}` },
          { status: 400 }
        );
      }
      updates.push({ key: "tournament.publicVisibility", value: publicVisibility, desc: "Public portal visibility" });
    }

    if (registrationStatus) {
      updates.push({ key: "tournament.registrationStatus", value: String(registrationStatus), desc: "Registration gate state" });
    }

    for (const u of updates) {
      await prisma.systemSetting.upsert({
        where: { key: u.key },
        update: {
          value: u.value,
          updatedBy: context.user.email,
        },
        create: {
          key: u.key,
          value: u.value,
          category: "TOURNAMENT",
          description: u.desc,
          updatedBy: context.user.email,
        },
      });
    }

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "TOURNAMENT_UPDATED",
      resourceType: "tournament",
      resourceId: "SETTINGS",
      metadata: { updatedFields: updates.map((u) => u.key) },
    });

    return NextResponse.json({
      success: true,
      message: "Tournament settings updated successfully.",
      updatedFields: updates.map((u) => u.key),
    });
  } catch (err: any) {
    console.error("Error in PATCH /api/tournament/settings:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
