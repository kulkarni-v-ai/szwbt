import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifySupportClearance } from "@/lib/support/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const supportAuth = verifySupportClearance(context);
    if (supportAuth.errorResponse) {
      return supportAuth.errorResponse;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Parallel KPI Counts
    const [
      totalTickets,
      openTickets,
      unassignedTickets,
      inProgressTickets,
      waitingTickets,
      escalatedTickets,
      resolvedToday,
      closedToday,
      priorityQueue,
      myAssignedTickets,
      recentActivityLogs,
      knowledgeArticles,
      supportAgents,
    ] = await Promise.all([
      prisma.supportTicket.count(),
      prisma.supportTicket.count({
        where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "ESCALATED"] } },
      }),
      prisma.supportTicket.count({
        where: { assignedAgentEmail: null, status: "OPEN" },
      }),
      prisma.supportTicket.count({
        where: { status: "IN_PROGRESS" },
      }),
      prisma.supportTicket.count({
        where: { status: "WAITING_FOR_REQUESTER" },
      }),
      prisma.supportTicket.count({
        where: { status: "ESCALATED" },
      }),
      prisma.supportTicket.count({
        where: {
          status: "RESOLVED",
          resolvedAt: { gte: todayStart },
        },
      }),
      prisma.supportTicket.count({
        where: {
          status: "CLOSED",
          closedAt: { gte: todayStart },
        },
      }),
      // Priority queue: URGENT & HIGH priority tickets that are not closed
      prisma.supportTicket.findMany({
        where: {
          priority: { in: ["HIGH", "URGENT"] },
          status: { notIn: ["RESOLVED", "CLOSED"] },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 6,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      // My assigned tickets
      prisma.supportTicket.findMany({
        where: {
          assignedAgentEmail: context.user.email,
          status: { notIn: ["RESOLVED", "CLOSED"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      // Recent audit activity for support
      prisma.auditLog.findMany({
        where: { resourceType: "support" },
        orderBy: { timestamp: "desc" },
        take: 10,
      }),
      // Knowledge articles
      prisma.supportKnowledgeArticle.findMany({
        where: { isPublished: true },
        take: 5,
        orderBy: { viewCount: "desc" },
      }),
      // Available agents with SUPPORT_STAFF or SUPER_ADMIN
      prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                name: { in: ["SUPPORT_STAFF", "SUPER_ADMIN"] },
              },
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          badge: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      permissions: {
        canCreate: supportAuth.canCreate,
        canUpdate: supportAuth.canUpdate,
        canAssign: supportAuth.canAssign,
        canResolve: supportAuth.canResolve,
        canClose: supportAuth.canClose,
        canEscalate: supportAuth.canEscalate,
        canComment: supportAuth.canComment,
      },
      summary: {
        totalTickets,
        openTickets,
        unassignedTickets,
        inProgressTickets,
        waitingTickets,
        escalatedTickets,
        resolvedToday,
        closedToday,
      },
      priorityQueue,
      myAssignedTickets,
      supportAgents,
      knowledgeArticles,
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
    console.error("Error in GET /api/support:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
