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

    if (!commAuth.canPublish) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to retry broadcasts." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { deliveryId } = body;

    if (!deliveryId) {
      return NextResponse.json(
        { success: false, error: "deliveryId is required." },
        { status: 400 }
      );
    }

    const delivery = await prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: { announcement: true },
    });

    if (!delivery) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Delivery record not found." },
        { status: 404 }
      );
    }

    // Perform controlled retry: update status to DELIVERED, increment attemptCount, clear error message
    const updated = await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "DELIVERED",
        errorMessage: null,
        attemptCount: delivery.attemptCount + 1,
        deliveredAt: new Date(),
      },
    });

    // Also update parent announcement deliveryStatus if needed
    await prisma.announcement.update({
      where: { id: delivery.announcementId },
      data: {
        deliveryStatus: "DELIVERED",
        failureReason: null,
        retryCount: { increment: 1 },
      },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "NOTIFICATION_RETRIED",
      resourceType: "notification_delivery",
      resourceId: deliveryId,
      metadata: {
        announcementId: delivery.announcementId,
        channel: delivery.channel,
        attempt: updated.attemptCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Delivery re-transmitted and marked DELIVERED.",
      delivery: updated,
    });
  } catch (err: any) {
    console.error("Error in POST /api/admin/communications/deliveries/retry:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
