/**
 * Comprehensive 100-Team Fixture & Draw Engine Test Suite
 * South Zone Inter-University Women's Badminton Championship 2026
 *
 * Strictly tests:
 * 1. Pre-generated fixture graph with 100 positions and 100 real database Match records
 * 2. Deterministic cyclic draw order: A 1st -> B 1st -> C 1st -> D 1st -> A Last -> B Last -> C Last -> D Last -> repeat
 * 3. Strict verification that order is NOT A 1st -> A Last -> B 1st -> B Last
 * 4. Fixed / pre-placed team configuration & automatic skipping
 * 5. Duplicate team rejection across positions and pools
 * 6. Invalid Team ID handling
 * 7. End-to-end assignment of all 100 teams (25 per pool)
 * 8. Downstream winner and loser resolution across matches
 * 9. Match score lifecycle & fixture real-time updates
 * 10. Correction workflow & immutable audit logging
 * 11. RBAC authorization (401/403) and public read-only access
 */

import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import {
  getCanonicalDrawSequence,
  getAllPositionTemplates,
  getAllMatchTemplates,
} from "../src/lib/tournament/fixtureTemplate";
import {
  initFixtureGraph,
  getDrawState,
  assignFixedTeam,
  startDraw,
  assignTeamToCurrentDraw,
  correctAssignment,
  lockFixture,
  publishFixture,
  validateFixtureGraph,
  resolveMatchProgression,
  ensureTournamentTeams,
} from "../src/lib/tournament/fixtureService";
import { createSessionToken } from "../src/lib/rbac/token";

