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

    const supportAuth = verifySupportClearance(context);
    const isOwner = ticket.requesterEmail.toLowerCase() === context.user.email.toLowerCase();

    if (!supportAuth.authorized && !isOwner) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to post messages on this ticket." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { content, messageType = "PUBLIC" } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    // Requester security: Only support staff can author INTERNAL_NOTE
    let effectiveType = messageType;
    if (!supportAuth.isSupportStaff) {
      effectiveType = "PUBLIC";
    }

    const senderType = supportAuth.isSupportStaff ? "SUPPORT_AGENT" : "REQUESTER";
    const senderName = context.user.name || (supportAuth.isSupportStaff ? "Support Specialist" : "Requester");

    const message = await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderEmail: context.user.email,
        senderName,
        senderType,
        messageType: effectiveType,
        content: content.trim(),
      },
    });

    // Update ticket status if appropriate: if requester replied, mark "IN_PROGRESS"; if agent replied, mark "WAITING_FOR_REQUESTER"
    if (effectiveType === "PUBLIC" && ticket.status !== "CLOSED") {
      const nextStatus = supportAuth.isSupportStaff ? "WAITING_FOR_REQUESTER" : "IN_PROGRESS";
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          status: nextStatus,
          updatedAt: new Date(),
        },
      });
    }

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: effectiveType === "INTERNAL_NOTE" ? "INTERNAL_NOTE_ADDED" : "TICKET_RESPONSE_ADDED",
      resourceType: "support",
      resourceId: ticket.id,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        messageType: effectiveType,
      },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (err: any) {
    console.error("Error in POST /api/support/tickets/[id]/messages:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
