import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== SYNCING 100 TEAMS INTO 100 FIXTURE POSITIONS (25 PER POOL) ===");

  const allTeams = await prisma.team.findMany({
    orderBy: { teamCode: "asc" },
  });
  console.log(`Loaded ${allTeams.length} teams.`);

  const pools = ["A", "B", "C", "D"] as const;

  for (let pIdx = 0; pIdx < pools.length; pIdx++) {
    const pool = pools[pIdx];
    const poolTeams = allTeams.slice(pIdx * 25, (pIdx + 1) * 25);

    // Get the 25 positions for this pool (13 FIRST + 12 LAST)
    const positions = await prisma.fixturePosition.findMany({
      where: { pool },
      orderBy: { globalSequence: "asc" },
    });

    console.log(`Pool ${pool}: ${poolTeams.length} teams, ${positions.length} positions.`);

    for (let i = 0; i < positions.length && i < poolTeams.length; i++) {
      const pos = positions[i];
      const team = poolTeams[i];

      await prisma.fixturePosition.update({
        where: { id: pos.id },
        data: {
          status: "ASSIGNED",
          teamId: team.id,
          teamName: team.name,
          institution: team.institution,
          assignedAt: new Date(),
          assignedBy: "system-seed",
        },
      });
    }

    // Also update bracketSlotAssignment for the 25 teams in this pool
    for (let slot = 1; slot <= 25; slot++) {
      const team = poolTeams[slot - 1];
      const numMatch = team.teamCode.match(/(\d+)/);
      const teamNumber = numMatch ? parseInt(numMatch[1], 10) : slot;

      await (prisma as any).bracketSlotAssignment.upsert({
        where: { pool_slot: { pool, slot } },
        update: {
          teamId: team.id,
          teamCode: team.teamCode,
          teamNumber,
          teamName: team.name,
          state: team.state,
          seed: slot === 1 ? pIdx + 1 : null,
          isByeToFinal: slot === 1,
          assignedAt: new Date(),
          assignedBy: "system-seed",
        },
        create: {
          pool,
          slot,
          teamId: team.id,
          teamCode: team.teamCode,
          teamNumber,
          teamName: team.name,
          state: team.state,
          seed: slot === 1 ? pIdx + 1 : null,
          isByeToFinal: slot === 1,
          assignedAt: new Date(),
          assignedBy: "system-seed",
        },
      });
    }
  }

  // Now update all Round 1 Match records from their source positions!
  const round1Matches = await prisma.match.findMany({
    where: { roundStage: "ROUND_1" },
  });
  console.log(`Updating ${round1Matches.length} Round 1 matches with assigned teams...`);

  for (const m of round1Matches) {
    let teamA: any = null;
    let teamB: any = null;

    if (m.sourceAPositionId) {
      const posA = await prisma.fixturePosition.findUnique({
        where: { id: m.sourceAPositionId },
      });
      if (posA?.teamId) {
        teamA = await prisma.team.findUnique({ where: { id: posA.teamId } });
      }
    }

    if (m.sourceBPositionId) {
      const posB = await prisma.fixturePosition.findUnique({
        where: { id: m.sourceBPositionId },
      });
      if (posB?.teamId) {
        teamB = await prisma.team.findUnique({ where: { id: posB.teamId } });
      }
    }

    await prisma.match.update({
      where: { id: m.id },
      data: {
        playerA: teamA?.name || m.playerA,
        institutionA: teamA?.institution || "",
        teamAId: teamA?.id || null,
        playerB: teamB?.name || m.playerB,
        institutionB: teamB?.institution || "",
        teamBId: teamB?.id || null,
        status: "UPCOMING",
      },
    });
  }

  console.log("=== COMPLETED: ALL 100 POSITIONS & ROUND 1 MATCHES SYNCHRONIZED ===");
}

main().finally(() => prisma.$disconnect());
