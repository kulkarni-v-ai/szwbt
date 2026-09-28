import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOperationsClearance } from "@/lib/operations/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const opsAuth = verifyOperationsClearance(authResult.context);
    if (opsAuth.errorResponse) {
      return opsAuth.errorResponse;
    }

    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");
    const severity = searchParams.get("severity");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    if (category && category !== "ALL") where.category = category;
    if (severity && severity !== "ALL") where.severity = severity;
    if (status && status !== "ALL") where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const incidents = await prisma.volunteerIssue.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, badge: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      incidents,
      total: incidents.length,
    });
  } catch (error: any) {
    console.error("Operations incidents list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to query operational incidents." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const opsAuth = verifyOperationsClearance(authResult.context);
    if (opsAuth.errorResponse) {
      return opsAuth.errorResponse;
    }

    const body = await req.json();
    const {
      title,
      category,
      severity = "MEDIUM",
      priority = "NORMAL",
      location,
      description,
      relatedParticipant,
      relatedTeam,
      relatedMatch,
      relatedTask,
    } = body;

    if (!title || !category || !location || !description) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing mandatory fields: title, category, location, description.",
        },
        { status: 400 }
      );
    }

    const incident = await prisma.volunteerIssue.create({
      data: {
        userId: authResult.context.user.id,
        title: title.trim(),
        category: category.trim(),
        severity: severity.trim().toUpperCase(),
        priority: priority.trim().toUpperCase(),
        location: location.trim(),
        description: description.trim(),
        reporterEmail: authResult.context.user.email,
        relatedParticipant: relatedParticipant?.trim() || null,
        relatedTeam: relatedTeam?.trim() || null,
        relatedMatch: relatedMatch?.trim() || null,
        relatedTask: relatedTask?.trim() || null,
        status: "OPEN",
        latestUpdate: "Incident logged at Command Center",
      },
      include: {
        user: { select: { id: true, name: true, email: true, badge: true } },
      },
    });

    await logAuditEvent({
      actorUserId: authResult.context.user.id,
      actorEmail: authResult.context.user.email,
      action: "INCIDENT_REPORTED",
      resourceType: "volunteer_issue",
      resourceId: incident.id,
      metadata: {
        title: incident.title,
        severity: incident.severity,
        category: incident.category,
        location: incident.location,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Incident successfully logged into operations tracking matrix.",
      incident,
    });
  } catch (error: any) {
    console.error("Operations incident creation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log operational incident." },
      { status: 500 }
    );
  }
}
