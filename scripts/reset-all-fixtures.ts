import { resetFixtureGraph } from "../src/lib/tournament/fixtureService";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Resetting fixture graph, positions, matches, and bracket slots...");

  // 1. Reset fixture positions and matches to clean TBD
  const res = await resetFixtureGraph("admin@szwbt2026.edu");
  console.log("Fixture graph reset:", res);

  // 2. Reset all bracket slot assignments
  await prisma.$executeRawUnsafe(`
    UPDATE "bracket_slot_assignments"
    SET "teamId" = NULL, "teamCode" = NULL, "teamNumber" = NULL, "teamName" = NULL, "state" = NULL, "assignedBy" = NULL, "updatedAt" = CURRENT_TIMESTAMP
  `);
  console.log("All 120 bracket slots cleared.");

  // Verify
  const assignedSlots: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM "bracket_slot_assignments" WHERE "teamId" IS NOT NULL`
  );
  console.log("Assigned slots remaining:", assignedSlots.length);

  const assignedPositions = await prisma.fixturePosition.findMany({
    where: { status: { in: ["ASSIGNED", "FIXED"] } }
  });
  console.log("Assigned/Fixed positions remaining:", assignedPositions.length);

  const assignedMatches = await prisma.match.findMany({
    where: { OR: [{ teamAId: { not: null } }, { teamBId: { not: null } }] }
  });
  console.log("Matches with assigned teams remaining:", assignedMatches.length);

  await prisma.$disconnect();
}

main().catch(console.error);
