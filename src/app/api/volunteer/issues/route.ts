import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyVolunteerClearance } from "@/lib/volunteer/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

export async function GET(req: NextRequest) {
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
    const isSuperAdmin = authResult.context.roles.includes("SUPER_ADMIN");

    const targetUserId =
      isSuperAdmin && req.nextUrl.searchParams.get("volunteerId")
        ? req.nextUrl.searchParams.get("volunteerId")!
        : userId;

    const issues = await prisma.volunteerIssue.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      issues,
      total: issues.length,
    });
  } catch (error: any) {
    console.error("Volunteer issues list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load reported issues." },
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

    const volAuth = verifyVolunteerClearance(authResult.context);
    if (volAuth.errorResponse) {
      return volAuth.errorResponse;
    }

    const userId = authResult.context.user.id;
    const body = await req.json();
    const {
      title,
      category,
      priority = "NORMAL",
      location,
      description,
      relatedParticipant,
      relatedTeam,
      relatedMatch,
      relatedTask,
    } = body;

    if (!category || !location || !description) {
      return NextResponse.json(
        { success: false, error: "Category, location, and description are required." },
        { status: 400 }
      );
    }

    const severityMap: Record<string, string> = {
      URGENT: "HIGH",
      HIGH: "HIGH",
      NORMAL: "MEDIUM",
      LOW: "LOW",
    };

    const newIssue = await prisma.volunteerIssue.create({
      data: {
        userId,
        title: title?.trim() || `${category} Issue @ ${location}`,
        category: category.trim().toUpperCase(),
        priority: priority.trim().toUpperCase(),
        severity: severityMap[priority.trim().toUpperCase()] || "MEDIUM",
        location: location.trim(),
        description: description.trim(),
        reporterEmail: authResult.context.user.email,
        relatedParticipant: relatedParticipant?.trim() || null,
        relatedTeam: relatedTeam?.trim() || null,
        relatedMatch: relatedMatch?.trim() || null,
        relatedTask: relatedTask?.trim() || null,
        status: "OPEN",
        latestUpdate: "Submitted by volunteer from field operations",
      },
    });

    await logAuditEvent({
      actorUserId: userId,
      actorEmail: authResult.context.user.email,
      action: "ISSUE_CREATED",
      resourceType: "volunteer_issue",
      resourceId: newIssue.id,
      metadata: {
        category: newIssue.category,
        priority: newIssue.priority,
        location: newIssue.location,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Operational issue reported successfully.",
      issue: newIssue,
    });
  } catch (error: any) {
    console.error("Volunteer issue report error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to report operational issue." },
      { status: 500 }
    );
  }
}
