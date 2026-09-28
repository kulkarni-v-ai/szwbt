import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyVolunteerClearance } from "@/lib/volunteer/auth";
import { prisma } from "@/lib/prisma";

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

    // Fetch shift, assignments, tasks, issues, announcements
    const [latestShift, activeAssignment, upcomingAssignment, allTasks, openIssues, announcements] =
      await Promise.all([
        prisma.volunteerShift.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.volunteerAssignment.findFirst({
          where: { userId, status: { in: ["ACTIVE", "ASSIGNED"] } },
          orderBy: { createdAt: "asc" },
        }),
        prisma.volunteerAssignment.findFirst({
          where: { userId, status: "ASSIGNED" },
          skip: 1,
          orderBy: { createdAt: "asc" },
        }),
        prisma.volunteerTask.findMany({
          where: { userId },
          orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        }),
        prisma.volunteerIssue.findMany({
          where: {
            userId,
            status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "ASSIGNED", "ESCALATED"] },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.announcement.findMany({
          where: {
            isPublished: true,
            targetAudience: { in: ["ALL", "VOLUNTEERS"] },
          },
          orderBy: { createdAt: "desc" },
          take: 4,
        }),
      ]);

    const activeTasks = allTasks.filter((t) => t.status === "ASSIGNED" || t.status === "IN_PROGRESS");
    const completedTasks = allTasks.filter((t) => t.status === "COMPLETED");

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      volunteer: {
        id: userId,
        volunteerCode: `VLT-2026-${userId.slice(-4).toUpperCase()}`,
        name: authResult.context.user.name,
        email: authResult.context.user.email,
        badge: authResult.context.user.badge || "MOBILE FIELD",
        role: "Field Operations Volunteer",
        assignedArea: activeAssignment ? `${activeAssignment.venue} — ${activeAssignment.area}` : "Unassigned",
        shiftStatus: latestShift ? latestShift.status : "NOT_STARTED",
      },
      currentShift: latestShift || {
        status: "NOT_STARTED",
        startedAt: null,
        endedAt: null,
      },
      currentAssignment: activeAssignment || null,
      nextAssignment: upcomingAssignment || null,
      kpis: {
        activeTasksCount: activeTasks.length,
        completedTasksCount: completedTasks.length,
        openIssuesCount: openIssues.length,
        nextAssignmentTitle: upcomingAssignment ? upcomingAssignment.title : "—",
      },
      tasks: allTasks,
      openIssues,
      announcements,
    });
  } catch (error: any) {
    console.error("Volunteer overview error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load volunteer overview." },
      { status: 500 }
    );
  }
}
