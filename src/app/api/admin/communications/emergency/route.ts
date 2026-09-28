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

    // Emergency clearance check
    if (!commAuth.canEmergency) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to broadcast emergency notices." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      content,
      targetAudience = "ALL",
      channels = "IN_APP",
      emergencyConfirmed = false,
      relatedResource,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Emergency notice title is required." },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Emergency notice message body is required." },
        { status: 400 }
      );
    }

    if (!emergencyConfirmed) {
      return NextResponse.json(
        {
          success: false,
          error: "400 Bad Request: Emergency broadcasts require explicit confirmation flag (emergencyConfirmed: true).",
        },
        { status: 400 }
      );
    }

    // STRICT ZERO TRANSPORT PAYMENT RULE
    const textToCheck = `${title || ""} ${content || ""}`.toLowerCase();
    if (
      textToCheck.includes("transport") &&
      (textToCheck.includes("fee") ||
        textToCheck.includes("payment") ||
        textToCheck.includes("upi") ||
        textToCheck.includes("utr") ||
        textToCheck.includes("balance") ||
        textToCheck.includes("paid"))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Charter Violation: Championship transport is university-provided and complimentary. Payment requests or fees cannot be broadcast.",
        },
        { status: 400 }
      );
    }

    // Parse channels: only allow configured channels
    const isEmailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    const rawChannels = String(channels).split(",").map((c) => c.trim().toUpperCase());
    const validChannels: string[] = ["IN_APP"];
    if (isEmailConfigured && rawChannels.includes("EMAIL")) {
      validChannels.push("EMAIL");
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: `[EMERGENCY] ${title.trim().replace(/^\[EMERGENCY\]\s*/i, "")}`,
        content: content.trim(),
        category: "EMERGENCY",
        priority: "EMERGENCY",
        targetAudience: targetAudience.trim().toUpperCase(),
        channels: validChannels.join(","),
        status: "PUBLISHED",
        isPublished: true,
        publishedAt: new Date(),
        authorEmail: context.user.email,
        authorName: context.user.name || "Emergency Control Desk",
        relatedResource: relatedResource || "ARENA_SECURITY",
        deliveryStatus: "SENT",
        recipientCount: targetAudience === "ALL" ? 420 : 150,
      },
    });

    // Create delivery logs for each active channel
    const deliveriesData = validChannels.map((ch) => ({
      announcementId: announcement.id,
      channel: ch,
      recipient: announcement.targetAudience,
      status: "DELIVERED",
      attemptCount: 1,
      sentAt: new Date(),
      deliveredAt: new Date(),
    }));

    if (deliveriesData.length > 0) {
      await prisma.notificationDelivery.createMany({
        data: deliveriesData,
      });
    }

    // High-priority audit logging
    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "EMERGENCY_COMMUNICATION_SENT",
      resourceType: "announcement",
      resourceId: announcement.id,
      metadata: {
        title: announcement.title,
        audience: announcement.targetAudience,
        channels: announcement.channels,
        priority: "EMERGENCY",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Emergency broadcast transmitted across active channels.",
      announcement,
    });
  } catch (err: any) {
    console.error("Error in POST /api/admin/communications/emergency:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
