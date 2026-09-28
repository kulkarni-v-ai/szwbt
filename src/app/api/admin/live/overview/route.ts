import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

/**
 * GET /api/admin/live/overview
 * Real-time operational telemetry for tournament live match control.
 * Strictly derived from PostgreSQL courts, matches, events, and audit logs.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const now = new Date();

      // 1. Fetch All Configured Courts
      const courts = await prisma.court.findMany({
        orderBy: { courtNumber: "asc" },
      });

      // 2. Fetch All Matches across stages
      const matches = await prisma.match.findMany({
        include: {
          day: { select: { id: true, date: true, dayNumber: true, stage: true } },
          events: { orderBy: { timestamp: "desc" }, take: 5 },
        },
        orderBy: [{ dayId: "asc" }, { time: "asc" }],
      });

      // 3. Fetch Available Match Officials
      const officials = await prisma.user.findMany({
        where: {
          isActive: true,
          userRoles: { some: { role: { name: "MATCH_OFFICIAL" } } },
        },
        select: {
          id: true,
          name: true,
          email: true,
          officialId: true,
          badge: true,
        },
      });

      const officialMap = new Map(officials.map((o) => [o.id, o]));
      const officialByEmail = new Map(officials.map((o) => [o.email, o]));
      const officialByIdentifier = new Map(officials.map((o) => [o.officialId || "", o]));

      // 4. Compute Court Status & Active Matches
      const courtsWithLiveState = courts.map((court) => {
        // Find current live or paused match on this court
        const currentMatch = matches.find(
          (m) =>
            m.court.toLowerCase() === court.courtNumber.toLowerCase() &&
            (m.status === "LIVE" || m.status === "PAUSED")
        );

        // Find next upcoming match scheduled for this court
        const nextMatch = matches.find(
          (m) =>
            m.court.toLowerCase() === court.courtNumber.toLowerCase() &&
            (m.status === "UPCOMING" || m.status === "READY")
        );

        // Resolve official details
        let assignedOfficial: any = null;
        if (currentMatch?.assignedOfficialId) {
          assignedOfficial =
            officialMap.get(currentMatch.assignedOfficialId) ||
            officialByEmail.get(currentMatch.assignedOfficialId) ||
            officialByIdentifier.get(currentMatch.assignedOfficialId) || {
              id: currentMatch.assignedOfficialId,
              name: currentMatch.assignedOfficialId,
            };
        }

        // Operational court status derivation
        let derivedStatus = court.status;
        if (currentMatch) {
          derivedStatus = currentMatch.status === "PAUSED" ? "PAUSED" : "LIVE";
        } else if (court.status === "LIVE") {
          derivedStatus = "READY";
        }

        return {
          id: court.id,
          courtNumber: court.courtNumber,
          status: derivedStatus,
          umpire: court.umpire,
          currentMatch: currentMatch
            ? {
                id: currentMatch.id,
                matchNumber: currentMatch.matchNumber,
                category: currentMatch.category,
                time: currentMatch.time,
                playerA: currentMatch.playerA,
                institutionA: currentMatch.institutionA,
                playerB: currentMatch.playerB,
                institutionB: currentMatch.institutionB,
                scoreA: currentMatch.scoreA || "0",
                scoreB: currentMatch.scoreB || "0",
                status: currentMatch.status,
                interruptionReason: currentMatch.interruptionReason,
                interruptionNotes: currentMatch.interruptionNotes,
                assignedOfficial,
                events: currentMatch.events,
              }
            : null,
          nextMatch: nextMatch
            ? {
                id: nextMatch.id,
                matchNumber: nextMatch.matchNumber,
                category: nextMatch.category,
                time: nextMatch.time,
                playerA: nextMatch.playerA,
                institutionA: nextMatch.institutionA,
                playerB: nextMatch.playerB,
                institutionB: nextMatch.institutionB,
                status: nextMatch.status,
              }
            : null,
        };
      });

      // 5. Categorize Matches & Compute Dynamic KPIs
      let liveNowCount = 0;
      let upcomingCount = 0;
      let completedCount = 0;
      let delayedCount = 0;
      let unassignedCourtCount = 0;

      const liveMatches: any[] = [];
      const queueMatches: any[] = [];
      const delayedMatches: any[] = [];
      const alerts: any[] = [];

      // Check double-booking conflicts across active matches
      const courtAssignmentCounts: Record<string, number> = {};

      for (const m of matches) {
        if (m.status === "LIVE" || m.status === "PAUSED") {
          liveNowCount++;
          liveMatches.push(m);

          // Track court occupancy for active matches
          const cKey = m.court.toLowerCase().trim();
          courtAssignmentCounts[cKey] = (courtAssignmentCounts[cKey] || 0) + 1;
          if (courtAssignmentCounts[cKey] > 1) {
            alerts.push({
              id: `alert-conflict-${m.id}`,
              type: "COURT_CONFLICT",
              severity: "CRITICAL",
              message: `COURT CONFLICT: Multiple matches marked active on ${m.court} simultaneously (${m.matchNumber}).`,
              matchId: m.id,
              court: m.court,
              timestamp: now.toISOString(),
            });
          }

          if (m.status === "PAUSED") {
            alerts.push({
              id: `alert-paused-${m.id}`,
              type: "MATCH_INTERRUPTED",
              severity: "WARNING",
              message: `MATCH INTERRUPTED: ${m.matchNumber} on ${m.court} is paused (${m.interruptionReason || "Operational intervention"}).`,
              matchId: m.id,
              court: m.court,
              timestamp: now.toISOString(),
            });
          }
        } else if (m.status === "UPCOMING" || m.status === "READY") {
          upcomingCount++;
          queueMatches.push(m);

          // Check if court is unassigned
          if (!m.court || m.court === "TBA" || m.court === "Unassigned") {
            unassignedCourtCount++;
            alerts.push({
              id: `alert-unassigned-court-${m.id}`,
              type: "UNASSIGNED_COURT",
              severity: "INFO",
              message: `UNASSIGNED COURT: ${m.matchNumber} (${m.category}) has no court assigned.`,
              matchId: m.id,
              timestamp: now.toISOString(),
            });
          }

          // Check if official is unassigned
          if (!m.assignedOfficialId) {
            alerts.push({
              id: `alert-unassigned-official-${m.id}`,
              type: "UNASSIGNED_OFFICIAL",
              severity: "INFO",
              message: `NO OFFICIAL ASSIGNED: ${m.matchNumber} on ${m.court} does not have a designated match official.`,
              matchId: m.id,
              court: m.court,
              timestamp: now.toISOString(),
            });
          }
        } else if (m.status === "COMPLETED") {
          completedCount++;
        } else if (m.status === "DELAYED") {
          delayedCount++;
          delayedMatches.push(m);
          alerts.push({
            id: `alert-delayed-${m.id}`,
            type: "DELAYED_MATCH",
            severity: "WARNING",
            message: `MATCH DELAYED: ${m.matchNumber} on ${m.court} is marked DELAYED.`,
            matchId: m.id,
            court: m.court,
            timestamp: now.toISOString(),
          });
        }
      }

      // 6. Court counts
      const courtsActiveCount = courtsWithLiveState.filter(
        (c) => c.status === "LIVE" || c.status === "PAUSED"
      ).length;
      const courtsAvailableCount = courtsWithLiveState.filter(
        (c) => c.status === "READY"
      ).length;

      // 7. Recent Operational Audit Events
      const recentAuditLogs = await prisma.auditLog.findMany({
        where: {
          resourceType: { in: ["match", "court", "official", "scoring"] },
        },
        orderBy: { timestamp: "desc" },
        take: 12,
      });

      return NextResponse.json({
        success: true,
        data: {
          kpis: {
            liveNow: liveNowCount,
            upcoming: upcomingCount,
            completed: completedCount,
            delayed: delayedCount,
            courtsActive: courtsActiveCount,
            courtsAvailable: courtsAvailableCount,
            unassignedCourts: unassignedCourtCount,
            issuesCount: alerts.length,
            totalCourts: courts.length,
          },
          courts: courtsWithLiveState,
          liveMatches,
          queueMatches,
          delayedMatches,
          alerts,
          officials,
          recentEvents: recentAuditLogs,
          serverTime: now.toISOString(),
        },
      });
    } catch (error: any) {
      console.error("[GET /api/admin/live/overview] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.LIVE_READ],
  }
);
