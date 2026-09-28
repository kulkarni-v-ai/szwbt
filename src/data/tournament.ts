export interface TournamentInfo {
  name: string;
  edition: string;
  tagline: string;
  dates: string;
  venue: string;
  organizer: string;
  status: string;
  totalCategories: string;
  totalParticipants: string;
  totalMatches: string;
  activeCourts: string;
}

export const TOURNAMENT_DATA: TournamentInfo = {
  name: "SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026",
  edition: "2026 EDITION",
  tagline: "THE SOUTH CONVERGES. THE COURT DECIDES.",
  dates: "OCTOBER 18 – 21, 2026",
  venue: "Dr. Prabhakar Kore Sports Arena , K L E Tech University - Hubballi",
  organizer: "SOUTH ZONE WOMEN'S BADMINTON FEDERATION",
  status: "REGISTRATION OPEN",
  totalCategories: "5 CATEGORIES",
  totalParticipants: "1000+ PARTICIPANTS",
  totalMatches: "128 MATCHES",
  activeCourts: "4 COURTS",
};

export interface CategoryItem {
  id: string;
  code: string;
  name: string;
  type: string;
  eligibility: string;
  fee: string;
  maxEntries: string;
}

export const CATEGORIES_DATA: CategoryItem[] = [
  { id: "cat-1", code: "WS-U19", name: "Women's Singles U-19", type: "Singles", eligibility: "FEMALE ATHLETES U-19", fee: "₹ 1,200", maxEntries: "64 Entries" },
  { id: "cat-2", code: "WD-U19", name: "Women's Doubles U-19", type: "Doubles", eligibility: "FEMALE PAIRS U-19", fee: "₹ 2,000", maxEntries: "32 Teams" },
  { id: "cat-3", code: "WS-OPEN", name: "Women's Singles Open", type: "Singles", eligibility: "FEMALE ATHLETES OPEN", fee: "₹ 1,500", maxEntries: "64 Entries" },
  { id: "cat-4", code: "WD-OPEN", name: "Women's Doubles Open", type: "Doubles", eligibility: "FEMALE PAIRS OPEN", fee: "₹ 2,500", maxEntries: "32 Teams" },
  { id: "cat-5", code: "TEAM-INST", name: "Institution Teams", type: "Team", eligibility: "COLLEGE / UNIVERSITY TEAMS", fee: "₹ 5,000", maxEntries: "32 Institutions" },
];

export const VENUE_DETAILS_DATA = {
  name: "Dr. Prabhakar Kore Sports Arena , K L E Tech University",
  city: "HUBBALLI",
  state: "KARNATAKA",
  courtsCount: 4,
  facilities: [
    "4 BWF-APPROVED SYNTHETIC COURTS",
    "ARCADE HUD SCOREBOARDS",
    "PLAYER RECOVERY & PHYSIO ZONE",
    "SHALMALA & VINDHYA ATHLETE RESIDENCES",
    "SPECTATOR SEATING (600 CAP)",
  ],
  policyNote: "Official championship rules ratified by South Zone Badminton Association. BWF scoring system (best of 3 games to 21 points)."
};
