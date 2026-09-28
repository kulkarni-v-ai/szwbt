import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyCommunicationsClearance } from "@/lib/communications/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const audience = searchParams.get("audience");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }
    if (category && category !== "ALL") {
      where.category = category;
    }
    if (priority && priority !== "ALL") {
      where.priority = priority;
    }
    if (audience && audience !== "ALL") {
      where.targetAudience = audience;
    }
    if (search && search.trim().length > 0) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { content: { contains: search.trim(), mode: "insensitive" } },
        { authorEmail: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [total, announcements] = await Promise.all([
      prisma.announcement.count({ where }),
      prisma.announcement.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          deliveries: {
            take: 10,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      announcements,
    });
  } catch (err: any) {
    console.error("Error in GET /api/admin/communications/announcements:", err);
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
    const commAuth = verifyCommunicationsClearance(context);
    if (commAuth.errorResponse) {
      return commAuth.errorResponse;
    }

    if (!commAuth.canCreate) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Clearance level does not allow drafting announcements." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      content,
      category = "GENERAL",
      priority = "NORMAL",
      targetAudience = "ALL",
      channels = "IN_APP",
      status = "PUBLISHED", // "DRAFT", "SCHEDULED", "PUBLISHED"
      scheduledFor,
      expiresAt,
      relatedResource,
      emergencyConfirmed = false,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: "Announcement title is required." }, { status: 400 });
    }
    if (!content || !content.trim()) {
      return NextResponse.json({ success: false, error: "Announcement message content is required." }, { status: 400 });
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
          error: "Charter Violation: Championship transport is university-provided and complimentary. Payment requests or fees cannot be sent.",
        },
        { status: 400 }
      );
    }

    // Emergency validation & confirmation requirement
    const isEmergency = priority === "EMERGENCY";
    if (isEmergency) {
      if (!commAuth.canEmergency) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Insufficient clearance to broadcast emergency notices." },
          { status: 403 }
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
    }

    // Publishing clearance
    const isPublishing = status === "PUBLISHED";
    if (isPublishing && !commAuth.canPublish) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Clearance level does not permit publishing live announcements." },
        { status: 403 }
      );
    }

    // Scheduling validation
    let scheduledDate: Date | null = null;
    if (status === "SCHEDULED") {
      if (!scheduledFor) {
        return NextResponse.json(
          { success: false, error: "Scheduled date/time is required for scheduled announcements." },
          { status: 400 }
        );
      }
      scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        return NextResponse.json(
          { success: false, error: "Scheduled date/time must be a valid future timestamp." },
          { status: 400 }
        );
      }
    }

    // Expiry date
    let expirationDate: Date | null = null;
    if (expiresAt) {
      expirationDate = new Date(expiresAt);
      if (isNaN(expirationDate.getTime())) {
        expirationDate = null;
      }
    }

    const authorEmail = context.user.email;
    const authorName = context.user.name || "Communications Desk";

    // Split channels
    const channelList = String(channels)
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => ["IN_APP", "EMAIL", "SMS", "PUSH"].includes(c));
    const cleanChannels = channelList.length > 0 ? channelList.join(",") : "IN_APP";

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        targetAudience,
        channels: cleanChannels,
        status,
        isPublished: isPublishing,
        publishedAt: isPublishing ? new Date() : null,
        scheduledFor: scheduledDate,
        expiresAt: expirationDate,
        authorEmail,
        authorName,
        relatedResource: relatedResource || null,
        deliveryStatus: isPublishing ? "SENT" : "PENDING",
        recipientCount: isPublishing ? (targetAudience === "ALL" ? 420 : 150) : 0,
      },
    });

    // Create delivery records for published announcements
    if (isPublishing) {
      const deliveriesData = channelList.map((ch) => ({
        announcementId: announcement.id,
        channel: ch,
        recipient: targetAudience,
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
    }

    // Audit log
    const auditAction = isEmergency
      ? "EMERGENCY_NOTICE_SENT"
      : isPublishing
      ? "ANNOUNCEMENT_PUBLISHED"
      : status === "SCHEDULED"
      ? "ANNOUNCEMENT_SCHEDULED"
      : "ANNOUNCEMENT_CREATED";

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: auditAction,
      resourceType: "announcement",
      resourceId: announcement.id,
      metadata: {
        title: announcement.title,
        priority: announcement.priority,
        category: announcement.category,
        audience: announcement.targetAudience,
        status: announcement.status,
        channels: announcement.channels,
      },
    });

    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (err: any) {
    console.error("Error in POST /api/admin/communications/announcements:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
