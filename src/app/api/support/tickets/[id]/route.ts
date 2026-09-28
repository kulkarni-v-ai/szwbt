import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifySupportClearance } from "@/lib/support/auth";
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
    const { id } = await params;

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        OR: [{ id }, { ticketNumber: id }],
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        escalations: {
          orderBy: { createdAt: "desc" },
        },
        attachments: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Support case not found." },
        { status: 404 }
      );
    }

    // Authorization & Privacy Gate
    const supportAuth = verifySupportClearance(context);
    const isOwner = ticket.requesterEmail.toLowerCase() === context.user.email.toLowerCase();

    if (!supportAuth.authorized && !isOwner) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to view this support ticket." },
        { status: 403 }
      );
    }

    // Filter messages: If user is requester and NOT support staff, hide INTERNAL_NOTE messages!
    let visibleMessages = ticket.messages;
    if (!supportAuth.isSupportStaff && isOwner) {
      visibleMessages = ticket.messages.filter((m) => m.messageType === "PUBLIC");
    }

    // Fetch related audit trail
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        resourceType: "support",
        resourceId: ticket.id,
      },
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      ticket: {
        ...ticket,
        messages: visibleMessages,
      },
      activity: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorEmail: log.actorEmail,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
        timestamp: log.timestamp,
      })),
    });
  } catch (err: any) {
    console.error("Error in GET /api/support/tickets/[id]:", err);
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
    const supportAuth = verifySupportClearance(context);
    if (supportAuth.errorResponse) {
      return supportAuth.errorResponse;
    }

    const { id } = await params;
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        OR: [{ id }, { ticketNumber: id }],
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Support case not found." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action, assignedAgentEmail, assignedAgentName, status, priority, resolutionNotes } = body;

    // Handle distinct actions
    if (action === "ASSIGN") {
      if (!supportAuth.canAssign) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Insufficient clearance to assign tickets." },
          { status: 403 }
        );
      }

      if (!assignedAgentEmail) {
        return NextResponse.json(
          { success: false, error: "assignedAgentEmail is required." },
          { status: 400 }
        );
      }

      // Authoritative verification: Agent must exist and have support or admin role
      const agentUser = await prisma.user.findUnique({
        where: { email: assignedAgentEmail.toLowerCase().trim() },
        include: { userRoles: { include: { role: true } } },
      });

      if (!agentUser) {
        return NextResponse.json(
          { success: false, error: "400 Bad Request: Assigned agent does not exist in championship directory." },
          { status: 400 }
        );
      }

      const isEligible = agentUser.userRoles.some((ur) =>
        ["SUPPORT_STAFF", "SUPER_ADMIN", "TOURNAMENT_ADMIN"].includes(ur.role.name)
      );

      if (!isEligible) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: User is not authorized to act as support responder." },
          { status: 403 }
        );
      }

      const updated = await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          assignedAgentEmail: agentUser.email,
          assignedAgentName: assignedAgentName || agentUser.name,
          status: ticket.status === "OPEN" ? "ASSIGNED" : ticket.status,
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: ticket.assignedAgentEmail ? "TICKET_REASSIGNED" : "TICKET_ASSIGNED",
        resourceType: "support",
        resourceId: ticket.id,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          assignedTo: agentUser.email,
        },
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    if (action === "RESOLVE") {
      if (!supportAuth.canResolve) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Insufficient clearance to resolve tickets." },
          { status: 403 }
        );
      }

      if (!resolutionNotes || !resolutionNotes.trim()) {
        return NextResponse.json(
          { success: false, error: "Resolution notes are required to resolve a ticket." },
          { status: 400 }
        );
      }

      const updated = await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: "RESOLVED",
          resolutionNotes: resolutionNotes.trim(),
          resolvedAt: new Date(),
        },
      });

      // Append system message
      await prisma.supportMessage.create({
        data: {
          ticketId: ticket.id,
          senderEmail: context.user.email,
          senderName: context.user.name || "Support Desk",
          senderType: "SUPPORT_AGENT",
          messageType: "PUBLIC",
          content: `CASE RESOLVED: ${resolutionNotes.trim()}`,
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "TICKET_RESOLVED",
        resourceType: "support",
        resourceId: ticket.id,
        metadata: {
          ticketNumber: ticket.ticketNumber,
          notes: resolutionNotes.trim(),
        },
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    if (action === "REOPEN") {
      const updated = await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: "OPEN",
          resolvedAt: null,
          closedAt: null,
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "TICKET_REOPENED",
        resourceType: "support",
        resourceId: ticket.id,
        metadata: { ticketNumber: ticket.ticketNumber },
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    if (action === "CLOSE") {
      if (!supportAuth.canClose) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Insufficient clearance to close tickets." },
          { status: 403 }
        );
      }

      const updated = await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
        },
      });

      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "TICKET_CLOSED",
        resourceType: "support",
        resourceId: ticket.id,
        metadata: { ticketNumber: ticket.ticketNumber },
      });

      return NextResponse.json({ success: true, ticket: updated });
    }

    // General field updates (status, priority)
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: updateData,
    });

    if (priority !== undefined && priority !== ticket.priority) {
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "TICKET_PRIORITY_CHANGED",
        resourceType: "support",
        resourceId: ticket.id,
        metadata: { from: ticket.priority, to: priority },
      });
    }

    if (status !== undefined && status !== ticket.status) {
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "TICKET_STATUS_CHANGED",
        resourceType: "support",
        resourceId: ticket.id,
        metadata: { from: ticket.status, to: status },
      });
    }

    return NextResponse.json({ success: true, ticket: updated });
  } catch (err: any) {
    console.error("Error in PATCH /api/support/tickets/[id]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
