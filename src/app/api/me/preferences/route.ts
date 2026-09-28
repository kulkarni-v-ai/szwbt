import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/rbac/guard";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/me/preferences
 * Returns the authenticated user's notification & communication settings.
 */
export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const userId = authResult.context.user.id;

  try {
    let preference = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      preference = await prisma.userPreference.create({
        data: {
          userId,
          tournamentAnnounce: true,
          matchUpdates: true,
          accommodationUpdates: true,
          transportUpdates: true,
          supportUpdates: true,
          systemNotifications: true,
          channelInApp: true,
          channelEmail: true,
          channelSms: false,
          channelPush: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        tournamentAnnounce: preference.tournamentAnnounce,
        matchUpdates: preference.matchUpdates,
        accommodationUpdates: preference.accommodationUpdates,
        transportUpdates: preference.transportUpdates,
        supportUpdates: preference.supportUpdates,
        systemNotifications: true, // Always required
        channelInApp: preference.channelInApp,
        channelEmail: preference.channelEmail,
        channelSms: preference.channelSms,
        channelPush: preference.channelPush,
        updatedAt: preference.updatedAt,
      },
      channels: [
        { id: "IN_APP", name: "In-App HUD Alerts", status: "CONFIGURED", active: preference.channelInApp },
        { id: "EMAIL", name: "Official Email Notifications", status: "CONFIGURED", active: preference.channelEmail },
        { id: "SMS", name: "SMS Gateway Dispatch", status: "NOT_CONFIGURED", active: false },
        { id: "PUSH", name: "Browser Push Alerts", status: "NOT_CONFIGURED", active: false },
      ],
    });
  } catch (error: any) {
    console.error("[PREFERENCES GET ERROR]", error);
    return NextResponse.json(
      { success: false, error: "500 Internal Server Error: Failed to load preferences." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/me/preferences
 * Allows authenticated user to update their own optional notification preferences.
 * System-critical notifications cannot be disabled.
 */
export async function PATCH(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.authenticated) {
    return authResult.response;
  }

  const { context } = authResult;
  const userId = context.user.id;

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "400 Bad Request: Malformed JSON." },
        { status: 400 }
      );
    }

    // System notifications must never be disabled
    if (body.systemNotifications === false) {
      return NextResponse.json(
        {
          success: false,
          error: "400 Bad Request: System notifications are required for tournament compliance and cannot be disabled.",
        },
        { status: 400 }
      );
    }

    const updates: {
      tournamentAnnounce?: boolean;
      matchUpdates?: boolean;
      accommodationUpdates?: boolean;
      transportUpdates?: boolean;
      supportUpdates?: boolean;
      channelInApp?: boolean;
      channelEmail?: boolean;
    } = {};

    if (typeof body.tournamentAnnounce === "boolean") updates.tournamentAnnounce = body.tournamentAnnounce;
    if (typeof body.matchUpdates === "boolean") updates.matchUpdates = body.matchUpdates;
    if (typeof body.accommodationUpdates === "boolean") updates.accommodationUpdates = body.accommodationUpdates;
    if (typeof body.transportUpdates === "boolean") updates.transportUpdates = body.transportUpdates;
    if (typeof body.supportUpdates === "boolean") updates.supportUpdates = body.supportUpdates;
    if (typeof body.channelInApp === "boolean") updates.channelInApp = body.channelInApp;
    if (typeof body.channelEmail === "boolean") updates.channelEmail = body.channelEmail;

    const preference = await prisma.userPreference.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        tournamentAnnounce: updates.tournamentAnnounce ?? true,
        matchUpdates: updates.matchUpdates ?? true,
        accommodationUpdates: updates.accommodationUpdates ?? true,
        transportUpdates: updates.transportUpdates ?? true,
        supportUpdates: updates.supportUpdates ?? true,
        systemNotifications: true,
        channelInApp: updates.channelInApp ?? true,
        channelEmail: updates.channelEmail ?? true,
        channelSms: false,
        channelPush: false,
      },
    });

    await logAuditEvent({
      actorUserId: userId,
      actorEmail: context.user.email,
      action: "NOTIFICATION_PREFERENCES_UPDATED",
      resourceType: "preferences",
      resourceId: preference.id,
      metadata: updates,
    });

    return NextResponse.json({
      success: true,
      message: "Notification preferences updated successfully.",
      preferences: {
        tournamentAnnounce: preference.tournamentAnnounce,
        matchUpdates: preference.matchUpdates,
        accommodationUpdates: preference.accommodationUpdates,
        transportUpdates: preference.transportUpdates,
        supportUpdates: preference.supportUpdates,
        systemNotifications: true,
        channelInApp: preference.channelInApp,
        channelEmail: preference.channelEmail,
        channelSms: preference.channelSms,
        channelPush: preference.channelPush,
        updatedAt: preference.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[PREFERENCES PATCH ERROR]", error);
    return NextResponse.json(
      { success: false, error: "500 Internal Server Error: Failed to update preferences." },
      { status: 500 }
    );
  }
}
