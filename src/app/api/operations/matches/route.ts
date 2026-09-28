import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyOperationsClearance } from "@/lib/operations/auth";
import { prisma } from "@/lib/prisma";
import { MATCH_STATUS, COURT_STATUS, isPlaceholderSlot } from "@/lib/matches/lifecycle";
import { ROLES } from "@/lib/rbac/roles";

/**
 * GET /api/operations/matches
 * Returns match queue, court grid telemetry, and available officials for Technical Operations.
 */
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

    const { searchParams } = new URL(req.url);
    const filterStatus = searchParams.get("status") || "ALL";
    const filterCategory = searchParams.get("category") || "ALL";
    const filterCourt = searchParams.get("court") || "ALL";
    const filterDay = searchParams.get("day") || "ALL";
    const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();

    // Fetch all tournament days, matches, courts, and match officials
    const [tournamentDays, matches, courts, officials] = await Promise.all([
      prisma.tournamentDay.findMany({
        orderBy: { id: "asc" },
      }),
      prisma.match.findMany({
        include: {
          day: { select: { id: true, date: true, dayNumber: true, stage: true } },
          events: { orderBy: { timestamp: "desc" }, take: 1 },
        },
        orderBy: [{ dayId: "asc" }, { time: "asc" }, { matchNumber: "asc" }],
      }),
      prisma.court.findMany({
        orderBy: { courtNumber: "asc" },
      }),
      prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: { name: { in: [ROLES.MATCH_OFFICIAL, ROLES.TOURNAMENT_ADMIN, ROLES.SUPER_ADMIN] } },
            },
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          badge: true,
          officialId: true,
        },
      }),
    ]);

    // Compute live match map
    const liveMatchByCourt = new Map<string, any>();
    matches.forEach((m) => {
      if (m.status === MATCH_STATUS.LIVE || m.status === MATCH_STATUS.PAUSED) {
        liveMatchByCourt.set(m.court.toLowerCase(), m);
      }
    });

    // Compute officials occupancy
    const activeOfficialIds = new Set<string>();
    matches.forEach((m) => {
      if (
        (m.status === MATCH_STATUS.LIVE || m.status === MATCH_STATUS.PAUSED) &&
        m.assignedOfficialId
      ) {
        activeOfficialIds.add(m.assignedOfficialId);
      }
    });

    const enrichedOfficials = officials.map((off) => ({
      ...off,
      isAvailable:
        !activeOfficialIds.has(off.id) &&
        !activeOfficialIds.has(off.officialId || "") &&
        !activeOfficialIds.has(off.email),
    }));

    // Filter match queue
    const filteredMatches = matches.filter((m) => {
      if (filterDay !== "ALL" && m.dayId !== filterDay) return false;
      if (filterCategory !== "ALL" && m.category !== filterCategory) return false;
      if (filterCourt !== "ALL" && m.court.toLowerCase() !== filterCourt.toLowerCase()) return false;

      if (filterStatus !== "ALL") {
        if (filterStatus === "READY") {
          const isReady =
            (m.status === MATCH_STATUS.READY || m.status === MATCH_STATUS.SCHEDULED || m.status === "UPCOMING") &&
            !isPlaceholderSlot(m.playerA) &&
            !isPlaceholderSlot(m.playerB);
          if (!isReady) return false;
        } else if (filterStatus === "UNASSIGNED") {
          if (m.court && m.court !== "TBD" && m.court !== "Unassigned" && m.assignedOfficialId) return false;
        } else if (filterStatus === "ASSIGNED") {
          if (!m.assignedOfficialId && (!m.court || m.court === "TBD")) return false;
        } else if (filterStatus === "LIVE") {
          if (m.status !== MATCH_STATUS.LIVE) return false;
        } else if (filterStatus === "PAUSED") {
          if (m.status !== MATCH_STATUS.PAUSED) return false;
        } else if (filterStatus === "DELAYED") {
          if (m.status !== MATCH_STATUS.DELAYED) return false;
        } else if (filterStatus === "COMPLETED") {
          if (
            m.status !== MATCH_STATUS.COMPLETED &&
            m.status !== MATCH_STATUS.RESULT_CONFIRMED &&
            m.status !== MATCH_STATUS.RESULT_SUBMITTED &&
            m.status !== MATCH_STATUS.WALKOVER
          )
            return false;
        } else {
          if (m.status !== filterStatus) return false;
        }
      }

      if (searchQuery) {
        const matchesQuery =
          m.matchNumber.toLowerCase().includes(searchQuery) ||
          m.playerA.toLowerCase().includes(searchQuery) ||
          m.playerB.toLowerCase().includes(searchQuery) ||
          m.institutionA.toLowerCase().includes(searchQuery) ||
          m.institutionB.toLowerCase().includes(searchQuery) ||
          m.category.toLowerCase().includes(searchQuery);
        if (!matchesQuery) return false;
      }

      return true;
    });

    // Enrich court grid
    const courtGrid = courts.map((court) => {
      const activeMatch = liveMatchByCourt.get(court.courtNumber.toLowerCase()) || null;
      const upcomingForCourt = matches.filter(
        (m) =>
          m.court.toLowerCase() === court.courtNumber.toLowerCase() &&
          (m.status === MATCH_STATUS.READY ||
            m.status === MATCH_STATUS.READY_TO_START ||
            m.status === MATCH_STATUS.COURT_ASSIGNED ||
            m.status === MATCH_STATUS.SCHEDULED ||
            m.status === "UPCOMING")
      );

      const nextMatch = upcomingForCourt[0] || null;

      return {
        id: court.id,
        courtNumber: court.courtNumber,
        status: court.status,
        venue: court.venue || "KLE Tech Arena",
        umpire: court.umpire || "Unassigned",
        activeMatch: activeMatch
          ? {
              id: activeMatch.id,
              matchNumber: activeMatch.matchNumber,
              category: activeMatch.category,
              playerA: activeMatch.playerA,
              institutionA: activeMatch.institutionA,
              playerB: activeMatch.playerB,
              institutionB: activeMatch.institutionB,
              scoreA: activeMatch.scoreA || "0",
              scoreB: activeMatch.scoreB || "0",
              status: activeMatch.status,
              interruptionReason: activeMatch.interruptionReason,
              interruptionNotes: activeMatch.interruptionNotes,
              actualStartTime: activeMatch.actualStartTime,
            }
          : null,
        nextMatch: nextMatch
          ? {
              id: nextMatch.id,
              matchNumber: nextMatch.matchNumber,
              category: nextMatch.category,
              playerA: nextMatch.playerA,
              playerB: nextMatch.playerB,
              time: nextMatch.time,
              status: nextMatch.status,
            }
          : null,
      };
    });

    // Telemetry stats
    const stats = {
      totalMatches: matches.length,
      readyCount: matches.filter(
        (m) =>
          !isPlaceholderSlot(m.playerA) &&
          !isPlaceholderSlot(m.playerB) &&
          (m.status === MATCH_STATUS.READY || m.status === MATCH_STATUS.SCHEDULED || m.status === "UPCOMING")
      ).length,
      liveCount: matches.filter((m) => m.status === MATCH_STATUS.LIVE).length,
      pausedCount: matches.filter((m) => m.status === MATCH_STATUS.PAUSED).length,
      completedCount: matches.filter(
        (m) =>
          m.status === MATCH_STATUS.COMPLETED ||
          m.status === MATCH_STATUS.RESULT_CONFIRMED ||
          m.status === MATCH_STATUS.WALKOVER
      ).length,
      delayedCount: matches.filter((m) => m.status === MATCH_STATUS.DELAYED).length,
      availableCourtsCount: courts.filter(
        (c) => c.status === COURT_STATUS.AVAILABLE || c.status === COURT_STATUS.READY
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        matches: filteredMatches,
        courts: courtGrid,
        officials: enrichedOfficials,
        tournamentDays,
        stats,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[GET /api/operations/matches] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load operations match telemetry." },
      { status: 500 }
    );
  }
}
