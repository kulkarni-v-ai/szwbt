import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyReportsClearance } from "@/lib/reports/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const reportsAuth = verifyReportsClearance(context);
    if (reportsAuth.errorResponse) {
      return reportsAuth.errorResponse;
    }

    const savedReports = await prisma.savedReport.findMany({
      where: {
        OR: [
          { ownerEmail: context.user.email },
          { ownerEmail: "reports@szwbt2026.edu" }, // Preset system report templates
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      savedReports: savedReports.map((sr) => ({
        id: sr.id,
        name: sr.name,
        reportType: sr.reportType,
        filters: JSON.parse(sr.filters || "{}"),
        columns: sr.columns ? JSON.parse(sr.columns) : null,
        sort: sr.sort ? JSON.parse(sr.sort) : null,
        ownerEmail: sr.ownerEmail,
        createdAt: sr.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("Error in GET /api/reports/saved:", err);
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
    const reportsAuth = verifyReportsClearance(context);
    if (reportsAuth.errorResponse) {
      return reportsAuth.errorResponse;
    }

    const body = await req.json().catch(() => ({}));
    const { name, reportType, filters = {}, columns = null, sort = null } = body;

    if (!name || !reportType) {
      return NextResponse.json(
        { success: false, error: "Report name and reportType are mandatory." },
        { status: 400 }
      );
    }

    // Verify clearance for this specific report type
    const catCheck = verifyReportsClearance(context, reportType);
    if (catCheck.errorResponse) {
      return catCheck.errorResponse;
    }

    const saved = await prisma.savedReport.create({
      data: {
        name: name.trim(),
        reportType: reportType.toUpperCase(),
        filters: JSON.stringify(filters),
        columns: columns ? JSON.stringify(columns) : null,
        sort: sort ? JSON.stringify(sort) : null,
        ownerEmail: context.user.email,
      },
    });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "SAVED_REPORT_CREATED",
      resourceType: "report",
      resourceId: saved.id,
      metadata: { name: saved.name, reportType: saved.reportType },
    });

    return NextResponse.json({
      success: true,
      savedReport: {
        id: saved.id,
        name: saved.name,
        reportType: saved.reportType,
        filters,
        columns,
        sort,
        ownerEmail: saved.ownerEmail,
        createdAt: saved.createdAt,
      },
    });
  } catch (err: any) {
    console.error("Error in POST /api/reports/saved:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Report ID required." }, { status: 400 });
    }

    const existing = await prisma.savedReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Report configuration not found." }, { status: 404 });
    }

    // Only owner or super admin can delete
    if (existing.ownerEmail !== context.user.email && !context.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ success: false, error: "403 Forbidden: Cannot delete another user's saved report." }, { status: 403 });
    }

    await prisma.savedReport.delete({ where: { id } });

    await logAuditEvent({
      actorUserId: context.user.id,
      actorEmail: context.user.email,
      action: "SAVED_REPORT_DELETED",
      resourceType: "report",
      resourceId: id,
    });

    return NextResponse.json({ success: true, message: "Saved report deleted successfully." });
  } catch (err: any) {
    console.error("Error in DELETE /api/reports/saved:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
