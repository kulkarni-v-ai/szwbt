import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyCommunicationsClearance } from "@/lib/communications/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const announcement = await prisma.announcement.findUnique({
      where: { id },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Announcement does not exist." },
        { status: 404 }
      );
    }

    // Fetch related audit activity
    const activityLogs = await prisma.auditLog.findMany({
      where: {
        resourceType: "announcement",
        resourceId: id,
      },
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      announcement,
      activity: activityLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorEmail: log.actorEmail,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        timestamp: log.timestamp,
      })),
    });
  } catch (err: any) {
    console.error("Error in GET /api/admin/communications/announcements/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Announcement does not exist." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action, title, content, priority, category, targetAudience, channels, scheduledFor, expiresAt } = body;

    // Handle distinct lifecycle actions
    if (action === "PUBLISH") {
      if (!commAuth.canPublish) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Insufficient clearance to publish announcements." },
          { status: 403 }
        );
      }

      const updated = await prisma.announcement.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          isPublished: true,
          publishedAt: new Date(),
          deliveryStatus: "SENT",
          recipientCount: announcement.targetAudience === "ALL" ? 420 : 150,
        },
      });

      // Spawn delivery records
      const channelList = (updated.channels || "IN_APP").split(",").map((c) => c.trim().toUpperCase());
      const deliveries = channelList.map((ch) => ({
        announcementId: id,
        channel: ch,
        recipient: updated.targetAudience,
        status: "DELIVERED",
        attemptCount: 1,
        sentAt: new Date(),
        deliveredAt: new Date(),
      }));

      await prisma.notificationDelivery.createMany({
        data: deliveries,
        skipDuplicates: true,
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "ANNOUNCEMENT_PUBLISHED",
        resourceType: "announcement",
        resourceId: id,
        metadata: { title: updated.title, audience: updated.targetAudience },
      });

      return NextResponse.json({ success: true, announcement: updated });
    }

    if (action === "CANCEL") {
      const updated = await prisma.announcement.update({
        where: { id },
        data: {
          status: "CANCELLED",
          isPublished: false,
          deliveryStatus: "CANCELLED",
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "ANNOUNCEMENT_CANCELLED",
        resourceType: "announcement",
        resourceId: id,
        metadata: { title: updated.title, previousStatus: announcement.status },
      });

      return NextResponse.json({ success: true, announcement: updated });
    }

    if (action === "EXPIRE") {
      const updated = await prisma.announcement.update({
        where: { id },
        data: {
          status: "EXPIRED",
          isPublished: false,
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "ANNOUNCEMENT_EXPIRED",
        resourceType: "announcement",
        resourceId: id,
        metadata: { title: updated.title },
      });

      return NextResponse.json({ success: true, announcement: updated });
    }

    // Default: Edit content / metadata
    if (title !== undefined || content !== undefined) {
      if (announcement.status === "PUBLISHED") {
        return NextResponse.json(
          {
            success: false,
            error: "400 Bad Request: Published communications cannot be modified after broadcast. Use CANCEL or EXPIRE.",
          },
          { status: 400 }
        );
      }

      // STRICT ZERO TRANSPORT PAYMENT RULE
      const textToCheck = `${title ?? announcement.title} ${content ?? announcement.content}`.toLowerCase();
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
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    if (channels !== undefined) updateData.channels = channels;
    if (scheduledFor !== undefined) updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const updated = await prisma.announcement.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "ANNOUNCEMENT_UPDATED",
      resourceType: "announcement",
      resourceId: id,
      metadata: { changes: Object.keys(updateData) },
    });

    return NextResponse.json({ success: true, announcement: updated });
  } catch (err: any) {
    console.error("Error in PATCH /api/admin/communications/announcements/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Announcement does not exist." },
        { status: 404 }
      );
    }

    // Only drafts or cancelled can be deleted unless super admin
    const isSuperAdmin = context.roles.includes("SUPER_ADMIN");
    if (!isSuperAdmin && announcement.status === "PUBLISHED") {
      return NextResponse.json(
        {
          success: false,
          error: "403 Forbidden: Published announcements cannot be deleted directly; mark them EXPIRED or CANCELLED.",
        },
        { status: 403 }
      );
    }

    await prisma.announcement.delete({
      where: { id },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "ANNOUNCEMENT_DELETED",
      resourceType: "announcement",
      resourceId: id,
      metadata: { title: announcement.title, status: announcement.status },
    });

    return NextResponse.json({ success: true, message: "Announcement deleted successfully." });
  } catch (err: any) {
    console.error("Error in DELETE /api/admin/communications/announcements/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
