import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding PostgreSQL database szwbt_db...");

  // 1. Seed Tournament Days (OCT 18 is published, OCT 19-21 are unpublished/TBA)
  const days = [
    { id: "OCT18", date: "OCT 18", dayNumber: "Day 1", stage: "Round 1", isPublished: true },
    { id: "OCT19", date: "OCT 19", dayNumber: "Day 2", stage: "Round 2 & QF", isPublished: false },
    { id: "OCT20", date: "OCT 20", dayNumber: "Day 3", stage: "Semi-Finals", isPublished: false },
    { id: "OCT21", date: "OCT 21", dayNumber: "Day 4", stage: "Grand Finals", isPublished: false },
  ];

  for (const day of days) {
    await prisma.tournamentDay.upsert({
      where: { id: day.id },
      update: day,
      create: day,
    });
  }

  // 2. Clear & Seed Day 1 (OCT 18) Matches
  await prisma.match.deleteMany({ where: { dayId: "OCT18" } });

  const oct18Matches = [
    {
      dayId: "OCT18",
      time: "09:00 IST",
      category: "Women's Singles",
      court: "Court 01",
      matchNumber: "R1 - Match 1",
      playerA: "Ananya Sharma",
      institutionA: "KLE Technological University",
      playerB: "Priya Nair",
      institutionB: "Calicut University",
      scoreA: "21,18,14",
      scoreB: "19,21,11",
      status: "LIVE",
    },
    {
      dayId: "OCT18",
      time: "10:30 IST",
      category: "Women's Doubles",
      court: "Court 02",
      matchNumber: "R1 - Match 2",
      playerA: "V. Menon / S. Iyer",
      institutionA: "NIT Trichy",
      playerB: "K. Reddy / M. Shah",
      institutionB: "Osmania University",
      scoreA: "21,21",
      scoreB: "14,16",
      status: "COMPLETED",
    },
    {
      dayId: "OCT18",
      time: "12:00 IST",
      category: "Women's Singles",
      court: "Court 01",
      matchNumber: "R1 - Match 3",
      playerA: "Kavya Sundaram",
      institutionA: "Anna University",
      playerB: "Riya Patel",
      institutionB: "Andhra University",
      status: "UPCOMING",
    },
    {
      dayId: "OCT18",
      time: "14:00 IST",
      category: "Women's Doubles",
      court: "Court 03",
      matchNumber: "R1 - Match 4",
      playerA: "P. Nair / A. Rao",
      institutionA: "Kerala Sports Academy",
      playerB: "D. Roy / S. Das",
      institutionB: "Bangalore University",
      status: "UPCOMING",
    },
    {
      dayId: "OCT18",
      time: "16:00 IST",
      category: "Institution Teams",
      court: "Court 01",
      matchNumber: "R1 - Tie 1",
      playerA: "KLE Tech Titans",
      institutionA: "KLE Tech Hubballi",
      playerB: "Anna Univ Strikers",
      institutionB: "Anna University Chennai",
      status: "UPCOMING",
    },
    {
      dayId: "OCT18",
      time: "17:30 IST",
      category: "Institution Teams",
      court: "Court 02",
      matchNumber: "R1 - Tie 2",
      playerA: "Calicut Smashers",
      institutionA: "University of Calicut",
      playerB: "NIT Warriors",
      institutionB: "NIT Trichy",
      status: "UPCOMING",
    },
  ];

  for (const m of oct18Matches) {
    await prisma.match.create({ data: m });
  }

  // 3. Seed Official Credentials
  const officials = [
    {
      email: "admin@szwbt2026.edu",
      name: "Super Administrator",
      role: "SUPER_ADMIN",
      badge: "LEVEL 04 ROOT",
      password: "szwbt2026pass",
      targetUrl: "/admin",
      description: "Full tournament operations, database administration & 18 dashboard hubs.",
    },
    {
      email: "umpire@szwbt2026.edu",
      name: "Chief Umpire",
      role: "CHIEF_UMPIRE",
      badge: "BWF TECHNICAL",
      password: "szwbt2026pass",
      targetUrl: "/matches",
      description: "Live court scoring console, line judge reports & official match tie sheets.",
    },
    {
      email: "team@szwbt2026.edu",
      name: "Team Manager",
      role: "TEAM_MANAGER",
      badge: "UNIVERSITY DESK",
      password: "szwbt2026pass",
      targetUrl: "/team",
      description: "Roster verification, player passes, transit dispatch & hostel allocations.",
    },
    {
      email: "secretariat@szwbt2026.edu",
      name: "Organizing Desk Secretariat",
      role: "ORGANIZER",
      badge: "SZWBT SECRETARIAT",
      password: "szwbt2026pass",
      targetUrl: "/organizer",
      description: "Overall tournament flow, VIP hospitality, broadcast feeds & arena logistics.",
    },
    {
      email: "player@szwbt2026.edu",
      name: "Ananya Sharma",
      role: "PARTICIPANT",
      badge: "PLAYER HUD",
      password: "szwbt2026pass",
      targetUrl: "/dashboard",
      description: "Athlete accreditation pass, court call timings & hostel bed assignment.",
    },
    {
      email: "techops@szwbt2026.edu",
      name: "Technical Operations Lead",
      role: "OPERATIONS_STAFF",
      badge: "TECHOPS COMMAND",
      password: "szwbt2026pass",
      targetUrl: "/operations",
      description: "Technical match operations, court allocation, umpire assignments & live tournament interventions.",
    },
    {
      email: "scanner@szwbt2026.edu",
      name: "Document Scanner Officer",
      role: "DOCUMENT_SCANNER",
      badge: "DOC SCANNER 01",
      password: "szwbt2026pass",
      targetUrl: "/scanner",
      description: "Mobile document scanner for QR verification, university ID, SSLC & PUC marks card validation.",
    },
    {
      email: "documents@szwbt2026.edu",
      name: "Document Verification Lead",
      role: "DOCUMENT_SCANNER",
      badge: "DOC VERIFICATION",
      password: "szwbt2026pass",
      targetUrl: "/scanner",
      description: "High-throughput document verification desk, OCR matching and athlete eligibility accreditation.",
    },
    {
      email: "volunteer@szwbt2026.edu",
      name: "Field Operations Volunteer",
      role: "VOLUNTEER",
      badge: "MOBILE FIELD",
      password: "szwbt2026pass",
      targetUrl: "/volunteer",
      description: "On-ground task list, participant lookup & quick QR pass scanner.",
    },
  ];

  for (const off of officials) {
    await prisma.official.upsert({
      where: { email: off.email },
      update: off,
      create: off,
    });
  }

  // 4. Seed Courts
  const courts = [
    { courtNumber: "Court 01", status: "LIVE", umpire: "BWF Umpire 1 (Dr. P Kore Arena)" },
    { courtNumber: "Court 02", status: "READY", umpire: "BWF Umpire 2" },
    { courtNumber: "Court 03", status: "READY", umpire: "BWF Umpire 3" },
    { courtNumber: "Court 04", status: "READY", umpire: "BWF Umpire 4" },
    { courtNumber: "Court 05", status: "READY", umpire: "BWF Umpire 5" },
    { courtNumber: "Court 06", status: "READY", umpire: "BWF Umpire 6" },
    { courtNumber: "Court 07", status: "READY", umpire: "BWF Umpire 7" },
    { courtNumber: "Court 08", status: "READY", umpire: "BWF Umpire 8" },
  ];

  for (const court of courts) {
    await prisma.court.upsert({
      where: { courtNumber: court.courtNumber },
      update: court,
      create: court,
    });
  }

  console.log("Database seeded successfully with PostgreSQL!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
