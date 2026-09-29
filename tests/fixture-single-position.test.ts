import { prisma } from "../src/lib/prisma";
import {
  validateTournamentTeamUniqueness,
  assignTeamToSlot,
  changeTeamInSlot,
  removeTeamFromSlot,
  lockFixture,
} from "../src/lib/tournament/fixtureService";

async function runTests() {
  console.log("============================================================");
  console.log("RUNNING SZWBT 2026 GLOBAL FIXTURE POSITION ASSIGNMENT TESTS");
  console.log("============================================================");

  let passed = 0;
  let failed = 0;

  // 1. Ensure test teams exist
  const team1 = await prisma.team.findFirst({ where: { teamCode: "TM-SZ-001" } }) || await prisma.team.findFirst();
  const team2 = await prisma.team.findFirst({ where: { teamCode: "TM-SZ-002" } }) || await prisma.team.findFirst({ where: { id: { not: team1?.id } } });

  if (!team1 || !team2) {
    console.error("Test teams missing in database");
    return;
  }

  // Unlock fixture for assignment tests
  await prisma.fixtureConfig.upsert({
    where: { id: "SZWBT-2026-FIXTURE" },
    update: { isLocked: false, isPublished: false, status: "DRAWING" },
    create: {
      id: "SZWBT-2026-FIXTURE",
      isLocked: false,
      isPublished: false,
      status: "DRAWING",
    },
  });

  // Clear slot 1 & 2 in Pools A, B, C, D for testing
  try {
    await removeTeamFromSlot({ pool: "A", slot: 1, actorEmail: "test-admin@szwbt.in" });
    await removeTeamFromSlot({ pool: "A", slot: 2, actorEmail: "test-admin@szwbt.in" });
    await removeTeamFromSlot({ pool: "B", slot: 2, actorEmail: "test-admin@szwbt.in" });
    await removeTeamFromSlot({ pool: "C", slot: 2, actorEmail: "test-admin@szwbt.in" });
    await removeTeamFromSlot({ pool: "D", slot: 2, actorEmail: "test-admin@szwbt.in" });
  } catch {}

  // Test 1: Assign Team 1 to Pool A Slot 2
  try {
    const res = await assignTeamToSlot({
      pool: "A",
      slot: 2,
      teamId: team1.id,
      actorEmail: "test-admin@szwbt.in",
    });
    if (res.success && res.slot.teamId === team1.id) {
      console.log("  ✔ PASS [Test 01: Assign Team 1 to Pool A Position 2 succeeds]");
      passed++;
    } else {
      throw new Error("Assign failed");
    }
  } catch (err: any) {
    console.error("  ✖ FAIL [Test 01: Assign Team 1 to Pool A Position 2]:", err.message);
    failed++;
  }

  // Test 2: Attempt assigning Team 1 to Pool A Slot 3 (Same Pool Duplicate) -> MUST FAIL
  try {
    await assignTeamToSlot({
      pool: "A",
      slot: 3,
      teamId: team1.id,
      actorEmail: "test-admin@szwbt.in",
    });
    console.error("  ✖ FAIL [Test 02: Duplicate in Pool A was unexpectedly accepted]");
    failed++;
  } catch (err: any) {
    if (err.message.includes("ALREADY ASSIGNED")) {
      console.log("  ✔ PASS [Test 02: Assigning duplicate in Pool A rejected with 'TEAM ALREADY ASSIGNED']");
      passed++;
    } else {
      console.error("  ✖ FAIL [Test 02: Unexpected error]:", err.message);
      failed++;
    }
  }

  // Test 3: Attempt assigning Team 1 to Pool B Slot 2 (Cross Pool Duplicate A -> B) -> MUST FAIL
  try {
    await assignTeamToSlot({
      pool: "B",
      slot: 2,
      teamId: team1.id,
      actorEmail: "test-admin@szwbt.in",
    });
    console.error("  ✖ FAIL [Test 03: Cross-pool duplicate A -> B was unexpectedly accepted]");
    failed++;
  } catch (err: any) {
    if (err.message.includes("ALREADY ASSIGNED")) {
      console.log("  ✔ PASS [Test 03: Cross-pool duplicate A -> B rejected with 'TEAM ALREADY ASSIGNED']");
      passed++;
    } else {
      console.error("  ✖ FAIL [Test 03: Unexpected error]:", err.message);
      failed++;
    }
  }

  // Test 4: Attempt assigning Team 1 to Pool C Slot 2 (Cross Pool Duplicate A -> C) -> MUST FAIL
  try {
    await assignTeamToSlot({
      pool: "C",
      slot: 2,
      teamId: team1.id,
      actorEmail: "test-admin@szwbt.in",
    });
    console.error("  ✖ FAIL [Test 04: Cross-pool duplicate A -> C was unexpectedly accepted]");
    failed++;
  } catch (err: any) {
    if (err.message.includes("ALREADY ASSIGNED")) {
      console.log("  ✔ PASS [Test 04: Cross-pool duplicate A -> C rejected with 'TEAM ALREADY ASSIGNED']");
      passed++;
    } else {
      console.error("  ✖ FAIL [Test 04: Unexpected error]:", err.message);
      failed++;
    }
  }

  // Test 5: Attempt assigning Team 1 to Pool D Slot 2 (Cross Pool Duplicate A -> D) -> MUST FAIL
  try {
    await assignTeamToSlot({
      pool: "D",
      slot: 2,
      teamId: team1.id,
      actorEmail: "test-admin@szwbt.in",
    });
    console.error("  ✖ FAIL [Test 05: Cross-pool duplicate A -> D was unexpectedly accepted]");
    failed++;
  } catch (err: any) {
    if (err.message.includes("ALREADY ASSIGNED")) {
      console.log("  ✔ PASS [Test 05: Cross-pool duplicate A -> D rejected with 'TEAM ALREADY ASSIGNED']");
      passed++;
    } else {
      console.error("  ✖ FAIL [Test 05: Unexpected error]:", err.message);
      failed++;
    }
  }

  // Test 6: Assign Team 2 to Pool B Slot 2 -> MUST SUCCEED
  try {
    const res = await assignTeamToSlot({
      pool: "B",
      slot: 2,
      teamId: team2.id,
      actorEmail: "test-admin@szwbt.in",
    });
    if (res.success && res.slot.teamId === team2.id) {
      console.log("  ✔ PASS [Test 06: Assign different Team 2 to Pool B Position 2 succeeds]");
      passed++;
    } else {
      throw new Error("Assign failed");
    }
  } catch (err: any) {
    console.error("  ✖ FAIL [Test 06: Assign Team 2 to Pool B]:", err.message);
    failed++;
  }

  // Test 7: Global Uniqueness Validation Report
  try {
    const report = await validateTournamentTeamUniqueness();
    if (report.duplicates.duplicateCount === 0 && report.isValid) {
      console.log("  ✔ PASS [Test 07: Global Tournament Uniqueness Validation detects 0 duplicates]");
      passed++;
    } else {
      console.error("  ✖ FAIL [Test 07: Global validation report has duplicates]:", report);
      failed++;
    }
  } catch (err: any) {
    console.error("  ✖ FAIL [Test 07: Global validation report error]:", err.message);
    failed++;
  }

  // Test 8: Remove Team 1 from Pool A Slot 2 -> Team 1 becomes available again
  try {
    await removeTeamFromSlot({ pool: "A", slot: 2, actorEmail: "test-admin@szwbt.in" });
    // Now assigning Team 1 to Pool C Slot 2 must succeed
    const reassignRes = await assignTeamToSlot({
      pool: "C",
      slot: 2,
      teamId: team1.id,
      actorEmail: "test-admin@szwbt.in",
    });
    if (reassignRes.success && reassignRes.slot.teamId === team1.id) {
      console.log("  ✔ PASS [Test 08: Remove and Reassign: Team becomes available after removal]");
      passed++;
      // Clean up
      await removeTeamFromSlot({ pool: "C", slot: 2, actorEmail: "test-admin@szwbt.in" });
    } else {
      throw new Error("Reassign failed");
    }
  } catch (err: any) {
    console.error("  ✖ FAIL [Test 08: Remove and Reassign]:", err.message);
    failed++;
  }

  // Clean up Team 2 and restore Team 1 to Pool A Slot 1
  try {
    await removeTeamFromSlot({ pool: "B", slot: 2, actorEmail: "test-admin@szwbt.in" });
    await assignTeamToSlot({ pool: "A", slot: 1, teamId: team1.id, actorEmail: "test-admin@szwbt.in" });
  } catch {}

  console.log("============================================================");
  console.log(`GLOBAL POSITION ASSIGNMENT TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch(console.error);
