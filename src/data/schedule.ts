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

export const MATCHES_DATA: MatchItem[] = [
  {
    id: "m-101",
    matchNumber: "M-001",
    category: "WS-U19",
    court: "COURT 01",
    time: "10:00 AM",
    playerA: "Ananya Sharma",
    institutionA: "Karnataka State University",
    playerB: "Priya Nair",
    institutionB: "Kerala Sports Academy",
    scoreA: [21, 18, 14],
    scoreB: [19, 21, 11],
    currentSet: 3,
    status: "LIVE",
  },
  {
    id: "m-102",
    matchNumber: "M-002",
    category: "WS-SENIOR",
    court: "COURT 02",
    time: "10:30 AM",
    playerA: "Kavya Sundaram",
    institutionA: "Tamil Nadu Badminton Institute",
    playerB: "Riya Reddy",
    institutionB: "Telangana Sports College",
    scoreA: [21, 21],
    scoreB: [14, 16],
    currentSet: 2,
    status: "COMPLETED",
  },
  {
    id: "m-103",
    matchNumber: "M-003",
    category: "WD-U19",
    court: "COURT 03",
    time: "11:15 AM",
    playerA: "KARNATAKA TITANS PAIR A",
    institutionA: "Karnataka State University",
    playerB: "KERALA STRIKERS PAIR B",
    institutionB: "Kerala Sports Academy",
    scoreA: [18],
    scoreB: [20],
    currentSet: 1,
    status: "LIVE",
  },
  {
    id: "m-104",
    matchNumber: "M-004",
    category: "WS-SENIOR",
    court: "COURT 04",
    time: "12:00 PM",
    playerA: "Divya K",
    institutionA: "Karnataka State University",
    playerB: "Meera Patel",
    institutionB: "Andhra Sports University",
    scoreA: [0],
    scoreB: [0],
    currentSet: 1,
    status: "UPCOMING",
  },
];

export interface CourtStatus {
  courtId: string;
  name: string;
  status: "LIVE" | "READY" | "BREAK" | "DELAYED";
  currentMatchId?: string;
  umpire: string;
}

export const COURTS_DATA: CourtStatus[] = [
  { courtId: "c1", name: "COURT 01", status: "LIVE", currentMatchId: "m-101", umpire: "Umpire A" },
  { courtId: "c2", name: "COURT 02", status: "READY", currentMatchId: undefined, umpire: "Umpire B" },
  { courtId: "c3", name: "COURT 03", status: "LIVE", currentMatchId: "m-103", umpire: "Umpire C" },
  { courtId: "c4", name: "COURT 04", status: "READY", currentMatchId: undefined, umpire: "Umpire D" },
  { courtId: "c5", name: "COURT 05", status: "DELAYED", currentMatchId: undefined, umpire: "Umpire E" },
  { courtId: "c6", name: "COURT 06", status: "BREAK", currentMatchId: undefined, umpire: "Umpire F" },
  { courtId: "c7", name: "COURT 07", status: "READY", currentMatchId: undefined, umpire: "Umpire G" },
  { courtId: "c8", name: "COURT 08", status: "READY", currentMatchId: undefined, umpire: "Umpire H" },
];
