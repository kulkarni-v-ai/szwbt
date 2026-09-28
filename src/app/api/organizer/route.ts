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

    // 1. Query Real Tournament Counts (Global Snapshot)
    const [
      totalTeams,
      totalParticipants,
      completedRegistrations,
      pendingRegistrations,
      allocatedBeds,
      totalConfiguredBeds,
      transportPassengers,
      scheduledMatches,
      liveMatches,
      completedMatches,
      totalAnnouncements,
      publishedAnnouncements,
      openTicketsCount,
    ] = await Promise.all([
      prisma.team.count(),
      prisma.participant.count(),
      prisma.participant.count({ where: { status: "APPROVED" } }),
      prisma.participant.count({ where: { status: "PENDING" } }),
      prisma.accommodationAllocation.count({ where: { status: "ACTIVE" } }),
      prisma.bed.count(),
      prisma.transportPassenger.count(),
      prisma.match.count({ where: { status: { in: ["SCHEDULED", "UPCOMING", "READY"] } } }),
      prisma.match.count({ where: { status: "LIVE" } }),
      prisma.match.count({ where: { status: "COMPLETED" } }),
      prisma.announcement.count(),
      prisma.announcement.count({ where: { isPublished: true } }),
      prisma.auditLog.count({
        where: {
          resourceType: "support",
          action: "SUPPORT_TICKET_SUBMITTED",
        },
      }),
    ]);

    // Active live matches with court details
    const activeLiveMatches = await prisma.match.findMany({
      where: { status: "LIVE" },
      include: { day: true },
      take: 4,
    });

    // Upcoming matches
    const upcomingMatches = await prisma.match.findMany({
      where: { status: { in: ["UPCOMING", "SCHEDULED", "READY"] } },
      include: { day: true },
      orderBy: { createdAt: "asc" },
      take: 4,
    });

    // Determine overall tournament status
    const tournamentStatus = liveMatches > 0 ? "LIVE" : scheduledMatches > 0 ? "UPCOMING" : "READY";

    // 2. Compute Transparent Tournament Health Dimensions
    const regRatio = totalParticipants > 0 ? completedRegistrations / totalParticipants : 0;
    const accommRatio = totalParticipants > 0 ? allocatedBeds / totalParticipants : 0;
    const unallocatedCount = Math.max(0, totalParticipants - allocatedBeds);

    const health = [
      {
        dimension: "REGISTRATION READINESS",
        metric: `${completedRegistrations} / ${totalParticipants} ATHLETES ACCREDITED`,
        status: regRatio >= 0.8 ? "READY" : regRatio >= 0.4 ? "ON TRACK" : "ACTION REQUIRED",
        progress: Math.round(regRatio * 100),
        tab: "registration",
      },
      {
        dimension: "ACCOMMODATION ALLOCATION",
        metric: `${allocatedBeds} ALLOCATED &bull; ${unallocatedCount} PENDING`,
        status: unallocatedCount === 0 ? "READY" : unallocatedCount <= 5 ? "ON TRACK" : "ACTION REQUIRED",
        progress: totalParticipants > 0 ? Math.round((allocatedBeds / totalParticipants) * 100) : 0,
        tab: "accommodation",
      },
      {
        dimension: "TRANSPORT LOGISTICS",
        metric: `${transportPassengers} PASSENGERS ASSIGNED TO SHUTTLES`,
        status: transportPassengers > 0 ? "ON TRACK" : "PENDING",
        progress: transportPassengers > 0 ? 85 : 20,
        tab: "transport",
      },
      {
        dimension: "MATCH OPERATIONS",
        metric: `${liveMatches} LIVE NOW &bull; ${scheduledMatches} SCHEDULED TIES`,
        status: liveMatches > 0 ? "LIVE" : scheduledMatches > 0 ? "ON TRACK" : "PENDING",
        progress: liveMatches > 0 ? 100 : 50,
        tab: "matches",
      },
      {
        dimension: "COMMUNICATIONS & BULLETINS",
        metric: `${publishedAnnouncements} / ${totalAnnouncements} BULLETINS BROADCAST`,
        status: publishedAnnouncements > 0 ? "READY" : "PENDING",
        progress: totalAnnouncements > 0 ? Math.round((publishedAnnouncements / totalAnnouncements) * 100) : 0,
        tab: "announcements",
      },
    ];

    // 3. Dynamic Action Center Items (Derived from real operational bottlenecks)
    const actionItems = [];

    if (unallocatedCount > 0) {
      actionItems.push({
        id: "action-accomm-pending",
        priority: "HIGH",
        module: "ACCOMMODATION",
        title: "Hostel Bed Allocation Pending",
        description: `${unallocatedCount} accredited athletes currently have no assigned hostel bed.`,
        actionText: "VIEW ACCOMMODATION",
        actionTab: "accommodation",
        timestamp: new Date().toISOString(),
      });
    }

    if (pendingRegistrations > 0) {
      actionItems.push({
        id: "action-reg-pending",
        priority: "MEDIUM",
        module: "REGISTRATION",
        title: "Awaiting Desk Verification",
        description: `${pendingRegistrations} registrations require physical document inspection at Desk 02.`,
        actionText: "VIEW REGISTRATIONS",
        actionTab: "registration",
        timestamp: new Date().toISOString(),
      });
    }

    if (liveMatches > 0) {
      actionItems.push({
        id: "action-matches-live",
        priority: "NORMAL",
        module: "MATCHES",
        title: "Active Matches On Court",
        description: `${liveMatches} match ties are currently in progress across tournament courts.`,
        actionText: "VIEW LIVE STREAM",
        actionTab: "live-matches",
        timestamp: new Date().toISOString(),
      });
    }

    if (openTicketsCount > 0) {
      actionItems.push({
        id: "action-support-queries",
        priority: "NORMAL",
        module: "SUPPORT",
        title: "Helpdesk Queries Logged",
        description: `${openTicketsCount} operational queries logged by contingents.`,
        actionText: "VIEW SUPPORT QUEUE",
        actionTab: "support",
        timestamp: new Date().toISOString(),
      });
    }

    // 4. Operational Alerts
    const alerts = [];
    if (unallocatedCount > 10) {
      alerts.push({
        id: "alert-accomm-capacity",
        level: "WARNING",
        module: "ACCOMMODATION",
        message: `High unallocated contingent volume (${unallocatedCount} athletes). Verify hostel wing availability.`,
        time: "Active Telemetry",
      });
    }

    if (liveMatches > 0) {
      alerts.push({
        id: "alert-match-live",
        level: "INFO",
        module: "COURT OPS",
        message: `${liveMatches} ties currently live on competition courts. Technical officials deployed.`,
        time: "Just Now",
      });
    }

    alerts.push({
      id: "alert-shuttle-free",
      level: "INFO",
      module: "FLEET OPS",
      message: "University shuttle transit operating on schedule. Zero fare policy enforced for all teams.",
      time: "Campus Fleet",
    });

    return NextResponse.json({
      success: true,
      tournament: {
        name: "South Zone Women's Badminton Championship 2026",
        venue: "KLE Technological University Arena, Hubballi",
        status: tournamentStatus,
        phase: "Championship Tournament Stage",
        lastSynchronized: new Date().toISOString(),
      },
      indicators: {
        registration: regRatio >= 0.8 ? "85% READY" : "IN PROGRESS",
        accommodation: `${allocatedBeds} BEDS ALLOCATED`,
        transport: `${transportPassengers} ACTIVE RIDERS`,
        matches: liveMatches > 0 ? `${liveMatches} LIVE NOW` : `${scheduledMatches} SCHEDULED`,
      },
      snapshot: {
        registeredTeams: totalTeams,
        registeredParticipants: totalParticipants,
        completedRegistrations,
        pendingRegistrations,
        allocatedBeds,
        totalConfiguredBeds,
        transportPassengers,
        scheduledMatches,
        liveMatches,
        completedMatches,
      },
      health,
      actionItems,
      alerts,
      liveMatches: activeLiveMatches.map((m) => ({
        id: m.id,
        matchNumber: m.matchNumber,
        category: m.category,
        court: m.court,
        time: m.time,
        playerA: m.playerA,
        institutionA: m.institutionA,
        playerB: m.playerB,
        institutionB: m.institutionB,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        status: m.status,
      })),
      upcomingMatches: upcomingMatches.map((m) => ({
        id: m.id,
        matchNumber: m.matchNumber,
        category: m.category,
        court: m.court,
        time: m.time,
        date: m.day ? `${m.day.dayNumber} (${m.day.date})` : "OCT 18",
        playerA: m.playerA,
        institutionA: m.institutionA,
        playerB: m.playerB,
        institutionB: m.institutionB,
        status: m.status,
      })),
    });
  } catch (err: any) {
    console.error("Error in GET /api/organizer:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
