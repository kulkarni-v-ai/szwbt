import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOrganizerClearance } from "@/lib/organizer/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const orgAuth = verifyOrganizerClearance(context);
    if (orgAuth.errorResponse) {
      return orgAuth.errorResponse;
    }

    // Query support logs from AuditLog
    const supportLogs = await prisma.auditLog.findMany({
      where: {
        resourceType: "support",
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
        subject: meta.subject || "Operational Inquiry",
        category: meta.category || "GENERAL",
        priority: meta.priority || "NORMAL",
        status: meta.status || "OPEN",
        createdAt: log.timestamp,
        author: log.actorEmail,
        message: meta.message || "",
      };
    });

    return NextResponse.json({
      success: true,
      total: tickets.length,
      openCount: tickets.filter((t) => t.status === "OPEN").length,
      tickets,
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer/support:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
