import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifySupportClearance } from "@/lib/support/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
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

    if (!supportAuth.canEscalate) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to escalate support tickets." },
        { status: 403 }
      );
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
    const { targetDepartment, escalationReason, priority = "HIGH" } = body;

    const validDepartments = [
      "REGISTRATION",
      "ACCOMMODATION",
      "TRANSPORT",
      "FINANCE",
      "MATCH_OPERATIONS",
      "TOURNAMENT_ADMIN",
      "SYSTEM_ADMIN",
    ];

    if (!targetDepartment || !validDepartments.includes(targetDepartment)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid targetDepartment. Must be one of: ${validDepartments.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!escalationReason || !escalationReason.trim()) {
      return NextResponse.json(
        { success: false, error: "Escalation reason is required." },
        { status: 400 }
      );
    }

    // Create escalation record
    const escalation = await prisma.supportEscalation.create({
      data: {
        ticketId: ticket.id,
        targetDepartment,
        escalationReason: escalationReason.trim(),
        priority,
        escalatedBy: context.user.email,
        status: "OPEN",
      },
    });

    // Update ticket state to ESCALATED
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: "ESCALATED",
        updatedAt: new Date(),
      },
    });

    // Add internal note
    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderEmail: context.user.email,
        senderName: context.user.name || "Support Lead",
        senderType: "SUPPORT_AGENT",
        messageType: "INTERNAL_NOTE",
        content: `ESCALATED TO ${targetDepartment}: ${escalationReason.trim()} [Priority: ${priority}]`,
      },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "TICKET_ESCALATED",
      resourceType: "support",
      resourceId: ticket.id,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        targetDepartment,
        priority,
      },
    });

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      escalation,
    });
  } catch (err: any) {
    console.error("Error in POST /api/support/tickets/[id]/escalate:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
