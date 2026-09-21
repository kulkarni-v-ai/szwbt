export interface Announcement {
  id: string;
  title: string;
  category: "IMPORTANT" | "SCHEDULE" | "VENUE" | "GENERAL";
  date: string;
  summary: string;
  fullText: string;
  pinned: boolean;
}

export const ANNOUNCEMENTS_DATA: Announcement[] = [
  {
    id: "ann-1",
    title: "OFFICIAL CHAMPIONSHIP ANNOUNCEMENT 2026",
    category: "IMPORTANT",
    date: "COMING SOON",
    summary: "Welcome to the South Zone Women's Badminton Tournament 2026 official portal.",
    fullText: "Welcome athletes, officials, and team managers to the South Zone Women's Badminton Tournament 2026. All registration protocols, venue maps, and hostel allocation rules are active.",
    pinned: true,
  },
  {
    id: "ann-2",
    title: "TEAM MANAGER ORIENTATION BRIEFING",
    category: "SCHEDULE",
    date: "COMING SOON",
    summary: "Team manager briefing schedule and credentials verification process will be broadcast prior to match day.",
    fullText: "All institution team managers must attend the mandatory technical briefing. Meeting links and credential verification tokens will be provided inside the Team Manager Hub.",
    pinned: false,
  },
  {
    id: "ann-3",
    title: "ACCOMMODATION & SHUTTLE BUS GUIDELINES",
    category: "VENUE",
    date: "COMING SOON",
    summary: "Shalmala Hostel & Vindhya Boys Hostel shuttle services run every 15 minutes to the Main Arena.",
    fullText: "Participants allocated to Shalmala Hostel and team managers allocated to Vindhya Boys Hostel can board the official shuttle buses using their QR Access Pass.",
    pinned: false,
  },
];
