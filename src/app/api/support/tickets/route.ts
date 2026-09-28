import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifySupportClearance } from "@/lib/support/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const assigned = searchParams.get("assigned");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }
    if (priority && priority !== "ALL") {
      where.priority = priority;
    }
    if (category && category !== "ALL") {
      where.category = category;
    }
    if (assigned) {
      if (assigned === "ME") {
        where.assignedAgentEmail = context.user.email;
      } else if (assigned === "UNASSIGNED") {
        where.assignedAgentEmail = null;
      } else if (assigned !== "ALL") {
        where.assignedAgentEmail = assigned;
      }
    }
    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { requesterEmail: { contains: q, mode: "insensitive" } },
        { requesterName: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
          escalations: {
            take: 1,
            orderBy: { createdAt: "desc" },
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
      tickets,
    });
  } catch (err: any) {
    console.error("Error in GET /api/support/tickets:", err);
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
    const supportAuth = verifySupportClearance(context);
    if (supportAuth.errorResponse) {
      return supportAuth.errorResponse;
    }

    if (!supportAuth.canCreate) {
      return NextResponse.json(
        { success: false, error: "403 Forbidden: Insufficient clearance to open support tickets." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      subject,
      description,
      requesterEmail,
      requesterName,
      requesterType = "PARTICIPANT",
      category = "GENERAL",
      subcategory,
      priority = "NORMAL",
      assignedAgentEmail,
      assignedAgentName,
      relatedResourceType,
      relatedResourceId,
    } = body;

    if (!subject || !subject.trim()) {
      return NextResponse.json({ success: false, error: "Subject is required." }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ success: false, error: "Description is required." }, { status: 400 });
    }

    // Zero transport payment enforcement: reject payment references for transport
    if (category === "TRANSPORT") {
      const lowerDesc = description.toLowerCase();
      const lowerSub = subject.toLowerCase();
      if (
        lowerDesc.includes("payment") ||
        lowerDesc.includes("upi") ||
        lowerDesc.includes("utr") ||
        lowerDesc.includes("fare") ||
        lowerSub.includes("payment")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "400 Bad Request: University transport is complimentary. Transport fees/payments do not exist.",
          },
          { status: 400 }
        );
      }
    }

    // Generate readable opaque ticket number
    const count = await prisma.supportTicket.count();
    const ticketNumber = `TKT-2026-${String(count + 1).padStart(3, "0")}`;

    const reqEmail = (requesterEmail || context.user.email).trim().toLowerCase();
    const reqName = requesterName || (requesterEmail === context.user.email ? context.user.name : "Tournament Requester");

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        subject: subject.trim(),
        description: description.trim(),
        requesterEmail: reqEmail,
        requesterName: reqName,
        requesterType,
        category,
        subcategory: subcategory || null,
        priority,
        status: assignedAgentEmail ? "ASSIGNED" : "OPEN",
        assignedAgentEmail: assignedAgentEmail || null,
        assignedAgentName: assignedAgentName || null,
        relatedResourceType: relatedResourceType || null,
        relatedResourceId: relatedResourceId || null,
        messages: {
          create: {
            senderEmail: reqEmail,
            senderName: reqName,
            senderType: "REQUESTER",
            messageType: "PUBLIC",
            content: description.trim(),
          },
        },
      },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "TICKET_CREATED",
      resourceType: "support",
      resourceId: ticket.id,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        requesterEmail: ticket.requesterEmail,
      },
    });

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (err: any) {
    console.error("Error in POST /api/support/tickets:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
