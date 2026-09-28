import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyCommunicationsClearance } from "@/lib/communications/auth";
import { prisma } from "@/lib/prisma";

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

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. Query announcement metrics
    const [
      totalAnnouncements,
      publishedCount,
      draftCount,
      scheduledCount,
      failedDeliveriesCount,
      urgentCount,
      publishedTodayCount,
      activeDeliveriesCount,
      emergencyMessagesCount,
      activeUrgentAnnouncements,
      upcomingScheduled,
      recentDrafts,
      templates,
      recentDeliveries,
      recentActivityLogs,
    ] = await Promise.all([
      prisma.announcement.count(),
      prisma.announcement.count({ where: { status: "PUBLISHED" } }),
      prisma.announcement.count({ where: { status: "DRAFT" } }),
      prisma.announcement.count({ where: { status: "SCHEDULED" } }),
      prisma.notificationDelivery.count({ where: { status: "FAILED" } }),
      prisma.announcement.count({
        where: {
          status: "PUBLISHED",
          priority: { in: ["HIGH", "URGENT", "EMERGENCY"] },
        },
      }),
      prisma.announcement.count({
        where: {
          status: "PUBLISHED",
          publishedAt: { gte: startOfToday },
        },
      }),
      prisma.notificationDelivery.count({
        where: {
          status: { in: ["PENDING", "PROCESSING", "QUEUED"] },
        },
      }),
      prisma.announcement.count({
        where: {
          priority: "EMERGENCY",
        },
      }),
      // Active urgent announcements
      prisma.announcement.findMany({
        where: {
          status: "PUBLISHED",
          priority: { in: ["HIGH", "URGENT", "EMERGENCY"] },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Upcoming scheduled
      prisma.announcement.findMany({
        where: { status: "SCHEDULED" },
        orderBy: { scheduledFor: "asc" },
        take: 5,
      }),
      // Recent drafts
      prisma.announcement.findMany({
        where: { status: "DRAFT" },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      // Templates
      prisma.communicationTemplate.findMany({
        orderBy: { name: "asc" },
      }),
      // Deliveries summary
      prisma.notificationDelivery.groupBy({
        by: ["channel", "status"],
        _count: { _all: true },
      }),
      // Recent audit activity
      prisma.auditLog.findMany({
        where: { resourceType: "announcement" },
        orderBy: { timestamp: "desc" },
        take: 10,
      }),
    ]);

    // Format channel delivery stats
    const channelStats: Record<string, { total: number; delivered: number; failed: number; pending: number }> = {
      IN_APP: { total: 0, delivered: 0, failed: 0, pending: 0 },
      EMAIL: { total: 0, delivered: 0, failed: 0, pending: 0 },
      SMS: { total: 0, delivered: 0, failed: 0, pending: 0 },
      PUSH: { total: 0, delivered: 0, failed: 0, pending: 0 },
    };

    for (const group of recentDeliveries) {
      const ch = group.channel.toUpperCase();
      if (!channelStats[ch]) {
        channelStats[ch] = { total: 0, delivered: 0, failed: 0, pending: 0 };
      }
      const count = group._count._all;
      channelStats[ch].total += count;
      if (group.status === "DELIVERED" || group.status === "SENT") {
        channelStats[ch].delivered += count;
      } else if (group.status === "FAILED" || group.status === "BOUNCED") {
        channelStats[ch].failed += count;
      } else {
        channelStats[ch].pending += count;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      permissions: {
        canCreate: commAuth.canCreate,
        canPublish: commAuth.canPublish,
        canEmergency: commAuth.canEmergency,
      },
      summary: {
        totalAnnouncements,
        publishedCount,
        draftCount,
        scheduledCount,
        failedDeliveriesCount,
        urgentCount,
        publishedTodayCount,
        activeDeliveriesCount,
        emergencyMessagesCount,
      },
      activeUrgentAnnouncements,
      upcomingScheduled,
      recentDrafts,
      templates,
      channelStats,
      recentActivity: recentActivityLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorEmail: log.actorEmail,
        resourceId: log.resourceId,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        timestamp: log.timestamp,
      })),
    });
  } catch (err: any) {
    console.error("Error in GET /api/admin/communications:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
