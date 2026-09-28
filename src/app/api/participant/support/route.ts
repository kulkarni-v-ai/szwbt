import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthenticatedParticipant } from "@/lib/participant/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const partAuth = await resolveAuthenticatedParticipant(req, context);
    if (partAuth.errorResponse) {
      return partAuth.errorResponse;
    }

    const { participant } = partAuth;
    if (!participant) {
      return NextResponse.json({
        success: true,
        tickets: [],
        message: "No athlete record linked.",
      });
    }

    // STRICT RESOURCE PRIVACY: Query only support logs belonging to this specific participant
    const supportLogs = await prisma.auditLog.findMany({
      where: {
        resourceType: "support",
        resourceId: participant.id,
        action: "SUPPORT_TICKET_SUBMITTED",
      },
      orderBy: { timestamp: "desc" },
    });

    const tickets = supportLogs.map((log) => {
      let meta: any = {};
      try {
        meta = log.metadata ? JSON.parse(log.metadata) : {};
      } catch {
        meta = {};
      }
      return {
        id: meta.ticketId || log.id.slice(-8).toUpperCase(),
        subject: meta.subject || "Support Inquiry",
        category: meta.category || "GENERAL",
        priority: meta.priority || "NORMAL",
        status: meta.status || "OPEN",
        createdAt: log.timestamp,
        message: meta.message || "",
      };
    });

    // Official helpdesk contact channels
    const contactChannels = [
      {
        channel: "Registration & Accreditation Desk",
        location: "Main Badminton Arena South Wing Concourse",
        email: "registration@szwbt2026.edu",
        hours: "07:30 IST – 20:00 IST",
      },
      {
        channel: "Hostel & Accommodation Logistics",
        location: "Shalmala & Vindhya Hostels Front Reception",
        email: "hostel@szwbt2026.edu",
        hours: "24/7 Operations",
      },
      {
        channel: "Fleet Transport Dispatch",
        location: "Arena Bus Bay East Gate",
        email: "transport@szwbt2026.edu",
        hours: "06:00 IST – 22:30 IST",
      },
      {
        channel: "Technical Official & Match Desk",
        location: "Court 01 Technical Control Station",
        email: "referee@szwbt2026.edu",
        hours: "During Active Match Sessions",
      },
    ];

    return NextResponse.json({
      success: true,
      tickets,
      contactChannels,
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/support:", err);
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
    const partAuth = await resolveAuthenticatedParticipant(req, context);
    if (partAuth.errorResponse) {
      return partAuth.errorResponse;
    }

    const { participant } = partAuth;
    if (!participant) {
      return NextResponse.json(
        { success: false, error: "No athlete record linked." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { subject, category, message, priority } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { success: false, error: "Subject and message are required." },
        { status: 400 }
      );
    }

    const ticketId = `TKT-${Date.now().toString(36).toUpperCase().slice(-5)}`;

    // Store in audit logs securely tied to participant.id
    const log = await prisma.auditLog.create({
      data: {
        actorEmail: context.user.email,
        action: "SUPPORT_TICKET_SUBMITTED",
        resourceType: "support",
        resourceId: participant.id,
        metadata: JSON.stringify({
          ticketId,
          subject,
          category: category || "GENERAL",
          priority: priority || "NORMAL",
          message,
          status: "OPEN",
        }),
      },
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticketId,
        subject,
        category: category || "GENERAL",
        priority: priority || "NORMAL",
        status: "OPEN",
        createdAt: log.timestamp,
        message,
      },
    });
  } catch (err: any) {
    console.error("Error in POST /api/participant/support:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
