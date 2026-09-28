import { PrismaClient } from "@prisma/client";

/**
 * Standardized Match Lifecycle State Machine & Court Turnaround
 * South Zone Women's Badminton Championship 2026
 */

export const MATCH_STATUS = {
  SCHEDULED: "SCHEDULED",
  UPCOMING: "UPCOMING",
  READY: "READY",
  COURT_ASSIGNED: "COURT_ASSIGNED",
  UMPIRE_ASSIGNED: "UMPIRE_ASSIGNED",
  READY_TO_START: "READY_TO_START",
  LIVE: "LIVE",
  PAUSED: "PAUSED",
  MATCH_ENDED: "MATCH_ENDED",
  RESULT_SUBMITTED: "RESULT_SUBMITTED",
  RESULT_CONFIRMED: "RESULT_CONFIRMED",
  COMPLETED: "COMPLETED",
  // Exceptional states
  DELAYED: "DELAYED",
  CANCELLED: "CANCELLED",
  WALKOVER: "WALKOVER",
  FORFEIT: "FORFEIT",
  DISQUALIFIED: "DISQUALIFIED",
  ABANDONED: "ABANDONED",
} as const;

export type MatchStatusType = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS];

export const COURT_STATUS = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  ASSIGNED: "ASSIGNED",
  READY: "READY",
  LIVE: "LIVE",
  PAUSED: "PAUSED",
  POST_MATCH: "POST_MATCH",
  COMPLETED: "COMPLETED",
  MAINTENANCE: "MAINTENANCE",
  BLOCKED: "BLOCKED",
} as const;

export type CourtStatusType = (typeof COURT_STATUS)[keyof typeof COURT_STATUS];

export const PAUSE_REASONS = [
  { id: "MEDICAL", label: "Medical Timeout / Injury" },
  { id: "COURT_ISSUE", label: "Court Condition / Surface Issue" },
  { id: "EQUIPMENT_ISSUE", label: "Net / Shuttlecock / Equipment Issue" },
  { id: "TECHNICAL_ISSUE", label: "Hawk-Eye / Electronic Scoring Interruption" },
  { id: "PLAYER_DELAY", label: "Player Apparel / Warm-up Delay" },
  { id: "OFFICIAL_BREAK", label: "Official Umpire Interval" },
  { id: "OTHER", label: "Other Technical Hold" },
] as const;

export const PLAYER_AVAILABILITY = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
  WITHDRAWN: "WITHDRAWN",
  DISQUALIFIED: "DISQUALIFIED",
} as const;

/**
 * Validates if the match state transition is legally permissible.
 */
export function isPermissibleTransition(currentStatus: string, nextStatus: string): boolean {
  const normCurrent = currentStatus.toUpperCase();
  const normNext = nextStatus.toUpperCase();

  if (normCurrent === normNext) return true;

  const transitions: Record<string, string[]> = {
    [MATCH_STATUS.SCHEDULED]: [
      MATCH_STATUS.READY,
      MATCH_STATUS.COURT_ASSIGNED,
      MATCH_STATUS.DELAYED,
      MATCH_STATUS.CANCELLED,
      MATCH_STATUS.WALKOVER,
    ],
    [MATCH_STATUS.READY]: [
      MATCH_STATUS.COURT_ASSIGNED,
      MATCH_STATUS.UMPIRE_ASSIGNED,
      MATCH_STATUS.READY_TO_START,
      MATCH_STATUS.LIVE,
      MATCH_STATUS.DELAYED,
      MATCH_STATUS.CANCELLED,
      MATCH_STATUS.WALKOVER,
    ],
    [MATCH_STATUS.COURT_ASSIGNED]: [
      MATCH_STATUS.UMPIRE_ASSIGNED,
      MATCH_STATUS.READY_TO_START,
      MATCH_STATUS.LIVE,
      MATCH_STATUS.READY,
      MATCH_STATUS.DELAYED,
      MATCH_STATUS.CANCELLED,
      MATCH_STATUS.WALKOVER,
    ],
    [MATCH_STATUS.UMPIRE_ASSIGNED]: [
      MATCH_STATUS.READY_TO_START,
      MATCH_STATUS.LIVE,
      MATCH_STATUS.COURT_ASSIGNED,
      MATCH_STATUS.READY,
      MATCH_STATUS.DELAYED,
      MATCH_STATUS.CANCELLED,
      MATCH_STATUS.WALKOVER,
    ],
    [MATCH_STATUS.READY_TO_START]: [
      MATCH_STATUS.LIVE,
      MATCH_STATUS.PAUSED,
      MATCH_STATUS.DELAYED,
      MATCH_STATUS.WALKOVER,
      MATCH_STATUS.READY,
    ],
    [MATCH_STATUS.LIVE]: [
      MATCH_STATUS.PAUSED,
      MATCH_STATUS.MATCH_ENDED,
      MATCH_STATUS.RESULT_SUBMITTED,
      MATCH_STATUS.COMPLETED,
      MATCH_STATUS.WALKOVER,
      MATCH_STATUS.FORFEIT,
      MATCH_STATUS.DISQUALIFIED,
      MATCH_STATUS.ABANDONED,
    ],
    [MATCH_STATUS.PAUSED]: [
      MATCH_STATUS.LIVE,
      MATCH_STATUS.MATCH_ENDED,
      MATCH_STATUS.RESULT_SUBMITTED,
      MATCH_STATUS.COMPLETED,
      MATCH_STATUS.WALKOVER,
      MATCH_STATUS.FORFEIT,
      MATCH_STATUS.ABANDONED,
    ],
    [MATCH_STATUS.MATCH_ENDED]: [
      MATCH_STATUS.RESULT_SUBMITTED,
      MATCH_STATUS.RESULT_CONFIRMED,
      MATCH_STATUS.COMPLETED,
    ],
    [MATCH_STATUS.RESULT_SUBMITTED]: [
      MATCH_STATUS.RESULT_CONFIRMED,
      MATCH_STATUS.COMPLETED,
      MATCH_STATUS.LIVE, // If umpire needs to reopen for correction
    ],
    [MATCH_STATUS.RESULT_CONFIRMED]: [
      MATCH_STATUS.COMPLETED,
    ],
    [MATCH_STATUS.DELAYED]: [
      MATCH_STATUS.READY,
      MATCH_STATUS.COURT_ASSIGNED,
      MATCH_STATUS.READY_TO_START,
      MATCH_STATUS.LIVE,
      MATCH_STATUS.CANCELLED,
    ],
    [MATCH_STATUS.UPCOMING]: [
      MATCH_STATUS.READY,
      MATCH_STATUS.COURT_ASSIGNED,
      MATCH_STATUS.LIVE,
      MATCH_STATUS.COMPLETED,
      MATCH_STATUS.DELAYED,
    ],
  };

  const allowed = transitions[normCurrent] || [];
  return allowed.includes(normNext) || normNext === MATCH_STATUS.COMPLETED;
}

