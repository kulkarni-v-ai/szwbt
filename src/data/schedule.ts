export interface MatchItem {
  id: string;
  matchNumber: string;
  category: string;
  court: string;
  time: string;
  playerA: string;
  institutionA: string;
  playerB: string;
  institutionB: string;
  scoreA: number[];
  scoreB: number[];
  currentSet: number;
  status: "LIVE" | "UPCOMING" | "COMPLETED" | "DELAYED";
}

export const MATCHES_DATA: MatchItem[] = [];

export interface CourtStatus {
  courtId: string;
  name: string;
  status: "LIVE" | "READY" | "BREAK" | "DELAYED";
  currentMatchId?: string;
  umpire: string;
}

export const COURTS_DATA: CourtStatus[] = [
  { courtId: "c1", name: "COURT 01", status: "READY", currentMatchId: undefined, umpire: "Unassigned" },
  { courtId: "c2", name: "COURT 02", status: "READY", currentMatchId: undefined, umpire: "Unassigned" },
  { courtId: "c3", name: "COURT 03", status: "READY", currentMatchId: undefined, umpire: "Unassigned" },
  { courtId: "c4", name: "COURT 04", status: "READY", currentMatchId: undefined, umpire: "Unassigned" },
  { courtId: "c5", name: "COURT 05", status: "READY", currentMatchId: undefined, umpire: "Unassigned" },
  { courtId: "c6", name: "COURT 06", status: "READY", currentMatchId: undefined, umpire: "Unassigned" },
  { courtId: "c7", name: "COURT 07", status: "READY", currentMatchId: undefined, umpire: "Unassigned" },
  { courtId: "c8", name: "COURT 08", status: "READY", currentMatchId: undefined, umpire: "Unassigned" },
];
