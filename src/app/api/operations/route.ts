import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOperationsClearance } from "@/lib/operations/auth";
import { prisma } from "@/lib/prisma";

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

    // 1. Concurrently fetch all operational telemetry
    const [
      activeIncidents,
      criticalIncidentsCount,
      tasks,
      venueAreas,
      courts,
      activeMatches,
      upcomingMatches,
      volunteers,
      activeShifts,
      recentAuditLogs,
      announcements,
      totalParticipants,
      approvedParticipants,
      pendingParticipants,
      allocatedBeds,
      totalBeds,
      transportTrips,
      transportPassengers,
    ] = await Promise.all([
      // Unresolved incidents / issues
      prisma.volunteerIssue.findMany({
        where: {
          status: { in: ["OPEN", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "ESCALATED"] },
        },
        include: {
          user: { select: { id: true, name: true, email: true, badge: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      // Count of critical / high incidents
      prisma.volunteerIssue.count({
        where: {
          status: { in: ["OPEN", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "ESCALATED"] },
          severity: { in: ["CRITICAL", "HIGH"] },
        },
      }),
      // Active tasks
      prisma.volunteerTask.findMany({
        where: {
          status: { in: ["ASSIGNED", "IN_PROGRESS", "BLOCKED"] },
        },
        include: {
          user: { select: { id: true, name: true, email: true, badge: true } },
          assignment: true,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      }),
      // Venue areas
      prisma.venueArea.findMany({
        orderBy: { name: "asc" },
      }),
      // Courts
      prisma.court.findMany({
        orderBy: { courtNumber: "asc" },
      }),
      // Live matches
      prisma.match.findMany({
        where: { status: "LIVE" },
        include: { day: true },
      }),
      // Upcoming matches
      prisma.match.findMany({
        where: { status: { in: ["SCHEDULED", "UPCOMING", "READY"] } },
        include: { day: true },
        orderBy: { scheduledStartTime: "asc" },
        take: 6,
      }),
      // Active volunteers
      prisma.user.findMany({
        where: {
          userRoles: { some: { role: { name: "VOLUNTEER" } } },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          badge: true,
          volunteerShifts: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          volunteerAssignments: {
            where: { status: { in: ["ACTIVE", "ASSIGNED"] } },
            take: 1,
          },
        },
      }),
      // Active shifts count
      prisma.volunteerShift.count({
        where: { status: "ON_SHIFT" },
      }),
      // Recent audit activity
      prisma.auditLog.findMany({
        where: {
          resourceType: {
            in: [
              "volunteer_issue",
              "volunteer_task",
              "volunteer_shift",
              "venue",
              "match",
              "transport",
              "registration",
              "support",
            ],
          },
        },
        orderBy: { timestamp: "desc" },
        take: 12,
      }),
      // Operational announcements
      prisma.announcement.findMany({
        where: {
          isPublished: true,
          targetAudience: { in: ["ALL", "VOLUNTEERS", "OPERATIONS", "OFFICIALS"] },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Registration telemetry
      prisma.participant.count(),
      prisma.participant.count({ where: { status: "APPROVED" } }),
      prisma.participant.count({ where: { status: "PENDING" } }),
      // Accommodation telemetry
      prisma.accommodationAllocation.count({ where: { status: "ACTIVE" } }),
      prisma.bed.count(),
      // Transport telemetry (complimentary zero-payment)
      prisma.transportTrip.count(),
      prisma.transportPassenger.count(),
    ]);

    // Compute task counts
    const completedTasksCount = await prisma.volunteerTask.count({
      where: { status: "COMPLETED" },
    });

    // Determine Global Operations Statuses
    const venueHasIssues = venueAreas.some((va) => va.status === "ISSUE");
    const venueHasAttention = venueAreas.some((va) => va.status === "ATTENTION");
    const venueStatus = venueHasIssues ? "ISSUE" : venueHasAttention ? "ATTENTION" : "READY";

    const regStatus = pendingParticipants > 0 ? "ACTIVE" : "READY";
    const transportStatus = transportTrips > 0 ? "IN SERVICE" : "STANDBY";
    const matchStatus = activeMatches.length > 0 ? "LIVE" : "READY";
    const volunteerStatus = activeShifts > 0 ? "ACTIVE" : "STANDBY";

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      operationsState: criticalIncidentsCount > 0 ? "ALERT" : "NORMAL",
      globalStatus: {
        venue: venueStatus,
        registration: regStatus,
        accommodation: allocatedBeds > 0 ? "ALLOCATED" : "READY",
        transport: transportStatus,
        matchOperations: matchStatus,
        volunteers: volunteerStatus,
        communications: announcements.length > 0 ? "ACTIVE" : "IDLE",
      },
      metrics: {
        activeIncidentsCount: activeIncidents.length,
        criticalIncidentsCount,
        activeTasksCount: tasks.length,
        completedTasksCount,
        activeVolunteersCount: activeShifts,
        totalConfiguredVolunteers: volunteers.length,
        totalParticipants,
        approvedParticipants,
        pendingParticipants,
        allocatedBeds,
        totalBeds,
        transportTrips,
        transportPassengers,
        liveMatchesCount: activeMatches.length,
      },
      incidents: activeIncidents,
      tasks,
      venueAreas,
      courts,
      activeMatches,
      upcomingMatches,
      volunteers,
      recentActivity: recentAuditLogs,
      announcements,
    });
  } catch (error: any) {
    console.error("Operations telemetry API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal operational telemetry failure." },
      { status: 500 }
    );
  }
}