/**
 * Checks if a player string is an unresolved dependency slot placeholder.
 */
export function isPlaceholderSlot(playerStr: string): boolean {
  if (!playerStr) return true;
  const upper = playerStr.toUpperCase().trim();
  return (
    upper === "TBA" ||
    upper === "TBD" ||
    upper.includes("WINNER OF") ||
    upper.includes("WINNER_OF") ||
    upper.includes("LOSER OF") ||
    upper.includes("LOSER_OF") ||
    upper.startsWith("W/") ||
    upper.startsWith("L/")
  );
}

/**
 * Resolves downstream dependent knockout matches when a match concludes with a winner.
 * Transaction-safe.
 */
export async function resolveKnockoutDependencies(
  tx: any,
  completedMatch: {
    id: string;
    matchNumber: string;
    winner: string | null;
    playerA: string;
    institutionA: string;
    playerB: string;
    institutionB: string;
  }
): Promise<number> {
  if (!completedMatch.winner) return 0;

  const winnerName =
    completedMatch.winner === "PLAYER_A"
      ? completedMatch.playerA
      : completedMatch.winner === "PLAYER_B"
      ? completedMatch.playerB
      : completedMatch.winner;

  const winnerInst =
    completedMatch.winner === "PLAYER_A"
      ? completedMatch.institutionA
      : completedMatch.winner === "PLAYER_B"
      ? completedMatch.institutionB
      : "Qualified University";

  if (!winnerName || isPlaceholderSlot(winnerName)) return 0;

  // Find matches that reference this match number or ID
  const allFutureMatches = await tx.match.findMany({
    where: {
      status: { in: [MATCH_STATUS.SCHEDULED, MATCH_STATUS.UPCOMING, MATCH_STATUS.READY, "UPCOMING", "SCHEDULED"] },
    },
  });

  let resolvedCount = 0;
  const matchNum = completedMatch.matchNumber.trim().toUpperCase();
  const matchId = completedMatch.id;

  for (const futureMatch of allFutureMatches) {
    let updatedA = false;
    let updatedB = false;
    let nextPlayerA = futureMatch.playerA;
    let nextInstA = futureMatch.institutionA;
    let nextPlayerB = futureMatch.playerB;
    let nextInstB = futureMatch.institutionB;

    const checkSlot = (slot: string) => {
      const u = (slot || "").toUpperCase();
      return (
        u.includes(`WINNER OF ${matchNum}`) ||
        u.includes(`WINNER_OF_${matchNum}`) ||
        u.includes(`WINNER OF MATCH ${matchNum}`) ||
        u.includes(`WINNER_OF_MATCH_${matchNum}`) ||
        u.includes(matchNum) ||
        u.includes(matchId)
      );
    };

    if (checkSlot(futureMatch.playerA)) {
      nextPlayerA = winnerName;
      nextInstA = winnerInst;
      updatedA = true;
    }

    if (checkSlot(futureMatch.playerB)) {
      nextPlayerB = winnerName;
      nextInstB = winnerInst;
      updatedB = true;
    }

    if (updatedA || updatedB) {
      const readyForPlay = !isPlaceholderSlot(nextPlayerA) && !isPlaceholderSlot(nextPlayerB);
      const newStatus = readyForPlay ? MATCH_STATUS.READY : futureMatch.status;

      await tx.match.update({
        where: { id: futureMatch.id },
        data: {
          playerA: nextPlayerA,
          institutionA: nextInstA,
          playerB: nextPlayerB,
          institutionB: nextInstB,
          status: newStatus,
        },
      });

      resolvedCount++;
    }
  }

  return resolvedCount;
}
