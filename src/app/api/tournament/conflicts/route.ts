import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { verifyTournamentAdminClearance } from "@/lib/tournament/auth";
import { prisma } from "@/lib/prisma";

export interface ScheduleConflict {
  id: string;
  type: "COURT_CONFLICT" | "MISSING_COURT" | "MISSING_OFFICIAL" | "COURT_UNAVAILABLE" | "TIME_OVERLAP";
  severity: "HIGH" | "WARNING" | "CRITICAL";
  affectedResource: string;
  affectedMatches: Array<{
    id: string;
    matchNumber: string;
    time: string;
    dayId: string;
    court: string;
    playerA: string;
    playerB: string;
  }>;
  description: string;
  recommendation: string;
  timestamp: string;
}

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

    const [matches, courts] = await Promise.all([
      prisma.match.findMany({
        orderBy: [{ dayId: "asc" }, { time: "asc" }],
      }),
      prisma.court.findMany(),
    ]);

    const conflicts: ScheduleConflict[] = [];
    const courtStatusMap: Record<string, string> = {};
    for (const c of courts) {
      courtStatusMap[c.courtNumber] = c.status;
    }

    // 1. Check Court Double Booking (Same court, same day, same time)
    const slotMap: Record<string, typeof matches> = {};
    for (const m of matches) {
      if (m.court && m.court !== "TBA") {
        const slotKey = `${m.dayId}_${m.court}_${m.time}`;
        if (!slotMap[slotKey]) slotMap[slotKey] = [];
        slotMap[slotKey].push(m);
      }
    }

    for (const [key, slotMatches] of Object.entries(slotMap)) {
      if (slotMatches.length > 1) {
        const [dayId, court, time] = key.split("_");
        conflicts.push({
          id: `conflict-double-book-${key}`,
          type: "COURT_CONFLICT",
          severity: "CRITICAL",
          affectedResource: court,
          affectedMatches: slotMatches.map((m) => ({
            id: m.id,
            matchNumber: m.matchNumber,
            time: m.time,
            dayId: m.dayId,
            court: m.court,
            playerA: m.playerA,
            playerB: m.playerB,
          })),
          description: `Multiple matches (${slotMatches.map((m) => m.matchNumber).join(", ")}) scheduled concurrently on ${court} at ${time} on ${dayId}.`,
          recommendation: `Reschedule one of the conflicting fixtures to another available court or subsequent time slot.`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 2. Check Missing Courts
    const missingCourtMatches = matches.filter((m) => !m.court || m.court === "TBA");
    if (missingCourtMatches.length > 0) {
      conflicts.push({
        id: "conflict-missing-courts",
        type: "MISSING_COURT",
        severity: "HIGH",
        affectedResource: "ARENA_COURTS",
        affectedMatches: missingCourtMatches.map((m) => ({
          id: m.id,
          matchNumber: m.matchNumber,
          time: m.time,
          dayId: m.dayId,
          court: "TBA",
          playerA: m.playerA,
          playerB: m.playerB,
        })),
        description: `${missingCourtMatches.length} fixtures have no indoor court assigned.`,
        recommendation: "Assign designated indoor stadium courts before tournament session begins.",
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Check Missing Officials
    const missingOfficialMatches = matches.filter((m) => !m.assignedOfficialId && m.status === "UPCOMING");
    if (missingOfficialMatches.length > 0) {
      conflicts.push({
        id: "conflict-missing-officials",
        type: "MISSING_OFFICIAL",
        severity: "WARNING",
        affectedResource: "BWF_TECHNICAL_OFFICIALS",
        affectedMatches: missingOfficialMatches.slice(0, 10).map((m) => ({
          id: m.id,
          matchNumber: m.matchNumber,
          time: m.time,
          dayId: m.dayId,
          court: m.court,
          playerA: m.playerA,
          playerB: m.playerB,
        })),
        description: `${missingOfficialMatches.length} upcoming fixtures require official umpire allocation.`,
        recommendation: "Assign certified match officials via the technical officials desk.",
        timestamp: new Date().toISOString(),
      });
    }

    // 4. Check Matches Assigned to Courts Under Maintenance / Unavailable
    const invalidCourtMatches = matches.filter(
      (m) =>
        m.court &&
        (courtStatusMap[m.court] === "MAINTENANCE" || courtStatusMap[m.court] === "UNAVAILABLE")
    );
    if (invalidCourtMatches.length > 0) {
      conflicts.push({
        id: "conflict-court-unavailable",
        type: "COURT_UNAVAILABLE",
        severity: "HIGH",
        affectedResource: invalidCourtMatches.map((m) => m.court).join(", "),
        affectedMatches: invalidCourtMatches.map((m) => ({
          id: m.id,
          matchNumber: m.matchNumber,
          time: m.time,
          dayId: m.dayId,
          court: m.court,
          playerA: m.playerA,
          playerB: m.playerB,
        })),
        description: `${invalidCourtMatches.length} fixtures scheduled on courts currently flagged as MAINTENANCE/UNAVAILABLE.`,
        recommendation: "Move fixtures to ready courts or complete arena maintenance verification.",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      conflicts,
      totalConflicts: conflicts.length,
      hasCriticalConflicts: conflicts.some((c) => c.severity === "CRITICAL"),
    });
  } catch (err: any) {
    console.error("Error in GET /api/tournament/conflicts:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
