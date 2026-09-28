/**
 * Production Live Operations & Domain Invariant Test Script
 * Verifies Dashboard 06 Live Operations APIs, Concurrency & Conflict Guards,
 * RBAC Match Official Isolation, State Machines, and Audit Logging.
 */

import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/rbac/token";
import { getUserContext } from "../src/lib/rbac/service";
import { NextRequest } from "next/server";
import { GET as getOverview } from "../src/app/api/admin/live/overview/route";
import { GET as getMatches, POST as postMatch } from "../src/app/api/admin/live/matches/route";
import { GET as getMatchDetail, PATCH as patchMatchDetail } from "../src/app/api/admin/live/matches/[id]/route";
import { GET as getCourts, POST as postCourt } from "../src/app/api/admin/live/courts/route";
import { PATCH as patchCourt, DELETE as deleteCourt } from "../src/app/api/admin/live/courts/[id]/route";
import { GET as getOfficials } from "../src/app/api/admin/live/officials/route";
import { checkRouteAuthorization } from "../src/lib/rbac/routes";
import { ROLES } from "../src/lib/rbac/roles";

function assert(condition: boolean, testName: string, details?: any) {
  if (!condition) {
    console.error(`\x1b[31m  ✖ FAIL [${testName}]\x1b[0m`, details || "");
    throw new Error(`Assertion failed: ${testName}`);
  } else {
    console.log(`\x1b[32m  ✔ PASS [${testName}]\x1b[0m`);
  }
}

