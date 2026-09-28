import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyVolunteerClearance } from "@/lib/volunteer/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const volAuth = verifyVolunteerClearance(authResult.context);
    if (volAuth.errorResponse) {
      return volAuth.errorResponse;
    }

    const userId = authResult.context.user.id;
    const body = await req.json();
    const { destination = "Operations", message, location = "Venue", relatedTaskId } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Please provide a description of the assistance needed." },
        { status: 400 }
      );
    }

    // Create an escalated incident
    const helpIncident = await prisma.volunteerIssue.create({
      data: {
        userId,
        title: `URGENT ASSISTANCE: Escalated to ${destination}`,
        category: destination.toUpperCase().includes("TRANSPORT")
          ? "TRANSPORT"
          : destination.toUpperCase().includes("ACCOMMODATION")
          ? "ACCOMMODATION"
          : destination.toUpperCase().includes("MATCH")
          ? "MATCH"
          : "VENUE",
        priority: "URGENT",
        severity: "HIGH",
        location: location.trim(),
        description: message.trim(),
        reporterEmail: authResult.context.user.email,
        escalatedTo: destination,
        status: "ESCALATED",
        relatedTask: relatedTaskId || null,
        latestUpdate: `Direct distress signal dispatched to ${destination}`,
      },
    });

    await logAuditEvent({
      actorUserId: userId,
      actorEmail: authResult.context.user.email,
      action: "HELP_REQUESTED",
      resourceType: "volunteer_issue",
      resourceId: helpIncident.id,
      metadata: {
        destination,
        location,
        issueId: helpIncident.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Help request dispatched to ${destination}. Response team notified.`,
      incident: helpIncident,
    });
  } catch (error: any) {
    console.error("Volunteer request help error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dispatch help request." },
      { status: 500 }
    );
  }
}
