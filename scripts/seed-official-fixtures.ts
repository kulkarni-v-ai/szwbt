import { prisma } from "../src/lib/prisma";
import { ROUND_1_MATCH_FLOW, getGlobalMatchNumber, BYE_SLOT_OPTIONS } from "../src/lib/tournament/fixtureConstants";

export async function populateOfficialDraw() {
  console.log("=== POPULATING OFFICIAL CHAMPIONSHIP FIXTURES (100 TEAMS) ===");

  const allTeams = await prisma.team.findMany({
    orderBy: { teamCode: "asc" },
  });
  console.log(`Found ${allTeams.length} teams in database.`);

  const pools = ["A", "B", "C", "D"] as const;

  for (let pIdx = 0; pIdx < pools.length; pIdx++) {
    const pool = pools[pIdx];
    // Take 25 teams per pool: A: 0..25, B: 25..50, C: 50..75, D: 75..100
    const poolTeams = allTeams.slice(pIdx * 25, (pIdx + 1) * 25);
    console.log(`Pool ${pool}: assigning ${poolTeams.length} teams (TM-SZ-${String(pIdx * 25 + 1).padStart(3, "0")} to TM-SZ-${String((pIdx + 1) * 25).padStart(3, "0")})`);

    // In a 25-team pool with 30 slots:
    // Slot 1: Seed 1 (poolTeams[0])
    // Slot 2: Round 1 Bye (poolTeams[1])
    // Slot 17: Round 1 Bye (poolTeams[2])
    // Slot 30: Round 1 Bye (poolTeams[3])
    // Remaining 21 teams fill the Round 1 match slots:
    // Matches 1 to 10 (20 teams) + Match 11 Slot A (1 team) -> total 4 byes + 21 match teams = 25 teams!
    const slotsToAssign: { slot: number; team: any; isSeed?: boolean; isBye?: boolean }[] = [];

    slotsToAssign.push({ slot: 1, team: poolTeams[0], isSeed: true });
    slotsToAssign.push({ slot: 2, team: poolTeams[1], isBye: true });
    slotsToAssign.push({ slot: 17, team: poolTeams[2], isBye: true });
    slotsToAssign.push({ slot: 30, team: poolTeams[3], isBye: true });

    // Round 1 match slots in order:
    // M1: 3, 4
    // M2: 5, 6
    // M3: 7, 8
    // M4: 9, 10
    // M5: 11, 12
    // M6: 13, 14
    // M7: 15, 16
    // M8: 18, 19
    // M9: 20, 21
    // M10: 22, 23
    // M11: 24, 25
    const matchSlots = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24];
    for (let i = 0; i < matchSlots.length; i++) {
      if (i + 4 < poolTeams.length) {
        slotsToAssign.push({ slot: matchSlots[i], team: poolTeams[i + 4] });
      }
    }

    // Upsert into bracketSlotAssignment
    for (const item of slotsToAssign) {
      const numMatch = item.team.teamCode.match(/(\d+)/);
      const teamNumber = numMatch ? parseInt(numMatch[1], 10) : null;

      await (prisma as any).bracketSlotAssignment.upsert({
        where: { pool_slot: { pool, slot: item.slot } },
        update: {
          teamId: item.team.id,
          teamCode: item.team.teamCode,
          teamNumber,
          teamName: item.team.name,
          state: item.team.state,
          seed: item.isSeed ? pIdx + 1 : null,
          isByeToFinal: item.slot === 1,
          isByeR1: item.slot === 2 || item.slot === 17 || item.slot === 30,
          assignedAt: new Date(),
          assignedBy: "system-seed",
        },
        create: {
          pool,
          slot: item.slot,
          teamId: item.team.id,
          teamCode: item.team.teamCode,
          teamNumber,
          teamName: item.team.name,
          state: item.team.state,
          seed: item.isSeed ? pIdx + 1 : null,
          isByeToFinal: item.slot === 1,
          isByeR1: item.slot === 2 || item.slot === 17 || item.slot === 30,
          assignedAt: new Date(),
          assignedBy: "system-seed",
        },
      });
    }

    // Now update Match records for Round 1
    for (const flow of ROUND_1_MATCH_FLOW) {
      const globalMNum = getGlobalMatchNumber(pool, flow.matchInPool);
      const publicMNum = `M${String(globalMNum).padStart(3, "0")}`;

      const teamAAssignment = slotsToAssign.find((s) => s.slot === flow.slotA);
      const teamBAssignment = slotsToAssign.find((s) => s.slot === flow.slotB);

      if (teamAAssignment || teamBAssignment) {
        await prisma.match.updateMany({
          where: { publicMatchNumber: publicMNum },
          data: {
            playerA: teamAAssignment?.team.name || `TBD (Slot ${flow.slotA})`,
            institutionA: teamAAssignment?.team.institution || "",
            teamAId: teamAAssignment?.team.id || null,
            playerB: teamBAssignment?.team.name || `TBD (Slot ${flow.slotB})`,
            institutionB: teamBAssignment?.team.institution || "",
            teamBId: teamBAssignment?.team.id || null,
            status: "UPCOMING",
          },
        });
      }
    }
  }

  const assignedCount = await (prisma as any).bracketSlotAssignment.count({
    where: { teamId: { not: null } },
  });
  console.log(`\nSuccessfully assigned ${assignedCount} bracket slots across all 4 pools!`);
}

if (require.main === module) {
  populateOfficialDraw()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
