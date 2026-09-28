export interface ScheduleMatch {
  id: string;
  time: string;
  category: string;
  court: string;
  matchNumber: string;
  playerA: string;
  institutionA: string;
  playerB: string;
  institutionB: string;
  scoreA?: number[];
  scoreB?: number[];
  status: "LIVE" | "UPCOMING" | "COMPLETED";
}

export const INITIAL_SCHEDULE: Record<string, ScheduleMatch[]> = {
  OCT18: [],
  OCT19: [],
  OCT20: [],
  OCT21: [],
};

const STORAGE_KEY = "szwbt_tournament_schedule_v2";

export function getStoredSchedule(): Record<string, ScheduleMatch[]> {
  if (typeof window === "undefined") return INITIAL_SCHEDULE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SCHEDULE));
      return INITIAL_SCHEDULE;
    }
    const parsed = JSON.parse(raw);
    return {
      OCT18: Array.isArray(parsed.OCT18) ? parsed.OCT18 : INITIAL_SCHEDULE.OCT18,
      OCT19: Array.isArray(parsed.OCT19) ? parsed.OCT19 : [],
      OCT20: Array.isArray(parsed.OCT20) ? parsed.OCT20 : [],
      OCT21: Array.isArray(parsed.OCT21) ? parsed.OCT21 : [],
    };
  } catch (err) {
    console.error("Failed to load schedule from storage", err);
    return INITIAL_SCHEDULE;
  }
}

export function saveDaySchedule(dayId: string, matches: ScheduleMatch[]): void {
  if (typeof window === "undefined") return;
  const current = getStoredSchedule();
  current[dayId] = matches;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent("szwbt_schedule_updated", { detail: { dayId, matches } }));
}

export function resetDaySchedule(dayId: string): void {
  if (typeof window === "undefined") return;
  const current = getStoredSchedule();
  current[dayId] = [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent("szwbt_schedule_updated", { detail: { dayId, matches: [] } }));
}

/**
 * Parses CSV lines into ScheduleMatch items.
 * Expected columns (case-insensitive, flexible):
 * Time, Category, Court, MatchNumber, PlayerA, InstitutionA, PlayerB, InstitutionB, Status
 */
