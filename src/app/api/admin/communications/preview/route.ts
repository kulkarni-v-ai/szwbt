import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyCommunicationsClearance } from "@/lib/communications/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const commAuth = verifyCommunicationsClearance(context);
    if (commAuth.errorResponse) {
      return commAuth.errorResponse;
    }

    const body = await req.json().catch(() => ({}));
    const { title, content, targetAudience = "ALL", channels = "IN_APP" } = body;

    // STRICT ZERO TRANSPORT PAYMENT RULE
    const textToCheck = `${title || ""} ${content || ""}`.toLowerCase();
    if (
      textToCheck.includes("transport") &&
      (textToCheck.includes("fee") ||
        textToCheck.includes("payment") ||
        textToCheck.includes("upi") ||
        textToCheck.includes("utr") ||
        textToCheck.includes("paid"))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Charter Violation: Championship transport is university-provided and complimentary. Payment requests or fees cannot be sent.",
        },
        { status: 400 }
      );
    }

    // Server-side audience resolution and recipient estimation
    let recipientCount = 0;
    const cleanAudience = String(targetAudience).trim().toUpperCase();

    if (cleanAudience === "ALL") {
      const [userCount, partCount] = await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.participant.count(),
      ]);
      recipientCount = userCount + partCount;
    } else if (cleanAudience === "PARTICIPANTS" || cleanAudience === "ALL_PARTICIPANTS") {
      recipientCount = await prisma.participant.count();
    } else if (cleanAudience === "TEAM_MANAGERS") {
      recipientCount = await prisma.user.count({
        where: { userRoles: { some: { role: { name: "TEAM_MANAGER" } } }, isActive: true },
      });
    } else if (cleanAudience === "VOLUNTEERS") {
      recipientCount = await prisma.user.count({
        where: { userRoles: { some: { role: { name: "VOLUNTEER" } } }, isActive: true },
      });
    } else if (cleanAudience === "MATCH_OFFICIALS") {
      recipientCount = await prisma.user.count({
        where: { userRoles: { some: { role: { name: "MATCH_OFFICIAL" } } }, isActive: true },
      });
    } else if (cleanAudience === "ORGANIZERS") {
      recipientCount = await prisma.user.count({
        where: { userRoles: { some: { role: { name: "ORGANIZER" } } }, isActive: true },
      });
    } else if (cleanAudience === "SUPPORT_STAFF") {
      recipientCount = await prisma.user.count({
        where: { userRoles: { some: { role: { name: "SUPPORT_STAFF" } } }, isActive: true },
      });
    } else {
      // Fallback count active users matching role or general
      recipientCount = await prisma.user.count({ where: { isActive: true } });
    }

    // Channel configurations
    const isEmailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

    const channelPreviews = {
      IN_APP: {
        channel: "IN_APP",
        status: "CONFIGURED",
        label: "In-App Notification Feed",
        preview: {
          title: title || "Tournament Announcement",
          body: content || "Message content preview...",
          badge: "OFFICIAL_SZWBT",
        },
      },
      EMAIL: {
        channel: "EMAIL",
        status: isEmailConfigured ? "CONFIGURED" : "NOT CONFIGURED",
        label: "Tournament Email Broadcast",
        preview: {
          subject: `[SZWBT 2026] ${title || "Tournament Notice"}`,
          bodyHtml: `<div style="font-family:sans-serif;padding:16px;background:#060608;color:#f5e6ca;"><h2>${title || "Notice"}</h2><p>${content || "Message..."}</p></div>`,
          sender: "noreply@szwbt2026.edu",
        },
      },
      SMS: {
        channel: "SMS",
        status: "NOT CONFIGURED",
        label: "SMS Gateway (Not Configured)",
        preview: {
          characterCount: (content || "").length,
          segments: Math.ceil(Math.max(1, (content || "").length) / 160),
          text: `[SZWBT 2026] ${content || ""}`.slice(0, 160),
        },
      },
      PUSH: {
        channel: "PUSH",
        status: "NOT CONFIGURED",
        label: "Mobile Push Gateway (Not Configured)",
        preview: {
          title: title || "SZWBT Alert",
          body: (content || "").slice(0, 100),
        },
      },
    };

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "COMMUNICATION_PREVIEWED",
      resourceType: "communication",
      resourceId: "PREVIEW",
      metadata: { audience: cleanAudience, recipientEstimate: recipientCount },
    });

    return NextResponse.json({
      success: true,
      targetAudience: cleanAudience,
      estimatedRecipientCount: recipientCount,
      estimatedRecipients: recipientCount,
      channelPreviews,
      channels: channelPreviews,
    });
  } catch (err: any) {
    console.error("Error in POST /api/admin/communications/preview:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
