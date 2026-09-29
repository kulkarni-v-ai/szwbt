import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface ExcelEntry {
  num: number;
  name: string;
  state: string;
}

// B/D Pool R1 match flow (8 matches per pool — strictly matching official handwritten bracket)
// 4 sections of 6 rows with byes at top and bottom:
// Section 1 (rows 1-6):   Bye 1,  Pairs (2,3),   (4,5),   Bye 6
// Section 2 (rows 7-12):  Bye 7,  Pairs (8,9),   (10,11), Bye 12
// Section 3 (rows 13-18): Bye 13, Pairs (14,15), (16,17), Bye 18
// Section 4 (rows 19-24): Bye 19, Pairs (20,21), (22,23), Bye 24
// Row 25: Seed with direct bye to Pool Final!
const BD_R1_MATCHES = [
  { matchInPool: 1, slotA: 2,  slotB: 3  },
  { matchInPool: 2, slotA: 4,  slotB: 5  },
  { matchInPool: 3, slotA: 8,  slotB: 9  },
  { matchInPool: 4, slotA: 10, slotB: 11 },
  { matchInPool: 5, slotA: 14, slotB: 15 },
  { matchInPool: 6, slotA: 16, slotB: 17 },
  { matchInPool: 7, slotA: 20, slotB: 21 },
  { matchInPool: 8, slotA: 22, slotB: 23 },
];

// A/C Pool R1 match flow (9 matches per pool — strictly matching official handwritten bracket)
const AC_R1_MATCHES = [
  { matchInPool: 1, slotA: 3,  slotB: 4  },
  { matchInPool: 2, slotA: 5,  slotB: 6  },
  { matchInPool: 3, slotA: 7,  slotB: 8  },
  { matchInPool: 4, slotA: 10, slotB: 11 },
  { matchInPool: 5, slotA: 12, slotB: 13 },
  { matchInPool: 6, slotA: 16, slotB: 17 },
  { matchInPool: 7, slotA: 18, slotB: 19 },
  { matchInPool: 8, slotA: 22, slotB: 23 },
  { matchInPool: 9, slotA: 24, slotB: 25 },
];

const AC_BYE_SLOTS = [2, 9, 14, 15, 20, 21, 26];
const BD_BYE_SLOTS = [1, 6, 7, 12, 13, 18, 19, 24];