export function parseScheduleCSV(csvText: string, dayId: string): ScheduleMatch[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Remove header row if present
  let startIndex = 0;
  const firstLine = lines[0].toLowerCase();
  if (
    firstLine.includes("time") ||
    firstLine.includes("category") ||
    firstLine.includes("court") ||
    firstLine.includes("player")
  ) {
    startIndex = 1;
  }

  const results: ScheduleMatch[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    // Split on commas not enclosed in quotes
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const cols: string[] = [];
    let match;
    while ((match = regex.exec(rawLine)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      let val = match[1] ?? "";
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      cols.push(val.trim());
      if (regex.lastIndex >= rawLine.length) break;
    }

    if (cols.length >= 6) {
      const time = cols[0] || "10:00 IST";
      const category = cols[1] || "Women's Singles";
      const court = cols[2] || "Court 01";
      const matchNumber = cols[3] || `Match ${i}`;
      const playerA = cols[4] || "TBA";
      const institutionA = cols[5] || "TBA";
      const playerB = cols[6] || "TBA";
      const institutionB = cols[7] || "TBA";
      let statusRaw = (cols[8] || "UPCOMING").toUpperCase().trim();
      let status: "LIVE" | "UPCOMING" | "COMPLETED" = "UPCOMING";
      if (statusRaw.includes("LIVE")) status = "LIVE";
      else if (statusRaw.includes("COMPLET")) status = "COMPLETED";

      results.push({
        id: `${dayId.toLowerCase()}-m${i}`,
        time: time.includes("IST") ? time : `${time} IST`,
        category,
        court,
        matchNumber,
        playerA,
        institutionA,
        playerB,
        institutionB,
        status,
      });
    }
  }

  return results;
}

export function getSampleCSV(dayId: string): string {
  switch (dayId) {
    case "OCT19":
      return `Time,Category,Court,MatchNumber,PlayerA,InstitutionA,PlayerB,InstitutionB,Status
09:00 IST,Women's Singles,Court 01,R2 - Match 1,Sneha Hegde,Mysore University,Divya R.,Madras University,UPCOMING
10:30 IST,Women's Doubles,Court 02,R2 - Match 2,A. Rao / T. Hegde,KLE Tech Hubballi,S. Khan / N. Pillai,MG University Kottayam,UPCOMING
12:00 IST,Women's Singles,Court 01,QF - Match 1,Ananya Sharma,KLE Tech Hubballi,Pooja Verma,Osmania University,UPCOMING
14:00 IST,Women's Doubles,Court 03,QF - Match 2,K. Reddy / M. Shah,Osmania University,P. Nair / A. Rao,Kerala Sports Academy,UPCOMING
16:00 IST,Institution Teams,Court 01,QF - Tie 1,KLE Tech Titans,KLE Tech Hubballi,Calicut Smashers,University of Calicut,UPCOMING
17:30 IST,Institution Teams,Court 02,QF - Tie 2,Anna Univ Strikers,Anna University,NIT Warriors,NIT Trichy,UPCOMING`;

    case "OCT20":
      return `Time,Category,Court,MatchNumber,PlayerA,InstitutionA,PlayerB,InstitutionB,Status
10:00 IST,Women's Singles,Court 01,SF - Match 1,Semi-Finalist 1,KLE Tech Hubballi,Semi-Finalist 2,Madras University,UPCOMING
11:30 IST,Women's Singles,Court 01,SF - Match 2,Semi-Finalist 3,Osmania University,Semi-Finalist 4,Kerala Sports Academy,UPCOMING
14:00 IST,Women's Doubles,Court 01,SF - Match 1,Semi-Finalist Pair 1,KLE Tech Hubballi,Semi-Finalist Pair 2,Kerala Sports Academy,UPCOMING
16:00 IST,Institution Teams,Court 01,SF - Tie 1,Semi-Final Team A,KLE Tech Titans,Semi-Final Team B,Anna Univ Strikers,UPCOMING`;

    case "OCT21":
      return `Time,Category,Court,MatchNumber,PlayerA,InstitutionA,PlayerB,InstitutionB,Status
10:00 IST,Mixed Doubles,Court 01,FINAL - Mixed,Grand Finalist Pair A,KLE Tech Hubballi,Grand Finalist Pair B,Osmania University,UPCOMING
13:00 IST,Women's Doubles,Court 01,FINAL - Doubles,Championship Pair 1,KLE Tech Hubballi,Championship Pair 2,Kerala Sports Academy,UPCOMING
15:30 IST,Women's Singles,Court 01,GRAND FINAL - Singles,Championship Finalist 1,KLE Tech Hubballi,Championship Finalist 2,Madras University,UPCOMING
18:00 IST,Ceremony,Center Stage,Podium & Awards,Medal Ceremony & Trophies,KLE Tech Arena Main Hall,Banquet & Closing,South Zone Federation,UPCOMING`;

    default:
      return `Time,Category,Court,MatchNumber,PlayerA,InstitutionA,PlayerB,InstitutionB,Status
09:00 IST,Women's Singles,Court 01,R1 - Match 1,Ananya Sharma,KLE Technological University,Priya Nair,Calicut University,LIVE
10:30 IST,Women's Doubles,Court 02,R1 - Match 2,V. Menon / S. Iyer,NIT Trichy,K. Reddy / M. Shah,Osmania University,COMPLETED
12:00 IST,Women's Singles,Court 01,R1 - Match 3,Kavya Sundaram,Anna University,Riya Patel,Andhra University,UPCOMING
14:00 IST,Women's Doubles,Court 03,R1 - Match 4,P. Nair / A. Rao,Kerala Sports Academy,D. Roy / S. Das,Bangalore University,UPCOMING
16:00 IST,Institution Teams,Court 01,R1 - Tie 1,KLE Tech Titans,KLE Tech Hubballi,Anna Univ Strikers,Anna University Chennai,UPCOMING
17:30 IST,Institution Teams,Court 02,R1 - Tie 2,Calicut Smashers,University of Calicut,NIT Warriors,NIT Trichy,UPCOMING`;
  }
}
