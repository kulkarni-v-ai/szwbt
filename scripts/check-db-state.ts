import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slots: any[] = await prisma.$queryRawUnsafe(
    `SELECT pool, slot, "teamId", "teamName", "teamNumber" FROM "bracket_slot_assignments" WHERE "teamId" IS NOT NULL`
  );
  console.log("Assigned bracket slots in DB:", slots.length);
  if (slots.length > 0) {
    console.log("Sample slots:", slots.slice(0, 5));
  }

  const positions = await prisma.fixturePosition.findMany({
    where: { status: { in: ["ASSIGNED", "FIXED"] } },
    select: { id: true, pool: true, teamId: true, teamName: true, status: true },
  });
  console.log("Assigned/Fixed fixture positions in DB:", positions.length);

  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { teamAId: { not: null } },
        { teamBId: { not: null } },
      ],
    },
    select: { id: true, matchNumber: true, publicMatchNumber: true, teamAId: true, teamBId: true },
  });
  console.log("Matches with assigned teams in DB:", matches.length);

  await prisma.$disconnect();
}

main().catch(console.error);
