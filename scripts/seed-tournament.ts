import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTournament() {
  console.log("Seeding Tournament Administration data...");

  // 1. Categories
  const categories = [
    {
      name: "Women's Singles",
      code: "WS",
      description: "Individual Women's Singles Championship for South Zone universities",
      status: "ACTIVE",
      format: "KNOCKOUT",
      eligibility: "Bona fide female students from recognized South Zone universities",
    },
    {
      name: "Women's Doubles",
      code: "WD",
      description: "Individual Women's Doubles Championship for South Zone universities",
      status: "ACTIVE",
      format: "KNOCKOUT",
      eligibility: "Bona fide female student pairs from recognized South Zone universities",
    },
    {
      name: "Institution Teams",
      code: "TEAM",
      description: "Inter-University Team Championship representing official delegations",
      status: "ACTIVE",
      format: "KNOCKOUT",
      eligibility: "Accredited university team delegations with manager and coach sign-off",
    },
  ];

  for (const cat of categories) {
    const upsertedCat = await prisma.tournamentCategory.upsert({
      where: { code: cat.code },
      update: {
        name: cat.name,
        description: cat.description,
        status: cat.status,
        format: cat.format,
        eligibility: cat.eligibility,
      },
      create: cat,
    });

    // 2. Events under each Category
    if (cat.code === "WS") {
      const wsEvent = await prisma.tournamentEvent.upsert({
        where: { code: "WS_MAIN" },
        update: {
          name: "Women's Singles Championship",
          status: "OPEN",
          format: "KNOCKOUT",
          maxEntries: 64,
          seedCount: 8,
        },
        create: {
          categoryId: upsertedCat.id,
          name: "Women's Singles Championship",
          code: "WS_MAIN",
          status: "OPEN",
          format: "KNOCKOUT",
          maxEntries: 64,
          seedCount: 8,
        },
      });

      // WS Rounds
      const wsRounds = [
        { name: "Round of 64", code: "R64", sequence: 1, status: "COMPLETED", matchCount: 32 },
        { name: "Round of 32", code: "R32", sequence: 2, status: "IN_PROGRESS", matchCount: 16 },
        { name: "Round of 16", code: "R16", sequence: 3, status: "SCHEDULED", matchCount: 8 },
        { name: "Quarter-Finals", code: "QF", sequence: 4, status: "SCHEDULED", matchCount: 4 },
        { name: "Semi-Finals", code: "SF", sequence: 5, status: "PENDING", matchCount: 2 },
        { name: "Grand Finals", code: "FINAL", sequence: 6, status: "PENDING", matchCount: 1 },
      ];

      for (const r of wsRounds) {
        const existing = await prisma.tournamentRound.findFirst({
          where: { eventId: wsEvent.id, code: r.code },
        });
        if (!existing) {
          await prisma.tournamentRound.create({
            data: {
              eventId: wsEvent.id,
              ...r,
            },
          });
        }
      }
    } else if (cat.code === "WD") {
      const wdEvent = await prisma.tournamentEvent.upsert({
        where: { code: "WD_MAIN" },
        update: {
          name: "Women's Doubles Championship",
          status: "OPEN",
          format: "KNOCKOUT",
          maxEntries: 32,
          seedCount: 4,
        },
        create: {
          categoryId: upsertedCat.id,
          name: "Women's Doubles Championship",
          code: "WD_MAIN",
          status: "OPEN",
          format: "KNOCKOUT",
          maxEntries: 32,
          seedCount: 4,
        },
      });

      const wdRounds = [
        { name: "Round of 32", code: "R32", sequence: 1, status: "SCHEDULED", matchCount: 16 },
        { name: "Round of 16", code: "R16", sequence: 2, status: "SCHEDULED", matchCount: 8 },
        { name: "Quarter-Finals", code: "QF", sequence: 3, status: "SCHEDULED", matchCount: 4 },
        { name: "Semi-Finals", code: "SF", sequence: 4, status: "PENDING", matchCount: 2 },
        { name: "Grand Finals", code: "FINAL", sequence: 5, status: "PENDING", matchCount: 1 },
      ];

      for (const r of wdRounds) {
        const existing = await prisma.tournamentRound.findFirst({
          where: { eventId: wdEvent.id, code: r.code },
        });
        if (!existing) {
          await prisma.tournamentRound.create({
            data: {
              eventId: wdEvent.id,
              ...r,
            },
          });
        }
      }
    } else if (cat.code === "TEAM") {
      const teamEvent = await prisma.tournamentEvent.upsert({
        where: { code: "TEAM_MAIN" },
        update: {
          name: "Inter-University Team Championship",
          status: "OPEN",
          format: "KNOCKOUT",
          maxEntries: 24,
          seedCount: 4,
        },
        create: {
          categoryId: upsertedCat.id,
          name: "Inter-University Team Championship",
          code: "TEAM_MAIN",
          status: "OPEN",
          format: "KNOCKOUT",
          maxEntries: 24,
          seedCount: 4,
        },
      });

      const teamRounds = [
        { name: "Group Qualifying", code: "GRP", sequence: 1, status: "COMPLETED", matchCount: 12 },
        { name: "Quarter-Finals", code: "QF", sequence: 2, status: "SCHEDULED", matchCount: 4 },
        { name: "Semi-Finals", code: "SF", sequence: 3, status: "PENDING", matchCount: 2 },
        { name: "Grand Finals", code: "FINAL", sequence: 4, status: "PENDING", matchCount: 1 },
      ];

      for (const r of teamRounds) {
        const existing = await prisma.tournamentRound.findFirst({
          where: { eventId: teamEvent.id, code: r.code },
        });
        if (!existing) {
          await prisma.tournamentRound.create({
            data: {
              eventId: teamEvent.id,
              ...r,
            },
          });
        }
      }
    }
  }

  // 3. Tournament Milestones
  const milestones = [
    {
      title: "Official Team Registration Opens",
      category: "REGISTRATION",
      targetDate: new Date("2026-09-01T00:00:00Z"),
      completedAt: new Date("2026-09-01T00:00:00Z"),
      status: "COMPLETED",
      description: "University portal opened for preliminary team submissions and manager accounts.",
      sequence: 1,
    },
    {
      title: "Team Document Verification & Sign-off",
      category: "TECHNICAL",
      targetDate: new Date("2026-10-10T18:00:00Z"),
      completedAt: new Date("2026-10-10T17:30:00Z"),
      status: "COMPLETED",
      description: "Verification of eligibility certificates, medical clearances, and student IDs.",
      sequence: 2,
    },
    {
      title: "Official Draw & Schedule Release",
      category: "TECHNICAL",
      targetDate: new Date("2026-10-15T12:00:00Z"),
      completedAt: new Date("2026-10-15T11:45:00Z"),
      status: "COMPLETED",
      description: "BWF-compliant random draw broadcasted with seeded player placements.",
      sequence: 3,
    },
    {
      title: "Tournament Opening Ceremony & Day 1 Play",
      category: "CEREMONY",
      targetDate: new Date("2026-10-18T08:30:00Z"),
      status: "IN_PROGRESS",
      description: "Parade of participating universities, oath of players, and commencement of Round 1.",
      sequence: 4,
    },
    {
      title: "Quarter-Finals & Semi-Finals Showcase",
      category: "COMPETITION",
      targetDate: new Date("2026-10-20T09:00:00Z"),
      status: "PENDING",
      description: "Broadcasted knockout stages across Arena Courts 01 through 04.",
      sequence: 5,
    },
    {
      title: "Championship Finals & Trophy Presentation",
      category: "CEREMONY",
      targetDate: new Date("2026-10-21T15:00:00Z"),
      status: "PENDING",
      description: "Singles, Doubles, and Team finals followed by All-India qualifying awards.",
      sequence: 6,
    },
  ];

  for (const m of milestones) {
    const existing = await prisma.tournamentMilestone.findFirst({
      where: { title: m.title },
    });
    if (!existing) {
      await prisma.tournamentMilestone.create({ data: m });
    }
  }

  // 4. Schedule Lock initialization
  await prisma.scheduleLock.upsert({
    where: { id: "CURRENT_SCHEDULE_LOCK" },
    update: {},
    create: {
      id: "CURRENT_SCHEDULE_LOCK",
      isLocked: false,
    },
  });

  // 5. Update Court details
  const courts = await prisma.court.findMany();
  for (const c of courts) {
    await prisma.court.update({
      where: { id: c.id },
      data: {
        venue: "KLE Tech Indoor Stadium, Hubballi",
        isActive: true,
        notes: `Synthetic Badminton Court with BWF Grade 1 Matting`,
      },
    });
  }

  console.log("Tournament Administration data seeded successfully!");
}

seedTournament()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
