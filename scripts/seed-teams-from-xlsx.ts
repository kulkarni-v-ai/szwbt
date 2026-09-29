import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface ExtractedTeam {
  row: number;
  university: string;
  state: string;
}

export async function seedOriginalTeamsFromXlsx() {
  console.log("============================================================");
  console.log("SEEDING 101 ORIGINAL UNIVERSITIES FROM TEAMS_DETAILS.XLSX");
  console.log("============================================================");

  // 1. Read the extracted teams JSON
  const jsonPath = path.join(__dirname, "extracted_teams.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`extracted_teams.json not found at ${jsonPath}`);
  }
  const rawList: ExtractedTeam[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Loaded ${rawList.length} universities from JSON.`);

  if (rawList.length !== 101) {
    console.warn(`Warning: Expected 101 universities, found ${rawList.length}`);
  }

  // 2. Clear Fixture Assignments, Matches, Draw History, and Fixture Config
  console.log("\n--- Step 1: Clearing Hardcoded Fixtures & Resetting Graph ---");

  // A. Reset all 100 FixturePositions to AVAILABLE
  const posReset = await prisma.fixturePosition.updateMany({
    data: {
      status: "AVAILABLE",
      isFixed: false,
      fixedReason: null,
      teamId: null,
      teamName: null,
      institution: null,
      drawNumber: null,
      assignedAt: null,
      assignedBy: null,
    },
  });
  console.log(`Reset ${posReset.count} fixture positions to AVAILABLE.`);

  // B. Reset all tournament matches (M001 to M100)
  const matches = await prisma.match.findMany({
    where: { publicMatchNumber: { not: null } },
  });

  for (const m of matches) {
    const playerA = m.sourceAType === "POSITION" ? `TBD (${m.sourceAPositionId})` : `Winner of ${m.sourceAMatchNumber}`;
    const playerB =
      m.sourceBType === "POSITION"
        ? `TBD (${m.sourceBPositionId})`
        : m.sourceBType === "LOSER"
        ? `Loser of ${m.sourceBMatchNumber}`
        : `Winner of ${m.sourceBMatchNumber}`;

    await prisma.match.update({
      where: { id: m.id },
      data: {
        playerA,
        institutionA: "",
        playerB,
        institutionB: "",
        scoreA: null,
        scoreB: null,
        status: "UPCOMING",
        winner: null,
        teamAId: null,
        teamBId: null,
      },
    });
  }
  console.log(`Reset ${matches.length} tournament matches back to TBD/UPCOMING.`);

  // Clear tournament match events
  const mIds = matches.map((m) => m.id);
  if (mIds.length > 0) {
    const delEvents = await prisma.matchEvent.deleteMany({
      where: { matchId: { in: mIds } },
    });
    console.log(`Deleted ${delEvents.count} match events.`);
  }

  // C. Clear Draw History
  const delHistory = await prisma.drawHistory.deleteMany({});
  console.log(`Cleared ${delHistory.count} draw history records.`);

  // D. Reset FixtureConfig to DRAFT, Draw #1, Pool A First
  await prisma.fixtureConfig.upsert({
    where: { id: "SZWBT-2026-FIXTURE" },
    update: {
      status: "DRAFT",
      totalTeams: 100,
      teamsPerPool: 25,
      currentDrawNumber: 1,
      currentPool: "A",
      currentSide: "FIRST",
      currentPositionId: null,
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
      isPublished: false,
      publishedAt: null,
      publishedBy: null,
      version: 1,
    },
    create: {
      id: "SZWBT-2026-FIXTURE",
      status: "DRAFT",
      totalTeams: 100,
      teamsPerPool: 25,
      currentDrawNumber: 1,
      currentPool: "A",
      currentSide: "FIRST",
      currentPositionId: null,
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
      isPublished: false,
      publishedAt: null,
      publishedBy: null,
      version: 1,
    },
  });
  console.log("Fixture Config reset to DRAFT, position draw #1 (Pool A FIRST).");

  // 3. Remove hardcoded/mock/dummy teams from database
  console.log("\n--- Step 2: Removing Old Mock / Hardcoded Teams ---");

  // Find teams that are NOT part of the real universities or are test teams
  // Let's identify the 101 university names for clean matching
  const validUnivNames = new Set(rawList.map((r) => r.university.toLowerCase()));

  // Specifically clean dummy links on junk teams (TM-SZ-101..110, TM-SZ-SPARE, TM-CORR-*, Team - 2, etc.)
  const allCurrentTeams = await prisma.team.findMany();
  for (const t of allCurrentTeams) {
    const isMockTeam =
      t.name.includes("- Team 2") ||
      t.name.includes("- Team 3") ||
      t.name.includes("- Team 4") ||
      t.name.includes("KLE Tech Strikers 179") ||
      t.name.includes("Replacement Team") ||
      t.name.includes("Spare University") ||
      t.name === "TEST" ||
      t.name === "test" ||
      t.teamCode.startsWith("TM-CORR-") ||
      t.teamCode === "TM-SZ-SPARE";

    if (isMockTeam) {
      // Delete any dependent records
      await prisma.teamMember.deleteMany({ where: { teamId: t.id } });
      await prisma.accommodationAllocation.deleteMany({ where: { teamId: t.id } });
      await prisma.transportPassenger.deleteMany({ where: { teamId: t.id } });
      await prisma.feeLedger.deleteMany({ where: { teamId: t.id } });
      await prisma.qrPass.deleteMany({ where: { teamId: t.id } });
      await prisma.foodPackageAssignment.deleteMany({ where: { teamId: t.id } });
      await prisma.user.updateMany({ where: { teamId: t.id }, data: { teamId: null } });
      await prisma.team.delete({ where: { id: t.id } });
      console.log(`Deleted mock team [${t.teamCode}] ${t.name}`);
    }
  }

  // 4. Seed Institutions
  console.log("\n--- Step 3: Seeding Institution Master Data (101 Universities) ---");
  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    const instCode = `SZ-INST-${String(i + 1).padStart(3, "0")}`;
    const parts = item.university.split(",");
    const city = parts.length > 1 ? parts[parts.length - 1].trim() : null;

    await prisma.institution.upsert({
      where: {
        name_state: {
          name: item.university,
          state: item.state,
        },
      },
      update: {
        institutionCode: instCode,
        city,
        status: "ACTIVE",
      },
      create: {
        institutionCode: instCode,
        name: item.university,
        state: item.state,
        city,
        status: "ACTIVE",
      },
    });
  }
  const instCount = await prisma.institution.count();
  console.log(`Total Institutions in database: ${instCount}`);

  // 5. Seed / Update Teams (Exactly 101 Teams)
  console.log("\n--- Step 4: Seeding Exactly 101 Official Tournament Teams ---");

  // Keep Bangalore University mapped to `team-blr-warriors` and KLE Technological University mapped to `team-kle-titans`
  // so existing authorized user accounts stay linked!
  const blrItem = rawList.find((r) => r.university.includes("Bangalore University"));
  const kleItem = rawList.find((r) => r.university.includes("KLE Technological University"));

  // Avoid unique constraint conflicts during renumbering by temporarily prefixing existing team codes
  await prisma.team.updateMany({
    data: {
      teamCode: {
        // We'll update them one by one or set to a temp code
      }
    }
  }).catch(() => {});

  const currentTeamsToReassign = await prisma.team.findMany();
  for (const ct of currentTeamsToReassign) {
    await prisma.team.update({
      where: { id: ct.id },
      data: { teamCode: `TEMP-${ct.id.slice(-8)}-${ct.teamCode}` },
    });
  }

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    const code = `TM-SZ-${String(i + 1).padStart(3, "0")}`;

    // Clean display name (if university has city attached like "University, City", use clean name or full name)
    const displayName = item.university;

    let targetId: string | undefined = undefined;
    if (blrItem && item.university === blrItem.university) {
      targetId = "team-blr-warriors";
    } else if (kleItem && item.university === kleItem.university) {
      targetId = "team-kle-titans";
    }

    if (targetId) {
      // Check if existing
      const existing = await prisma.team.findUnique({ where: { id: targetId } });
      if (existing) {
        await prisma.team.update({
          where: { id: targetId },
          data: {
            teamCode: code,
            name: displayName,
            institution: item.university,
            state: item.state,
            status: "COMPLETED",
          },
        });
        console.log(`Updated authoritative team [${code}] ${displayName} (ID: ${targetId})`);
        continue;
      }
    }

    // Upsert by teamCode
    const existingByCode = await prisma.team.findUnique({ where: { teamCode: code } });
    if (existingByCode) {
      await prisma.team.update({
        where: { teamCode: code },
        data: {
          name: displayName,
          institution: item.university,
          state: item.state,
          status: "COMPLETED",
        },
      });
    } else {
      await prisma.team.create({
        data: {
          ...(targetId ? { id: targetId } : {}),
          teamCode: code,
          name: displayName,
          institution: item.university,
          state: item.state,
          status: "COMPLETED",
          managerName: `Manager ${code}`,
          managerPhone: `+91 98765 ${String(10000 + i + 1).slice(-5)}`,
          captainName: `Captain ${code}`,
          captainPhone: `+91 91234 ${String(10000 + i + 1).slice(-5)}`,
          teamQrToken: `SZ26-TEAM-${String(i + 1).padStart(3, "0")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        },
      });
    }
  }

  // Clean up any remaining teams whose codes are outside TM-SZ-001 to TM-SZ-101
  const validCodes = new Set(rawList.map((_, i) => `TM-SZ-${String(i + 1).padStart(3, "0")}`));
  const leftoverTeams = await prisma.team.findMany({
    where: {
      teamCode: { notIn: Array.from(validCodes) },
    },
  });

  for (const lt of leftoverTeams) {
    await prisma.teamMember.deleteMany({ where: { teamId: lt.id } });
    await prisma.accommodationAllocation.deleteMany({ where: { teamId: lt.id } });
    await prisma.transportPassenger.deleteMany({ where: { teamId: lt.id } });
    await prisma.feeLedger.deleteMany({ where: { teamId: lt.id } });
    await prisma.qrPass.deleteMany({ where: { teamId: lt.id } });
    await prisma.foodPackageAssignment.deleteMany({ where: { teamId: lt.id } });
    await prisma.user.updateMany({ where: { teamId: lt.id }, data: { teamId: null } });
    await prisma.team.delete({ where: { id: lt.id } });
    console.log(`Deleted leftover team [${lt.teamCode}] ${lt.name}`);
  }

  const finalCount = await prisma.team.count();
  console.log(`\n============================================================`);
  console.log(`SUCCESS: Total teams in database: ${finalCount}`);
  console.log(`All hardcoded fixture assignments cleared!`);
  console.log(`Fixture graph ready for sequential draw flow.`);
  console.log(`============================================================`);
}

if (require.main === module) {
  seedOriginalTeamsFromXlsx()
    .catch((err) => {
      console.error("Error seeding original teams:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
