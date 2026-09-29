import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Cleaning database to ONLY keep the 101 XLSX Universities ===");

  // 1. Reset all fixture positions so there are no FK references
  await prisma.fixturePosition.updateMany({
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

  // 2. Reset matches back to TBD
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

  // 3. Clear DrawHistory
  await prisma.drawHistory.deleteMany({});

  // 4. Delete teams that do NOT start with TM-SZ-
  const nonSzTeams = await prisma.team.findMany({
    where: {
      NOT: {
        teamCode: {
          startsWith: "TM-SZ-",
        },
      },
    },
  });

  console.log(`Found ${nonSzTeams.length} non-XLSX teams to delete...`);
  for (const t of nonSzTeams) {
    await prisma.teamMember.deleteMany({ where: { teamId: t.id } });
    await prisma.accommodationAllocation.deleteMany({ where: { teamId: t.id } });
    await prisma.transportPassenger.deleteMany({ where: { teamId: t.id } });
    await prisma.feeLedger.deleteMany({ where: { teamId: t.id } });
    await prisma.qrPass.deleteMany({ where: { teamId: t.id } });
    await prisma.foodPackageAssignment.deleteMany({ where: { teamId: t.id } });
    await prisma.user.updateMany({ where: { teamId: t.id }, data: { teamId: null } });
    await prisma.team.delete({ where: { id: t.id } });
  }

  const remaining = await prisma.team.count();
  console.log(`Remaining teams in database: ${remaining} (expected: 101)`);

  const szTeams = await prisma.team.findMany({
    select: { teamCode: true, name: true, state: true },
    orderBy: { teamCode: "asc" },
  });
  console.log("First 3:", szTeams.slice(0, 3));
  console.log("Last 3:", szTeams.slice(-3));
}

main().catch(console.error).finally(() => prisma.$disconnect());