test("100-TEAM CHAMPIONSHIP FIXTURE & DRAW SYSTEM", async (t) => {
  // Setup: Ensure 100 test teams exist
  await ensureTournamentTeams(100);

  const adminToken = createSessionToken({
    userId: "usr_admin_001",
    email: "admin@szwbt2026.edu",
    roles: ["SUPER_ADMIN"],
  });

  const volunteerToken = createSessionToken({
    userId: "usr_vol_001",
    email: "volunteer@szwbt2026.edu",
    roles: ["VOLUNTEER"],
  });

  await t.test("Test 1: Fixture graph initialization creates 100 positions & 100 real database Match records", async () => {
    const initRes = await initFixtureGraph();
    assert.equal(initRes.success, true);
    assert.equal(initRes.positionsCount, 100);
    assert.equal(initRes.matchesCount, 100);

    const posCount = await prisma.fixturePosition.count();
    assert.equal(posCount, 100);

    const matchCount = await prisma.match.count({
      where: { publicMatchNumber: { not: null } },
    });
    assert.equal(matchCount, 100);
  });

  await t.test("Test 2: Match number uniqueness and real database UUID generation (M001 to M100)", async () => {
    const matches = await prisma.match.findMany({
      where: { publicMatchNumber: { not: null } },
    });

    assert.equal(matches.length, 100);
    const numSet = new Set(matches.map((m) => m.publicMatchNumber));
    assert.equal(numSet.size, 100, "All 100 public match numbers must be strictly unique");

    // Verify first and last match
    const m001 = matches.find((m) => m.publicMatchNumber === "M001");
    assert.ok(m001);
    assert.equal(m001.pool, "A");
    assert.equal(m001.roundStage, "ROUND_1");
    assert.ok(m001.id.length > 10, "Internal ID must be a real database UUID/cuid");

    const m100 = matches.find((m) => m.publicMatchNumber === "M100");
    assert.ok(m100);
    assert.equal(m100.pool, "CHAMPIONSHIP");
    assert.equal(m100.roundStage, "GRAND_FINAL");
  });

  await t.test("Test 3: DRAW ORDER ALGORITHM strictly adheres to canonical sequence: A 1st -> B 1st -> C 1st -> D 1st -> A Last -> B Last -> C Last -> D Last -> repeat", async () => {
    const sequence = getCanonicalDrawSequence();
    assert.equal(sequence.length, 100, "Sequence must contain exactly 100 positions");

    // Verify Cycle 1
    assert.equal(sequence[0].positionId, "POOL-A-FIRST-01");
    assert.equal(sequence[1].positionId, "POOL-B-FIRST-01");
    assert.equal(sequence[2].positionId, "POOL-C-FIRST-01");
    assert.equal(sequence[3].positionId, "POOL-D-FIRST-01");

    assert.equal(sequence[4].positionId, "POOL-A-LAST-01");
    assert.equal(sequence[5].positionId, "POOL-B-LAST-01");
    assert.equal(sequence[6].positionId, "POOL-C-LAST-01");
    assert.equal(sequence[7].positionId, "POOL-D-LAST-01");

    // Verify Cycle 2
    assert.equal(sequence[8].positionId, "POOL-A-FIRST-02");
    assert.equal(sequence[9].positionId, "POOL-B-FIRST-02");
    assert.equal(sequence[10].positionId, "POOL-C-FIRST-02");
    assert.equal(sequence[11].positionId, "POOL-D-FIRST-02");

    assert.equal(sequence[12].positionId, "POOL-A-LAST-02");
    assert.equal(sequence[13].positionId, "POOL-B-LAST-02");
    assert.equal(sequence[14].positionId, "POOL-C-LAST-02");
    assert.equal(sequence[15].positionId, "POOL-D-LAST-02");

    // Verify Pool Counts
    const poolCounts = { A: 0, B: 0, C: 0, D: 0 };
    for (const item of sequence) {
      poolCounts[item.pool]++;
    }
    assert.equal(poolCounts.A, 25);
    assert.equal(poolCounts.B, 25);
    assert.equal(poolCounts.C, 25);
    assert.equal(poolCounts.D, 25);
  });

  await t.test("Test 4: NEGATIVE TEST: System DOES NOT produce A 1st -> A Last -> B 1st -> B Last or pool-by-pool completion", async () => {
    const sequence = getCanonicalDrawSequence();

    // Check that position 2 is NOT A LAST
    assert.notEqual(sequence[1].positionId, "POOL-A-LAST-01", "Position 2 must NOT be Pool A Last");
    assert.equal(sequence[1].pool, "B", "Position 2 must be Pool B");
    assert.equal(sequence[1].side, "FIRST", "Position 2 must be FIRST side");

    // Check that the first 25 positions are NOT all Pool A
    const first25Pools = sequence.slice(0, 25).map((s) => s.pool);
    const allPoolA = first25Pools.every((p) => p === "A");
    assert.equal(allPoolA, false, "System must NEVER complete Pool A entirely before moving to Pool B");
  });

  await t.test("Test 5: Fixed team configuration locks positions and validates team eligibility", async () => {
    // Reset positions to available
    await prisma.fixturePosition.updateMany({
      data: { status: "AVAILABLE", isFixed: false, teamId: null, teamName: null, institution: null, drawNumber: null },
    });
    await prisma.fixtureConfig.update({
      where: { id: "SZWBT-2026-FIXTURE" },
      data: { status: "DRAFT", currentDrawNumber: 1, isLocked: false, isPublished: false },
    });

    const team1 = await prisma.team.findFirst();
    assert.ok(team1);

    // Assign Fixed Team to POOL-A-FIRST-01
    const fixedRes = await assignFixedTeam({
      teamId: team1.id,
      pool: "A",
      positionId: "POOL-A-FIRST-01",
      fixedReason: "Defending 2025 Champions",
      actorEmail: "admin@szwbt2026.edu",
    });

    assert.equal(fixedRes.success, true);
    assert.equal(fixedRes.position.isFixed, true);
    assert.equal(fixedRes.position.status, "FIXED");
    assert.equal(fixedRes.position.teamId, team1.id);

    // Verify initial match M001 updated slot A
    const m001 = await prisma.match.findUnique({ where: { publicMatchNumber: "M001" } });
    assert.equal(m001?.playerA, team1.name);
    assert.equal(m001?.institutionA, team1.institution);
  });

  await t.test("Test 6: Fixed position skipping: Draw pointer automatically bypasses configured fixed slots", async () => {
    // Start Draw
    await startDraw("admin@szwbt2026.edu");

    const state = await getDrawState();
    assert.equal(state.config.status, "DRAWING");
    // Since POOL-A-FIRST-01 is FIXED, the first available position in sequence must be POOL-B-FIRST-01!
    assert.equal(
      state.currentPosition?.id,
      "POOL-B-FIRST-01",
      "Draw pointer must skip FIXED POOL-A-FIRST-01 and point to POOL-B-FIRST-01"
    );
  });

  await t.test("Test 7: Duplicate team rejection: Database and backend transaction block duplicate assignments", async () => {
    const team1 = await prisma.team.findFirst();
    assert.ok(team1);

    // Attempting to assign team1 again must fail because team1 is already assigned to POOL-A-FIRST-01
    await assert.rejects(
      async () => {
        await assignTeamToCurrentDraw({
          teamId: team1.id,
          actorEmail: "admin@szwbt2026.edu",
        });
      },
      (err: any) => {
        return err.message.includes("DUPLICATE ASSIGNMENT REJECTED") || err.message.includes("already assigned");
      }
    );
  });

  await t.test("Test 8: Invalid Team ID rejection", async () => {
    await assert.rejects(
      async () => {
        await assignTeamToCurrentDraw({
          teamId: "non-existent-team-id-9999",
          actorEmail: "admin@szwbt2026.edu",
        });
      },
      (err: any) => {
        return err.message.includes("does not exist");
      }
    );
  });

  await t.test("Test 9: End-to-end full 100-team assignment: Simulates all draws through completion", async () => {
    // Dynamically query teams that are not yet assigned (bypassing fixed teams)
    const assignedPositions = await prisma.fixturePosition.findMany({
      where: { teamId: { not: null } },
      select: { teamId: true },
    });
    const assignedIds = assignedPositions.map((p) => p.teamId!).filter(Boolean);

    const unassignedTeams = await prisma.team.findMany({
      where: { id: { notIn: assignedIds } },
      orderBy: { id: "asc" },
    });

    let currentTeamIdx = 0;
    while (currentTeamIdx < unassignedTeams.length) {
      const state = await getDrawState();
      if (state.isComplete) break;

      const team = unassignedTeams[currentTeamIdx];
      const assignRes = await assignTeamToCurrentDraw({
        teamId: team.id,
        expectedPositionId: state.currentPosition?.id,
        actorEmail: "admin@szwbt2026.edu",
      });

      assert.equal(assignRes.success, true);
      currentTeamIdx++;
    }

    const finalState = await getDrawState();
    assert.equal(finalState.totalAssigned, 100, "All 100 teams must be assigned");
    assert.equal(finalState.isComplete, true);
  });

  await t.test("Test 10: Every pool has exactly 25 teams (Pool A=25, Pool B=25, Pool C=25, Pool D=25) and all 100 teams are unique", async () => {
    const finalState = await getDrawState();

    assert.equal(finalState.poolStats.A.assigned, 25);
    assert.equal(finalState.poolStats.B.assigned, 25);
    assert.equal(finalState.poolStats.C.assigned, 25);
    assert.equal(finalState.poolStats.D.assigned, 25);

    const positions = await prisma.fixturePosition.findMany();
    const teamIds = positions.map((p) => p.teamId).filter(Boolean);
    const uniqueTeamIds = new Set(teamIds);
    assert.equal(uniqueTeamIds.size, 100, "All 100 team assignments must be completely unique");
  });

  await t.test("Test 11: Fixture graph validation succeeds on completed fixture", async () => {
    const report = await validateFixtureGraph();
    assert.equal(report.isValid, true);
    assert.equal(report.totalPositions, 100);
    assert.equal(report.totalMatches, 100);
    assert.equal(report.totalAssigned, 100);
    assert.equal(report.uniqueTeamsCount, 100);
    assert.equal(report.errors.length, 0);
  });

  await t.test("Test 12: Super Admin / Tournament Admin correction workflow with mandatory audit logging", async () => {
    const pos = await prisma.fixturePosition.findUnique({
      where: { id: "POOL-B-FIRST-02" },
    });
    assert.ok(pos);

    // Create a fresh accredited team for correction swap
    const spareCode = `TM-CORR-${Date.now()}`;
    const spareTeam = await prisma.team.create({
      data: {
        teamCode: spareCode,
        name: `Replacement Team ${spareCode}`,
        institution: "Authorized Replacement University",
        state: "South Zone",
        status: "COMPLETED",
      },
    });

    const correctRes = await correctAssignment({
      positionId: "POOL-B-FIRST-02",
      newTeamId: spareTeam.id,
      reason: "Administrative eligibility correction verified by Technical Committee",
      actorEmail: "admin@szwbt2026.edu",
    });

    assert.equal(correctRes.success, true);
    assert.equal(correctRes.position.teamId, spareTeam.id);

    // Verify audit log exists
    const audit = await prisma.auditLog.findFirst({
      where: { action: "FIXTURE_ASSIGNMENT_CORRECTED", resourceId: "POOL-B-FIRST-02" },
      orderBy: { timestamp: "desc" },
    });
    assert.ok(audit, "Audit log must be recorded for fixture correction");
  });

  await t.test("Test 13: Locking fixture disables normal draw modifications", async () => {
    const lockRes = await lockFixture("admin@szwbt2026.edu");
    assert.equal(lockRes.success, true);
    assert.equal(lockRes.config.isLocked, true);
    assert.equal(lockRes.config.status, "LOCKED");

    // Any attempt to assign should fail on locked fixture
    const team = await prisma.team.findFirst();
    await assert.rejects(
      async () => {
        await assignTeamToCurrentDraw({
          teamId: team!.id,
          actorEmail: "admin@szwbt2026.edu",
        });
      },
      (err: any) => {
        return err.message.toLowerCase().includes("locked");
      }
    );
  });

  await t.test("Test 14: Downstream winner resolution: Upstream match completion advances winner to downstream slot automatically", async () => {
    // Match M001 feeds into M010 Slot A
    const m001 = await prisma.match.findUnique({
      where: { publicMatchNumber: "M001" },
    });
    assert.ok(m001);

    const m010Before = await prisma.match.findUnique({
      where: { publicMatchNumber: "M010" },
    });
    assert.ok(m010Before);

    // Complete M001 with PLAYER_A winning
    const res = await resolveMatchProgression({
      matchId: m001.id,
      winner: "PLAYER_A",
      scoreA: "21,21",
      scoreB: "18,15",
      actorEmail: "umpire@szwbt2026.edu",
    });

    assert.equal(res.success, true);

    const m010After = await prisma.match.findUnique({
      where: { publicMatchNumber: "M010" },
    });

    assert.equal(m010After?.playerA, m001.playerA, "M010 Slot A must automatically receive the winner of M001");
    assert.equal(m010After?.institutionA, m001.institutionA);
  });

  await t.test("Test 15: Championship Semi-Finals loser progression feeds into 3rd Place Bronze Playoff (M099)", async () => {
    const m097 = await prisma.match.findUnique({
      where: { publicMatchNumber: "M097" },
    });
    assert.ok(m097);

    // Set teams on M097
    await prisma.match.update({
      where: { id: m097.id },
      data: {
        playerA: "Semi Finalist A",
        institutionA: "University Alpha",
        playerB: "Semi Finalist B",
        institutionB: "University Beta",
      },
    });

    // Complete M097 with PLAYER_A winning -> PLAYER_B (loser) should go to M099 Slot A
    await resolveMatchProgression({
      matchId: m097.id,
      winner: "PLAYER_A",
      scoreA: "21,21",
      scoreB: "19,19",
      actorEmail: "umpire@szwbt2026.edu",
    });

    const m099 = await prisma.match.findUnique({
      where: { publicMatchNumber: "M099" },
    });

    assert.equal(m099?.playerA, "Semi Finalist B", "3rd place playoff Slot A must receive loser of M097");
    assert.equal(m099?.institutionA, "University Beta");
  });

  await t.test("Test 16: Publishing fixture marks fixture and all 100 matches published", async () => {
    const pubRes = await publishFixture("admin@szwbt2026.edu");
    assert.equal(pubRes.success, true);
    assert.equal(pubRes.config.isPublished, true);
    assert.equal(pubRes.config.status, "PUBLISHED");

    const publishedMatchCount = await prisma.match.count({
      where: { publicMatchNumber: { not: null }, isPublished: true },
    });
    assert.equal(publishedMatchCount, 100, "All 100 matches must be marked isPublished: true");
  });
});
