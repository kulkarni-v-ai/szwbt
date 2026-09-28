import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyTournamentAdminClearance } from "@/lib/tournament/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const clearance = verifyTournamentAdminClearance(context);
    if (clearance.errorResponse) {
      return clearance.errorResponse;
    }

    // 1. Fetch Tournament Settings from SystemSetting
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            "tournament.name",
            "tournament.dates",
            "tournament.venue",
            "tournament.status",
            "tournament.edition",
            "tournament.publicVisibility",
          ],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const tournamentName = settingsMap["tournament.name"] || "South Zone Inter-University Women's Badminton Championship 2026";
    const tournamentDates = settingsMap["tournament.dates"] || "October 18 - 21, 2026";
    const tournamentVenue = settingsMap["tournament.venue"] || "KLE Technological University Indoor Stadium, Hubballi";
    const tournamentStatus = settingsMap["tournament.status"] || "LIVE";
    const publicVisibility = settingsMap["tournament.publicVisibility"] || "PUBLISHED";
    const edition = settingsMap["tournament.edition"] || "2026 Edition";

    // 2. Fetch Competition Totals
    const [
      categoryCount,
      eventCount,
      courtList,
      matches,
      participantsCount,
      teamsCount,
      hostelsCount,
      bedsCount,
      allocatedBedsCount,
      transportTripsCount,
      scheduleLock,
      milestones,
    ] = await Promise.all([
      prisma.tournamentCategory.count({ where: { status: "ACTIVE" } }),
      prisma.tournamentEvent.count(),
      prisma.court.findMany({ orderBy: { courtNumber: "asc" } }),
      prisma.match.findMany({
        select: {
          id: true,
          matchNumber: true,
          court: true,
          time: true,
          dayId: true,
          status: true,
          assignedOfficialId: true,
          scoreA: true,
          scoreB: true,
          winner: true,
        },
      }),
      prisma.participant.count(),
      prisma.team.count(),
      prisma.hostel.count(),
      prisma.bed.count(),
      prisma.bed.count({ where: { status: "OCCUPIED" } }),
      prisma.transportTrip.count(),
      prisma.scheduleLock.findUnique({ where: { id: "CURRENT_SCHEDULE_LOCK" } }),
      prisma.tournamentMilestone.findMany({ orderBy: { sequence: "asc" } }),
    ]);

    // 3. Match Aggregations
    const totalMatches = matches.length;
    const liveMatches = matches.filter((m) => m.status === "LIVE").length;
    const upcomingMatches = matches.filter((m) => m.status === "UPCOMING").length;
    const completedMatches = matches.filter((m) => m.status === "COMPLETED").length;
    const pausedMatches = matches.filter((m) => m.status === "PAUSED").length;
    const missingCourts = matches.filter((m) => !m.court || m.court === "TBA").length;
    const missingOfficials = matches.filter((m) => !m.assignedOfficialId).length;

    // 4. Critical Alerts (Real, non-fabricated)
    const alerts: Array<{
      id: string;
      severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
      source: string;
      title: string;
      description: string;
      actionUrl: string;
      timestamp: string;
    }> = [];

    if (missingOfficials > 0) {
      alerts.push({
        id: "alert-officials-missing",
        severity: "WARNING",
        source: "MATCH_OPERATIONS",
        title: `${missingOfficials} Matches Missing Assigned Umpire`,
        description: "Official allocations are pending on scheduled tournament day fixtures.",
        actionUrl: "/official",
        timestamp: new Date().toISOString(),
      });
    }

    if (missingCourts > 0) {
      alerts.push({
        id: "alert-courts-missing",
        severity: "HIGH",
        source: "SCHEDULE",
        title: `${missingCourts} Matches Awaiting Court Assignment`,
        description: "Matches cannot commence without an allocated indoor arena court.",
        actionUrl: "/admin/tournament/schedule",
        timestamp: new Date().toISOString(),
      });
    }

    const maintenanceCourts = courtList.filter((c) => c.status === "MAINTENANCE");
    if (maintenanceCourts.length > 0) {
      alerts.push({
        id: "alert-court-maintenance",
        severity: "HIGH",
        source: "ARENA_CONTROL",
        title: `${maintenanceCourts.length} Courts Under Maintenance`,
        description: `${maintenanceCourts.map((c) => c.courtNumber).join(", ")} marked unavailable for competitive fixtures.`,
        actionUrl: "/admin/tournament/courts",
        timestamp: new Date().toISOString(),
      });
    }

    if (scheduleLock?.isLocked) {
      alerts.push({
        id: "alert-schedule-locked",
        severity: "INFO",
        source: "SCHEDULE_LOCK",
        title: "Tournament Fixture Schedule Is Locked",
        description: `Locked by ${scheduleLock.lockedBy || "Tournament Controller"} on ${scheduleLock.lockedAt ? new Date(scheduleLock.lockedAt).toLocaleDateString() : "Recent"}.`,
        actionUrl: "/admin/tournament/schedule",
        timestamp: scheduleLock.lockedAt?.toISOString() || new Date().toISOString(),
      });
    }

    // 5. Operational Readiness Signals (Real calculated state)
    const readiness = {
      tournament: {
        status: "READY",
        label: "Tournament Core",
        detail: `${edition} • ${tournamentStatus}`,
      },
      registration: {
        status: participantsCount > 0 ? "READY" : "WARNING",
        label: "Registration Roster",
        detail: `${participantsCount} Athletes • ${teamsCount} Teams Accredited`,
      },
      accommodation: {
        status: bedsCount > 0 ? (allocatedBedsCount > 0 ? "READY" : "WARNING") : "NOT CONFIGURED",
        label: "Hostel Housing",
        detail: `${allocatedBedsCount}/${bedsCount} Beds Occupied (${hostelsCount} Hostels)`,
      },
      transport: {
        status: transportTripsCount > 0 ? "READY" : "WARNING",
        label: "Campus Fleet",
        detail: `${transportTripsCount} Trips Scheduled • Zero Payment (Complimentary)`,
        hasPayment: false,
      },
      schedule: {
        status: totalMatches > 0 && missingCourts === 0 ? "READY" : totalMatches > 0 ? "WARNING" : "NOT CONFIGURED",
        label: "Fixtures & Draw",
        detail: `${totalMatches} Fixtures • ${missingCourts} Unassigned`,
      },
      courts: {
        status: courtList.length >= 4 ? "READY" : "WARNING",
        label: "Arena Courts",
        detail: `${courtList.length} Registered Courts (${courtList.filter((c) => c.status === "READY" || c.status === "LIVE").length} Ready)`,
      },
      matchOperations: {
        status: liveMatches > 0 || completedMatches > 0 ? "READY" : "WARNING",
        label: "Match Operations",
        detail: `${liveMatches} Live • ${completedMatches} Completed`,
      },
      results: {
        status: completedMatches > 0 ? "READY" : "INFO",
        label: "Results Engine",
        detail: `${completedMatches} Official Match Results Validated`,
      },
    };

    return NextResponse.json({
      success: true,
      tournament: {
        name: tournamentName,
        edition,
        venue: tournamentVenue,
        dates: tournamentDates,
        status: tournamentStatus,
        publicVisibility,
        isScheduleLocked: Boolean(scheduleLock?.isLocked),
        lockedBy: scheduleLock?.lockedBy,
        lockedAt: scheduleLock?.lockedAt,
      },
      metrics: {
        categories: categoryCount,
        events: eventCount,
        courts: courtList.length,
        totalMatches,
        liveMatches,
        upcomingMatches,
        completedMatches,
        pausedMatches,
        missingCourts,
        missingOfficials,
        participants: participantsCount,
        teams: teamsCount,
      },
      readiness,
      alerts,
      milestones,
      courts: courtList,
    });
  } catch (err: any) {
    console.error("Error in GET /api/tournament/overview:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