async function main() {
  console.log("====================================================================");
  console.log("SEEDING 102 OFFICIAL TEAMS FROM FINAL LIST OF ENTRIES.XLSX");
  console.log("====================================================================");

  // 1. Read JSON extracted from Excel
  const jsonPath = path.resolve(__dirname, "../entries_extracted.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error("entries_extracted.json not found! Run scripts/extract_entries.py first.");
  }

  const entries: ExcelEntry[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`Loaded ${entries.length} entries from Excel.`);

  if (entries.length !== 102) {
    console.warn(`WARNING: Expected 102 entries, got ${entries.length}`);
  }

  // 2. Remove current existing teams and clean dependent references
  console.log("\nCleaning existing teams and references...");

  // Disconnect / clear bracket slot assignments
  try {
    await prisma.bracketSlotAssignment.deleteMany({});
    console.log("  ✔ Cleared bracket_slot_assignments");
  } catch (err: any) {
    console.warn("  Notice: bracket_slot_assignments:", err.message);
  }

  // Clear fixture positions teamId
  try {
    await prisma.fixturePosition.updateMany({
      data: {
        teamId: null,
        teamName: null,
        institution: null,
        status: "AVAILABLE",
        isFixed: false,
        fixedReason: null,
        drawNumber: null,
        assignedAt: null,
        assignedBy: null,
      },
    });
    console.log("  ✔ Reset fixture_positions");
  } catch (err: any) {
    console.warn("  Notice: fixture_positions:", err.message);
  }

  // Clear team members, accommodation, transport, fees, passes, food, draw history
  try {
    await prisma.teamMember.deleteMany({});
  } catch {}
  try {
    await prisma.foodPackageAssignment.deleteMany({});
  } catch {}
  try {
    await prisma.qrPass.deleteMany({});
  } catch {}
  try {
    await prisma.feeLedger.deleteMany({});
  } catch {}
  try {
    await prisma.transportPassenger.deleteMany({});
  } catch {}
  try {
    await prisma.accommodationAllocation.deleteMany({});
  } catch {}
  try {
    await prisma.drawHistory.deleteMany({});
  } catch {}

  // Delete all existing teams
  const deletedTeams = await prisma.team.deleteMany({});
  console.log(`  ✔ Deleted ${deletedTeams.count} existing teams.`);

  // 3. Insert all 102 teams from Final list of entries
  console.log("\nInserting 102 official teams into database...");
  const createdTeams: any[] = [];

  for (const entry of entries) {
    const code = `TM-SZ-${String(entry.num).padStart(3, "0")}`;
    const uniShort = entry.name.split(",")[0].trim();

    const team = await prisma.team.create({
      data: {
        id: `team-sz-${String(entry.num).padStart(3, "0")}`,
        teamCode: code,
        name: entry.name,
        institution: entry.name,
        state: entry.state,
        status: "COMPLETED",
        teamQrToken: `QR-SZ26-${entry.num}`,
        managerName: `Manager (${uniShort})`,
        managerPhone: `+91 98450 ${String(10000 + entry.num).slice(-5)}`,
        captainName: `Captain (${uniShort})`,
        captainPhone: `+91 94480 ${String(10000 + entry.num).slice(-5)}`,
      },
    });
    createdTeams.push(team);
  }
  console.log(`  ✔ Successfully created ${createdTeams.length} official teams.`);

  // 4. Seed all 102 slots in bracket_slot_assignments
  // Pool distribution:
  // Pool A (26): entries 1..26  (slots 1..26)
  // Pool B (25): entries 27..51 (slots 1..25)
  // Pool C (26): entries 52..77 (slots 1..26)
  // Pool D (25): entries 78..102(slots 1..25)
  console.log("\nPopulating bracket_slot_assignments across Pools A, B, C, D...");

  const slotTeamMap: Record<string, any> = {};

  for (const entry of entries) {
    let pool: "A" | "B" | "C" | "D";
    let slot: number;

    if (entry.num <= 26) {
      pool = "A";
      slot = entry.num;
    } else if (entry.num <= 51) {
      pool = "B";
      slot = entry.num - 26;
    } else if (entry.num <= 77) {
      pool = "C";
      slot = entry.num - 51;
    } else {
      pool = "D";
      slot = entry.num - 77;
    }

    const team = createdTeams[entry.num - 1];
    const isAC = pool === "A" || pool === "C";
    const byeSlots = isAC ? AC_BYE_SLOTS : BD_BYE_SLOTS;

    const isByeToFinal = isAC ? slot === 1 : slot === 25;
    const isByeR1 = byeSlots.includes(slot);
    const seed = isAC
      ? (slot === 1 ? (pool === "A" ? 1 : 3) : null)
      : (slot === 25 ? (pool === "B" ? 2 : 4) : null);

    const slotRecord = await prisma.bracketSlotAssignment.create({
      data: {
        id: `slot-${pool}-${slot}`,
        pool,
        slot,
        teamId: team.id,
        teamCode: team.teamCode,
        teamNumber: entry.num,
        teamName: team.name,
        state: team.state,
        seed,
        isByeToFinal,
        isByeR1,
        assignedAt: new Date(),
        assignedBy: "admin@szwbt2026.edu",
      },
    });

    slotTeamMap[`${pool}-${slot}`] = team;
  }
  console.log(`  ✔ Successfully seeded 102 bracket slot assignments.`);

  // 5. Update Round 1 Match records in matches table
  console.log("\nUpdating Round 1 Matches with officially seeded teams...");

  const pools: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];

  for (const pool of pools) {
    const isAC = pool === "A" || pool === "C";
    const r1Flow = isAC ? AC_R1_MATCHES : BD_R1_MATCHES;

    for (let idx = 0; idx < r1Flow.length; idx++) {
      const matchPair = r1Flow[idx];
      let publicMNum = "";

      // In the database:
      // Pool A: M001 to M009 (matches 1 to 9)
      // Pool B: M025 to M032 (matches 25 to 32)
      // Pool C: M049 to M057 (matches 49 to 57)
      // Pool D: M073 to M080 (matches 73 to 80)
      if (pool === "A") {
        publicMNum = `M${String(idx + 1).padStart(3, "0")}`;
      } else if (pool === "B") {
        publicMNum = `M${String(24 + idx + 1).padStart(3, "0")}`;
      } else if (pool === "C") {
        publicMNum = `M${String(48 + idx + 1).padStart(3, "0")}`;
      } else if (pool === "D") {
        publicMNum = `M${String(72 + idx + 1).padStart(3, "0")}`;
      }

      const teamA = slotTeamMap[`${pool}-${matchPair.slotA}`];
      const teamB = slotTeamMap[`${pool}-${matchPair.slotB}`];

      if (teamA && teamB) {
        const existing = await prisma.match.findUnique({
          where: { publicMatchNumber: publicMNum },
        });

        if (existing) {
          await prisma.match.update({
            where: { publicMatchNumber: publicMNum },
            data: {
              playerA: teamA.name,
              institutionA: teamA.institution,
              teamAId: teamA.id,
              playerB: teamB.name,
              institutionB: teamB.institution,
              teamBId: teamB.id,
              status: "READY",
            },
          });
        }
      }
    }
  }
  console.log("  ✔ Successfully wired Round 1 Match records.");

  // 6. Ensure FixtureConfig is updated
  await prisma.fixtureConfig.upsert({
    where: { id: "SZWBT-2026-FIXTURE" },
    update: {
      status: "PUBLISHED",
      isPublished: true,
      isLocked: false,
      totalTeams: 102,
      teamsPerPool: 26,
    },
    create: {
      id: "SZWBT-2026-FIXTURE",
      status: "PUBLISHED",
      isPublished: true,
      isLocked: false,
      totalTeams: 102,
      teamsPerPool: 26,
      currentDrawNumber: 102,
      currentPool: "D",
      currentSide: "LAST",
    },
  });
  console.log("  ✔ FixtureConfig set to PUBLISHED (102 teams total).");

  console.log("\n====================================================================");
  console.log("SEEDING COMPLETED SUCCESSFULLY!");
  console.log("====================================================================");
}

main()
  .catch((e) => {
    console.error("ERROR IN SEEDING:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
