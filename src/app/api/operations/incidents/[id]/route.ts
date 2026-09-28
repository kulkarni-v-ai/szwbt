import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOperationsClearance } from "@/lib/operations/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const opsAuth = verifyOperationsClearance(authResult.context);
    if (opsAuth.errorResponse) {
      return opsAuth.errorResponse;
    }

    const { id } = await params;

    const incident = await prisma.volunteerIssue.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, badge: true } },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Incident does not exist in operational matrix." },
        { status: 404 }
      );
    }

    // Fetch related audit logs for incident lifecycle history
    const activityHistory = await prisma.auditLog.findMany({
      where: {
        resourceType: "volunteer_issue",
        resourceId: id,
      },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({
      success: true,
      incident,
      activityHistory,
    });
  } catch (error: any) {
    console.error("Operations incident detail error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load incident detail." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const opsAuth = verifyOperationsClearance(authResult.context);
    if (opsAuth.errorResponse) {
      return opsAuth.errorResponse;
    }

    const { id } = await params;
    const body = await req.json();
    const { status, assignedResponder, escalatedTo, resolutionNotes, latestUpdate, severity } = body;

    const existingIncident = await prisma.volunteerIssue.findUnique({
      where: { id },
    });

    if (!existingIncident) {
      return NextResponse.json(
        { success: false, error: "404 Not Found: Incident record not found." },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (assignedResponder !== undefined) updateData.assignedResponder = assignedResponder;
    if (escalatedTo !== undefined) updateData.escalatedTo = escalatedTo;
    if (resolutionNotes !== undefined) updateData.resolutionNotes = resolutionNotes;
    if (severity) updateData.severity = severity;
    if (latestUpdate) updateData.latestUpdate = latestUpdate;

    const updatedIncident = await prisma.volunteerIssue.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, badge: true } },
      },
    });

    // Record appropriate audit action
    const auditAction =
      status === "RESOLVED"
        ? "INCIDENT_RESOLVED"
        : status === "CLOSED"
        ? "INCIDENT_CLOSED"
        : escalatedTo
        ? "INCIDENT_ESCALATED"
        : "INCIDENT_UPDATED";

    await logAuditEvent({
      actorUserId: authResult.context.user.id,
      actorEmail: authResult.context.user.email,
      action: auditAction,
      resourceType: "volunteer_issue",
      resourceId: id,
      metadata: {
        previousStatus: existingIncident.status,
        newStatus: updatedIncident.status,
        assignedResponder: updatedIncident.assignedResponder,
        escalatedTo: updatedIncident.escalatedTo,
        resolutionNotes: updatedIncident.resolutionNotes,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Incident ${id} successfully updated: ${auditAction}.`,
      incident: updatedIncident,
    });
  } catch (error: any) {
    console.error("Operations incident update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update incident record." },
      { status: 500 }
    );
  }
}
