/**
 * Championship Scoring Model & Transition Validation Engine
 * Consumes tournament configuration rules without hardcoding arbitrary rules in UI.
 * Standard BWF 21-point rally scoring system as ratified for South Zone 2026.
 */

export interface ScoringConfig {
  format: "BEST_OF_3" | "BEST_OF_5" | "SINGLE_SET";
  gamesToWin: number;
  pointsPerGame: number;
  extendedPointsMax: number;
  leadPointsRequired: number;
  intervalPoint: number;
  ruleSet: string;
}

/**
 * Returns tournament-configured scoring parameters for a category.
 */
export function getScoringConfigForCategory(category?: string | null): ScoringConfig {
  return {
    format: "BEST_OF_3",
    gamesToWin: 2,
    pointsPerGame: 21,
    extendedPointsMax: 30,
    leadPointsRequired: 2,
    intervalPoint: 11,
    ruleSet: "BWF Standard Championship Rules (Ratified South Zone 2026)",
  };
}

/**
 * Validates whether a proposed score increment from prev to next is legally valid.
 */
export function validateScoreIncrement(
  prevScoreA: number,
  prevScoreB: number,
  pointTo: "PLAYER_A" | "PLAYER_B",
  config: ScoringConfig
): { valid: boolean; newScoreA: number; newScoreB: number; error?: string } {
  // Reject negative scores
  if (prevScoreA < 0 || prevScoreB < 0) {
    return { valid: false, newScoreA: prevScoreA, newScoreB: prevScoreB, error: "Scores cannot be negative." };
  }

  // Check if current game is already won
  const gameWon = evaluateGameWinner(prevScoreA, prevScoreB, config);
  if (gameWon) {
    return {
      valid: false,
      newScoreA: prevScoreA,
      newScoreB: prevScoreB,
      error: `Current game is already finished (${gameWon} won at ${prevScoreA} - ${prevScoreB}).`,
    };
  }

  const newScoreA = pointTo === "PLAYER_A" ? prevScoreA + 1 : prevScoreA;
  const newScoreB = pointTo === "PLAYER_B" ? prevScoreB + 1 : prevScoreB;

  // Cannot exceed extended maximum (30 points)
  if (newScoreA > config.extendedPointsMax || newScoreB > config.extendedPointsMax) {
    return {
      valid: false,
      newScoreA: prevScoreA,
      newScoreB: prevScoreB,
      error: `Score cannot exceed maximum allowed points (${config.extendedPointsMax}).`,
    };
  }

  return { valid: true, newScoreA, newScoreB };
}

/**
 * Evaluates whether a game has reached a winning condition.
 * Rules:
 * - Minimum pointsPerGame (21)
 * - Must lead by leadPointsRequired (2) until extendedPointsMax (30)
 * - At 29-29, 30th point wins regardless of lead.
 */
export function evaluateGameWinner(
  scoreA: number,
  scoreB: number,
  config: ScoringConfig
): "PLAYER_A" | "PLAYER_B" | null {
  // Max cap reached
  if (scoreA >= config.extendedPointsMax) return "PLAYER_A";
  if (scoreB >= config.extendedPointsMax) return "PLAYER_B";

  // Standard win condition (>= 21 and lead >= 2)
  if (scoreA >= config.pointsPerGame && scoreA - scoreB >= config.leadPointsRequired) {
    return "PLAYER_A";
  }
  if (scoreB >= config.pointsPerGame && scoreB - scoreA >= config.leadPointsRequired) {
    return "PLAYER_B";
  }

  return null;
}
