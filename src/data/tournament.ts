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
  name: "SOUTH ZONE WOMEN'S BADMINTON TOURNAMENT 2026",
  edition: "2026 EDITION",
  tagline: "THE SOUTH CONVERGES. THE COURT DECIDES.",
  dates: "COMING SOON",
  venue: "CENTRAL ARENA — SOUTH ZONE",
  organizer: "SOUTH ZONE BADMINTON FEDERATION",
  status: "REGISTRATION OPEN",
  totalCategories: "8 CATEGORIES",
  totalParticipants: "128 PLAYERS",
  totalMatches: "64 MATCHES",
  activeCourts: "8 COURTS",
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
  { id: "cat-1", code: "MS-U19", name: "Men's Singles U-19", type: "Singles", eligibility: "COMING SOON", fee: "₹ —— CONFIGURABLE", maxEntries: "32" },
  { id: "cat-2", code: "WS-U19", name: "Women's Singles U-19", type: "Singles", eligibility: "COMING SOON", fee: "₹ —— CONFIGURABLE", maxEntries: "32" },
  { id: "cat-3", code: "MD-U19", name: "Men's Doubles U-19", type: "Doubles", eligibility: "COMING SOON", fee: "₹ —— CONFIGURABLE", maxEntries: "16 Teams" },
  { id: "cat-4", code: "WD-U19", name: "Women's Doubles U-19", type: "Doubles", eligibility: "COMING SOON", fee: "₹ —— CONFIGURABLE", maxEntries: "16 Teams" },
  { id: "cat-5", code: "XD-U19", name: "Mixed Doubles U-19", type: "Doubles", eligibility: "COMING SOON", fee: "₹ —— CONFIGURABLE", maxEntries: "16 Teams" },
  { id: "cat-6", code: "MS-SENIOR", name: "Men's Singles Open", type: "Singles", eligibility: "COMING SOON", fee: "₹ —— CONFIGURABLE", maxEntries: "64" },
  { id: "cat-7", code: "WS-SENIOR", name: "Women's Singles Open", type: "Singles", eligibility: "COMING SOON", fee: "₹ —— CONFIGURABLE", maxEntries: "64" },
  { id: "cat-8", code: "MD-SENIOR", name: "Men's Doubles Open", type: "Doubles", eligibility: "COMING SOON", fee: "₹ —— CONFIGURABLE", maxEntries: "32 Teams" },
];

export const VENUE_DETAILS_DATA = {
  name: "CENTRAL BADMINTON ARENA",
  city: "SOUTH ZONE",
  state: "SOUTHERN REGION",
  courtsCount: 8,
  facilities: ["ARCADE HUD DISPLAY", "LIVE SATELLITE FEED", "ACCOMMODATION SHUTTLE", "PLAYER LOUNGE"],
  policyNote: "Official rules and guidelines are subject to final publication."
};