async function runLiveOpsTests() {
  console.log("\n============================================================");
  console.log("RUNNING DASHBOARD 06 — LIVE MATCH OPERATIONS TEST SUITE");
  console.log("============================================================\n");

  // 1. Identify Test Users
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@szwbt2026.edu" },
  });
  const tourneyAdmin = await prisma.user.findUnique({
    where: { email: "lead.multirole@szwbt2026.edu" },
  });
  const matchOfficial = await prisma.user.findUnique({
    where: { email: "umpire@szwbt2026.edu" },
  });
  const transportUser = await prisma.user.findUnique({
    where: { email: "transport@szwbt2026.edu" },
  });

  if (!adminUser || !tourneyAdmin || !matchOfficial || !transportUser) {
    throw new Error("Required test users not found in database.");
  }

  const adminContext = await getUserContext(adminUser.id);
  const tourneyContext = await getUserContext(tourneyAdmin.id);
  const officialContext = await getUserContext(matchOfficial.id);
  const transportContext = await getUserContext(transportUser.id);

  if (!adminContext || !tourneyContext || !officialContext || !transportContext) {
    throw new Error("User contexts could not be loaded.");
  }

  const adminToken = createSessionToken({
    userId: adminUser.id,
    email: adminUser.email,
    roles: adminContext.roles,
    permissions: adminContext.permissions,
  });

  const tourneyToken = createSessionToken({
    userId: tourneyAdmin.id,
    email: tourneyAdmin.email,
    roles: tourneyContext.roles,
    permissions: tourneyContext.permissions,
  });

  const officialToken = createSessionToken({
    userId: matchOfficial.id,
    email: matchOfficial.email,
    roles: officialContext.roles,
    permissions: officialContext.permissions,
  });

  const transportToken = createSessionToken({
    userId: transportUser.id,
    email: transportUser.email,
    roles: transportContext.roles,
    permissions: transportContext.permissions,
  });

  // Ensure test tournament day exists
  let testDay = await prisma.tournamentDay.findFirst();
  if (!testDay) {
    testDay = await prisma.tournamentDay.create({
      data: {
        id: "DAY01",
        date: "2026-10-18",
        dayNumber: "DAY 01",
        stage: "Round of 32",
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 01: Unauthenticated request produces HTTP 401
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest("http://localhost:3000/api/admin/live/overview");
    const res = await getOverview(req, { params: Promise.resolve({}) } as any);
    assert(res.status === 401, "Test 01: Unauthenticated request to /api/admin/live/overview returns HTTP 401");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 02: Match Official cannot access /admin/live API (HTTP 403 Forbidden)
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest("http://localhost:3000/api/admin/live/overview", {
      headers: { cookie: `szwbt_session=${officialToken}` },
    });
    const res = await getOverview(req, { params: Promise.resolve({}) } as any);
    assert(
      res.status === 403,
      "Test 02: Match Official calling /api/admin/live/overview is rejected with HTTP 403 Forbidden"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 03: Match Official blocked by Route Guard on /admin/live
  // ──────────────────────────────────────────────────────────────────────────
  {
    const authCheck = checkRouteAuthorization(
      "/admin/live",
      officialContext.permissions,
      officialContext.roles
    );
    assert(
      !authCheck.authorized,
      "Test 03: Route guard rejects Match Official from /admin/live (authorized = false)"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 04: Unauthorized role (Transport Staff) calling /admin/live receives HTTP 403
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest("http://localhost:3000/api/admin/live/overview", {
      headers: { cookie: `szwbt_session=${transportToken}` },
    });
    const res = await getOverview(req, { params: Promise.resolve({}) } as any);
    assert(
      res.status === 403,
      "Test 04: Transport Staff calling /api/admin/live/overview receives HTTP 403"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 05: Authorized Tournament Admin receives HTTP 200 with Court Matrix & KPIs
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest("http://localhost:3000/api/admin/live/overview", {
      headers: { cookie: `szwbt_session=${tourneyToken}` },
    });
    const res = await getOverview(req, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    assert(
      res.status === 200 && body.success === true && Array.isArray(body.data.courts),
      "Test 05: Tournament Admin receives HTTP 200 and court matrix data",
      { courtCount: body.data?.courts?.length, kpis: body.data?.kpis }
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 06: Schedule a New Match via POST /api/admin/live/matches
  // ──────────────────────────────────────────────────────────────────────────
  let testMatchId = "";
  const matchNumber = `TST-LIVE-${Date.now().toString().slice(-4)}`;
  {
    const req = new NextRequest("http://localhost:3000/api/admin/live/matches", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        dayId: testDay.id,
        time: "10:00 AM",
        category: "Women's Singles",
        court: "Court 07",
        matchNumber,
        playerA: "Ananya Sharma",
        institutionA: "Osmania University",
        playerB: "Kavya Menon",
        institutionB: "Kerala University",
        status: "UPCOMING",
      }),
    });
    const res = await postMatch(req, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    assert(
      res.status === 201 && body.success === true && body.data.id,
      "Test 06: Successfully scheduled test match on Court 07",
      body
    );
    testMatchId = body.data.id;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 07: Assign Official to Match (Validates MATCH_OFFICIAL role)
  // ──────────────────────────────────────────────────────────────────────────
  {
    // Try invalid official first (Transport staff does NOT hold MATCH_OFFICIAL)
    const invalidReq = new NextRequest(`http://localhost:3000/api/admin/live/matches/${testMatchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        action: "ASSIGN_OFFICIAL",
        officialId: transportUser.id,
      }),
    });
    const invalidRes = await patchMatchDetail(invalidReq, { params: Promise.resolve({ id: testMatchId }) } as any);
    assert(
      invalidRes.status === 400,
      "Test 07a: Assigning a non-MATCH_OFFICIAL user is rejected with HTTP 400"
    );

    // Now assign legitimate match official
    const validReq = new NextRequest(`http://localhost:3000/api/admin/live/matches/${testMatchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        action: "ASSIGN_OFFICIAL",
        officialId: matchOfficial.id,
      }),
    });
    const validRes = await patchMatchDetail(validReq, { params: Promise.resolve({ id: testMatchId }) } as any);
    const validBody = await validRes.json();
    assert(
      validRes.status === 200 && validBody.success === true,
      "Test 07b: Assigning legitimate MATCH_OFFICIAL succeeds with HTTP 200"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 08: Start Match sets match and court to LIVE
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/admin/live/matches/${testMatchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        action: "START",
      }),
    });
    const res = await patchMatchDetail(req, { params: Promise.resolve({ id: testMatchId }) } as any);
    const body = await res.json();
    assert(
      res.status === 200 && body.success === true && body.data.status === "LIVE",
      "Test 08: Starting match transitions status to LIVE and sets court to LIVE"
    );

    // Verify in DB that Court 07 status is LIVE
    const court7 = await prisma.court.findFirst({
      where: { courtNumber: "Court 07" },
    });
    assert(court7?.status === "LIVE", "Test 08b: Court 07 status in PostgreSQL is updated to LIVE");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 09: Concurrency Conflict (HTTP 409) — Cannot start 2nd match on Court 07
  // ──────────────────────────────────────────────────────────────────────────
  let conflictingMatchId = "";
  {
    const matchNumberConflict = `TST-CNF-${Date.now().toString().slice(-4)}`;
    // Create another match targeting Court 07
    const createReq = new NextRequest("http://localhost:3000/api/admin/live/matches", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        dayId: testDay.id,
        time: "10:30 AM",
        category: "Women's Singles",
        court: "Court 07",
        matchNumber: matchNumberConflict,
        playerA: "Riya Patel",
        institutionA: "Gujarat University",
        playerB: "Tanvi Rao",
        institutionB: "Bangalore University",
        status: "UPCOMING",
      }),
    });
    const createRes = await postMatch(createReq, { params: Promise.resolve({}) } as any);
    const createBody = await createRes.json();
    conflictingMatchId = createBody.data.id;

    // Attempt to START the second match while testMatchId is LIVE on Court 07
    const startConflictReq = new NextRequest(`http://localhost:3000/api/admin/live/matches/${conflictingMatchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        action: "START",
      }),
    });
    const conflictRes = await patchMatchDetail(startConflictReq, { params: Promise.resolve({ id: conflictingMatchId }) } as any);
    const conflictBody = await conflictRes.json();

    assert(
      conflictRes.status === 409 && conflictBody.code === "COURT_CONFLICT",
      "Test 09: Concurrency check returns HTTP 409 COURT_CONFLICT when court is already occupied",
      conflictBody
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 10: Live Ops Intervention — PAUSE with Medical/Operational reason
  // ──────────────────────────────────────────────────────────────────────────
  {
    const pauseReq = new NextRequest(`http://localhost:3000/api/admin/live/matches/${testMatchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        action: "PAUSE",
        reason: "Medical timeout for player A ankle strain",
        notes: "Physio attended on court. 3 min timeout granted.",
      }),
    });
    const pauseRes = await patchMatchDetail(pauseReq, { params: Promise.resolve({ id: testMatchId }) } as any);
    const pauseBody = await pauseRes.json();

    assert(
      pauseRes.status === 200 &&
        pauseBody.success === true &&
        pauseBody.data.status === "PAUSED" &&
        pauseBody.data.interruptionReason?.includes("Medical timeout"),
      "Test 10: Interruption/Pause sets status to PAUSED and stores audited reason"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 11: Invalid State Transition — Cannot pause already PAUSED match
  // ──────────────────────────────────────────────────────────────────────────
  {
    const invalidPauseReq = new NextRequest(`http://localhost:3000/api/admin/live/matches/${testMatchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        action: "PAUSE",
        reason: "Another pause",
      }),
    });
    const invalidPauseRes = await patchMatchDetail(invalidPauseReq, { params: Promise.resolve({ id: testMatchId }) } as any);
    assert(
      invalidPauseRes.status === 400,
      "Test 11: Pausing an already PAUSED match is rejected with HTTP 400"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 12: RESUME match returns to LIVE
  // ──────────────────────────────────────────────────────────────────────────
  {
    const resumeReq = new NextRequest(`http://localhost:3000/api/admin/live/matches/${testMatchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        action: "RESUME",
      }),
    });
    const resumeRes = await patchMatchDetail(resumeReq, { params: Promise.resolve({ id: testMatchId }) } as any);
    const resumeBody = await resumeRes.json();
    assert(
      resumeRes.status === 200 && resumeBody.data.status === "LIVE",
      "Test 12: Resuming match returns status to LIVE"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 13: Operational Score Update & Audit Event Logging
  // ──────────────────────────────────────────────────────────────────────────
  {
    const scoreReq = new NextRequest(`http://localhost:3000/api/admin/live/matches/${testMatchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        action: "UPDATE_SCORE",
        scoreA: 21,
        scoreB: 19,
      }),
    });
    const scoreRes = await patchMatchDetail(scoreReq, { params: Promise.resolve({ id: testMatchId }) } as any);
    const scoreBody = await scoreRes.json();
    assert(
      scoreRes.status === 200 && scoreBody.data.scoreA === "21" && scoreBody.data.scoreB === "19",
      "Test 13a: Score update to 21 - 19 succeeded"
    );

    // Verify MatchEvent was created
    const event = await prisma.matchEvent.findFirst({
      where: { matchId: testMatchId, eventType: "POINT" },
      orderBy: { timestamp: "desc" },
    });
    assert(
      event !== null && event.scoreA === 21 && event.scoreB === 19,
      "Test 13b: MatchEvent POINT with audited scores exists in database"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 14: COMPLETE Match releases Court back to READY and publishes result
  // ──────────────────────────────────────────────────────────────────────────
  {
    const completeReq = new NextRequest(`http://localhost:3000/api/admin/live/matches/${testMatchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        action: "COMPLETE",
        winner: "PLAYER_A",
      }),
    });
    const completeRes = await patchMatchDetail(completeReq, { params: Promise.resolve({ id: testMatchId }) } as any);
    const completeBody = await completeRes.json();
    assert(
      completeRes.status === 200 &&
        completeBody.data.status === "COMPLETED" &&
        completeBody.data.winner === "PLAYER_A" &&
        completeBody.data.isPublished === true,
      "Test 14a: Match completion sets COMPLETED, records winner, and marks isPublished: true"
    );

    // Verify Court 07 is returned to READY
    const court7After = await prisma.court.findFirst({
      where: { courtNumber: "Court 07" },
    });
    assert(
      court7After?.status === "READY",
      "Test 14b: Court 07 status is automatically released back to READY"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 15: Cannot restart a COMPLETED match
  // ──────────────────────────────────────────────────────────────────────────
  {
    const restartReq = new NextRequest(`http://localhost:3000/api/admin/live/matches/${testMatchId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        action: "START",
      }),
    });
    const restartRes = await patchMatchDetail(restartReq, { params: Promise.resolve({ id: testMatchId }) } as any);
    assert(
      restartRes.status === 400,
      "Test 15: Attempting to START an already COMPLETED match is rejected with HTTP 400"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 16: List Officials endpoint returns only users with MATCH_OFFICIAL role
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest("http://localhost:3000/api/admin/live/officials", {
      headers: { cookie: `szwbt_session=${adminToken}` },
    });
    const res = await getOfficials(req, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    assert(
      res.status === 200 && Array.isArray(body.data) && body.data.length > 0,
      "Test 16a: /api/admin/live/officials returns active official roster"
    );

    // Ensure none of the returned users is a transport or finance staff without official role
    const hasInvalidRole = body.data.some((u: any) => u.email === "transport@szwbt2026.edu");
    assert(!hasInvalidRole, "Test 16b: Non-officials are excluded from the official roster");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 17: Court Management — Create, Update Status & Guard Active Matches
  // ──────────────────────────────────────────────────────────────────────────
  let testCourtId = "";
  {
    // Create new test court
    const courtName = `Court T${Date.now().toString().slice(-3)}`;
    const postReq = new NextRequest("http://localhost:3000/api/admin/live/courts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        courtNumber: courtName,
        status: "READY",
        umpire: "Test Umpire",
      }),
    });
    const postRes = await postCourt(postReq, { params: Promise.resolve({}) } as any);
    const postBody = await postRes.json();
    assert(
      postRes.status === 201 && postBody.success === true,
      "Test 17a: Created new court via /api/admin/live/courts"
    );
    testCourtId = postBody.data.id;

    // Update status to MAINTENANCE
    const patchReq = new NextRequest(`http://localhost:3000/api/admin/live/courts/${testCourtId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${adminToken}`,
      },
      body: JSON.stringify({
        status: "MAINTENANCE",
      }),
    });
    const patchRes = await patchCourt(patchReq, { params: Promise.resolve({ id: testCourtId }) } as any);
    const patchBody = await patchRes.json();
    assert(
      patchRes.status === 200 && patchBody.data.status === "MAINTENANCE",
      "Test 17b: Court status updated to MAINTENANCE"
    );

    // Delete test court
    const delReq = new NextRequest(`http://localhost:3000/api/admin/live/courts/${testCourtId}`, {
      method: "DELETE",
      headers: { cookie: `szwbt_session=${adminToken}` },
    });
    const delRes = await deleteCourt(delReq, { params: Promise.resolve({ id: testCourtId }) } as any);
    assert(
      delRes.status === 200,
      "Test 17c: Unoccupied court deleted successfully"
    );
  }

  // Clean up conflicting test match
  if (conflictingMatchId) {
    await prisma.matchEvent.deleteMany({ where: { matchId: conflictingMatchId } });
    await prisma.match.delete({ where: { id: conflictingMatchId } }).catch(() => {});
  }

  // Clean up main test match events
  if (testMatchId) {
    await prisma.matchEvent.deleteMany({ where: { matchId: testMatchId } });
    await prisma.match.delete({ where: { id: testMatchId } }).catch(() => {});
  }

  console.log("\n============================================================");
  console.log("ALL DASHBOARD 06 LIVE OPERATIONS TESTS PASSED (17/17)");
  console.log("============================================================\n");
}

runLiveOpsTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
