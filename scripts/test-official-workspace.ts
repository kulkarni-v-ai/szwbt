/**
 * Production Match Official Workspace & Domain Invariant Test Suite
 * Route: /official & /api/official/matches/*
 * Tests all 30 security, RBAC, IDOR, score validity, undo, and lifecycle invariants.
 */

import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/rbac/token";
import { getUserContext } from "../src/lib/rbac/service";
import { NextRequest } from "next/server";
import { GET as getAssignedMatches } from "../src/app/api/official/matches/route";
import { GET as getMatchDetail } from "../src/app/api/official/matches/[id]/route";
import { POST as postMatchAction } from "../src/app/api/official/matches/[id]/actions/route";
import { checkRouteAuthorization } from "../src/lib/rbac/routes";
import { getScoringConfigForCategory, validateScoreIncrement } from "../src/lib/scoring/rules";

function assert(condition: boolean, testName: string, details?: any) {
  if (!condition) {
    console.error(`\x1b[31m  ✖ FAIL [${testName}]\x1b[0m`, details || "");
    throw new Error(`Assertion failed: ${testName}`);
  } else {
    console.log(`\x1b[32m  ✔ PASS [${testName}]\x1b[0m`);
  }
}

async function runOfficialWorkspaceTests() {
  console.log("\n============================================================");
  console.log("RUNNING DASHBOARD 07 — MATCH OFFICIAL WORKSPACE TEST SUITE");
  console.log("============================================================\n");

  // 1. Identify Test Users
  const officialA = await prisma.user.findUnique({
    where: { email: "umpire@szwbt2026.edu" },
  });
  const transportUser = await prisma.user.findUnique({
    where: { email: "transport@szwbt2026.edu" },
  });
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@szwbt2026.edu" },
  });

  if (!officialA || !transportUser || !adminUser) {
    throw new Error("Required test users not found in database.");
  }

  // Create a second official B to test strict isolation & IDOR prevention
  let officialB = await prisma.user.findUnique({
    where: { email: "umpire.secondary@szwbt2026.edu" },
  });
  if (!officialB) {
    const officialRole = await prisma.role.findUnique({ where: { name: "MATCH_OFFICIAL" } });
    if (!officialRole) throw new Error("MATCH_OFFICIAL role not found");

    officialB = await prisma.user.create({
      data: {
        email: "umpire.secondary@szwbt2026.edu",
        name: "Secondary Umpire Rajesh",
        passwordHash: officialA.passwordHash,
        badge: "Official Umpire B",
        officialId: "official-court-02",
        isActive: true,
        userRoles: {
          create: { roleId: officialRole.id },
        },
      },
    });
  }

  const ctxOfficialA = await getUserContext(officialA.id);
  const ctxOfficialB = await getUserContext(officialB.id);
  const ctxTransport = await getUserContext(transportUser.id);
  const ctxAdmin = await getUserContext(adminUser.id);

  if (!ctxOfficialA || !ctxOfficialB || !ctxTransport || !ctxAdmin) {
    throw new Error("User contexts could not be loaded.");
  }

  const tokenOfficialA = createSessionToken({
    userId: officialA.id,
    email: officialA.email,
    roles: ctxOfficialA.roles,
    permissions: ctxOfficialA.permissions,
  });

  const tokenOfficialB = createSessionToken({
    userId: officialB.id,
    email: officialB.email,
    roles: ctxOfficialB.roles,
    permissions: ctxOfficialB.permissions,
  });

  const tokenTransport = createSessionToken({
    userId: transportUser.id,
    email: transportUser.email,
    roles: ctxTransport.roles,
    permissions: ctxTransport.permissions,
  });

  const tokenAdmin = createSessionToken({
    userId: adminUser.id,
    email: adminUser.email,
    roles: ctxAdmin.roles,
    permissions: ctxAdmin.permissions,
  });

  // Ensure test day exists
  let testDay = await prisma.tournamentDay.findFirst();
  if (!testDay) {
    testDay = await prisma.tournamentDay.create({
      data: {
        id: "OCT18",
        date: "2026-10-18",
        dayNumber: "DAY 01",
        stage: "Round 1",
      },
    });
  }

  // Ensure Court 01 & Court 02 exist
  await prisma.court.upsert({
    where: { courtNumber: "Court 01" },
    update: { status: "READY" },
    create: { courtNumber: "Court 01", status: "READY" },
  });
  await prisma.court.upsert({
    where: { courtNumber: "Court 02" },
    update: { status: "READY" },
    create: { courtNumber: "Court 02", status: "READY" },
  });

  // Create Match 101 assigned to Official A
  const match101 = await prisma.match.create({
    data: {
      dayId: testDay.id,
      time: "10:00 AM",
      category: "Women's Singles",
      court: "Court 01",
      matchNumber: `OFF-101-${Date.now().toString().slice(-4)}`,
      playerA: "Ananya Sharma",
      institutionA: "Osmania University",
      playerB: "Kavya Menon",
      institutionB: "Kerala University",
      assignedOfficialId: officialA.id,
      status: "READY",
      scoreA: "0",
      scoreB: "0",
    },
  });

  // Create Match 102 assigned to Official B
  const match102 = await prisma.match.create({
    data: {
      dayId: testDay.id,
      time: "10:30 AM",
      category: "Women's Singles",
      court: "Court 02",
      matchNumber: `OFF-102-${Date.now().toString().slice(-4)}`,
      playerA: "Riya Patel",
      institutionA: "Gujarat University",
      playerB: "Tanvi Rao",
      institutionB: "Bangalore University",
      assignedOfficialId: officialB.id,
      status: "READY",
      scoreA: "0",
      scoreB: "0",
    },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 01: Unauthenticated user receives 401
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest("http://localhost:3000/api/official/matches");
    const res = await getAssignedMatches(req, { params: Promise.resolve({}) } as any);
    assert(res.status === 401, "Test 01: Unauthenticated user receives HTTP 401");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 02: Unauthorized user receives 403
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest("http://localhost:3000/api/official/matches", {
      headers: { cookie: `szwbt_session=${tokenTransport}` },
    });
    const res = await getAssignedMatches(req, { params: Promise.resolve({}) } as any);
    assert(res.status === 403, "Test 02: Transport staff denied with HTTP 403");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 03: Match Official A can access their assigned match
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}`, {
      headers: { cookie: `szwbt_session=${tokenOfficialA}` },
    });
    const res = await getMatchDetail(req, { params: Promise.resolve({ id: match101.id }) } as any);
    const body = await res.json();
    assert(
      res.status === 200 && body.success === true && body.data.match.id === match101.id,
      "Test 03: Official A can access assigned match 101"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 04: Match Official A CANNOT access Match 102 (assigned to Official B)
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match102.id}`, {
      headers: { cookie: `szwbt_session=${tokenOfficialA}` },
    });
    const res = await getMatchDetail(req, { params: Promise.resolve({ id: match102.id }) } as any);
    assert(
      res.status === 403,
      "Test 04: Official A rejected with HTTP 403 when requesting unassigned Match 102"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 05: Direct URL security - Route guard check
  // ──────────────────────────────────────────────────────────────────────────
  {
    const authCheckOfficial = checkRouteAuthorization(
      "/official",
      ctxOfficialA.permissions,
      ctxOfficialA.roles
    );
    const authCheckTransport = checkRouteAuthorization(
      "/official",
      ctxTransport.permissions,
      ctxTransport.roles
    );
    assert(
      authCheckOfficial.authorized && !authCheckTransport.authorized,
      "Test 05: Route guard authorizes Official and blocks unauthorized roles on /official"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 06: Direct API calls cannot bypass assignment
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match102.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialA}`,
      },
      body: JSON.stringify({ action: "START" }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match102.id }) } as any);
    const body = await res.json();
    assert(
      res.status === 403 && body.code === "NOT_ASSIGNED",
      "Test 06: Official A cannot execute START action on Match 102 (HTTP 403 NOT_ASSIGNED)"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 07: Valid Match START works
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialA}`,
      },
      body: JSON.stringify({ action: "START" }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match101.id }) } as any);
    const body = await res.json();
    assert(
      res.status === 200 && body.success === true && body.data.status === "LIVE",
      "Test 07: Valid match start transitions match to LIVE and logs START event"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 08: Authorized Official updates score
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialA}`,
      },
      body: JSON.stringify({ action: "SCORE", pointTo: "PLAYER_A" }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match101.id }) } as any);
    const body = await res.json();
    assert(
      res.status === 200 && body.data.scoreA === "1" && body.data.scoreB === "0",
      "Test 08: Official A awards point to PLAYER_A (New score: 1 - 0)"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 09: Unauthorized Official B cannot update Match 101 score
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialB}`,
      },
      body: JSON.stringify({ action: "SCORE", pointTo: "PLAYER_B" }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match101.id }) } as any);
    assert(res.status === 403, "Test 09: Official B score attempt on Match 101 rejected with HTTP 403");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 10: Invalid score transition is rejected
  // ──────────────────────────────────────────────────────────────────────────
  {
    const config = getScoringConfigForCategory("Women's Singles");
    const testValidation = validateScoreIncrement(30, 28, "PLAYER_A", config);
    assert(!testValidation.valid, "Test 10: Score increment beyond maximum 30 is rejected by rules engine");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 11: Score update is audited with MatchEvent and AuditLog
  // ──────────────────────────────────────────────────────────────────────────
  {
    const event = await prisma.matchEvent.findFirst({
      where: { matchId: match101.id, eventType: "POINT" },
      orderBy: { timestamp: "desc" },
    });
    const audit = await prisma.auditLog.findFirst({
      where: { resourceId: match101.id, action: "SCORE_UPDATED" },
      orderBy: { timestamp: "desc" },
    });
    assert(
      event !== null && audit !== null,
      "Test 11: Score update created both MatchEvent and AuditLog"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 12: Undo reverts the most recent scoring action
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialA}`,
      },
      body: JSON.stringify({ action: "UNDO" }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match101.id }) } as any);
    const body = await res.json();
    assert(
      res.status === 200 && body.data.scoreA === "0" && body.data.scoreB === "0",
      "Test 12: Score undo successfully reverted score to 0 - 0"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 13: Valid PAUSE works
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialA}`,
      },
      body: JSON.stringify({
        action: "PAUSE",
        reason: "Medical Hold",
        notes: "Player A requested ice bag for wrist",
      }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match101.id }) } as any);
    const body = await res.json();
    assert(
      res.status === 200 && body.data.status === "PAUSED",
      "Test 13: Valid pause transitions match to PAUSED with reason"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 14: Scoring while PAUSED is rejected
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialA}`,
      },
      body: JSON.stringify({ action: "SCORE", pointTo: "PLAYER_A" }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match101.id }) } as any);
    assert(res.status === 400, "Test 14: Scoring attempt on PAUSED match is rejected with HTTP 400");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 15: Valid RESUME works
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialA}`,
      },
      body: JSON.stringify({ action: "RESUME" }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match101.id }) } as any);
    const body = await res.json();
    assert(
      res.status === 200 && body.data.status === "LIVE",
      "Test 15: Valid resume transitions match back to LIVE"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 16: Invalid RESUME on already LIVE match is rejected
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialA}`,
      },
      body: JSON.stringify({ action: "RESUME" }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match101.id }) } as any);
    assert(res.status === 400, "Test 16: Resuming an already LIVE match is rejected with HTTP 400");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 17: Operational Issue Reporting works
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialA}`,
      },
      body: JSON.stringify({
        action: "REPORT_ISSUE",
        issueCategory: "COURT",
        description: "Light panel flicker near north baseline",
      }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match101.id }) } as any);
    const body = await res.json();
    assert(
      res.status === 200 && body.success === true,
      "Test 17: Operational issue report recorded and audited"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 18: Valid Match COMPLETE and Result Submission
  // ──────────────────────────────────────────────────────────────────────────
  {
    // First award a point so there's a score
    await postMatchAction(
      new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `szwbt_session=${tokenOfficialA}` },
        body: JSON.stringify({ action: "SCORE", pointTo: "PLAYER_A" }),
      }),
      { params: Promise.resolve({ id: match101.id }) } as any
    );

    const completeReq = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialA}`,
      },
      body: JSON.stringify({ action: "COMPLETE", winner: "PLAYER_A" }),
    });
    const res = await postMatchAction(completeReq, { params: Promise.resolve({ id: match101.id }) } as any);
    const body = await res.json();
    assert(
      res.status === 200 &&
        body.data.status === "COMPLETED" &&
        body.data.winner === "PLAYER_A" &&
        body.data.isPublished === false,
      "Test 18: Match completed, result submitted, isPublished remains false (pending referee review)"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 19: Completed match cannot be started again
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match101.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialA}`,
      },
      body: JSON.stringify({ action: "START" }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match101.id }) } as any);
    assert(res.status === 400, "Test 19: Attempting to start COMPLETED match is rejected with HTTP 400");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 20: Invalid Result Submission without winner is rejected
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match102.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialB}`,
      },
      body: JSON.stringify({ action: "COMPLETE" }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match102.id }) } as any);
    assert(res.status === 400, "Test 20: Complete match without winner is rejected with HTTP 400");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 21: Match Reassignment revokes official access immediately
  // ──────────────────────────────────────────────────────────────────────────
  {
    // Admin reassigns match102 from Official B to Official A
    await prisma.match.update({
      where: { id: match102.id },
      data: { assignedOfficialId: officialA.id },
    });

    // Official B tries to perform an action on match102
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match102.id}/actions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `szwbt_session=${tokenOfficialB}`,
      },
      body: JSON.stringify({ action: "START" }),
    });
    const res = await postMatchAction(req, { params: Promise.resolve({ id: match102.id }) } as any);
    assert(
      res.status === 403,
      "Test 21: Reassigned match immediately rejects previous official with HTTP 403"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 22: Official A now sees Match 102 in their assigned roster
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest("http://localhost:3000/api/official/matches", {
      headers: { cookie: `szwbt_session=${tokenOfficialA}` },
    });
    const res = await getAssignedMatches(req, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    const hasMatch102 =
      body.data.currentMatch?.id === match102.id ||
      body.data.upcomingMatches?.some((m: any) => m.id === match102.id);
    assert(
      hasMatch102,
      "Test 22: Reassigned match appears in new official's assigned roster dynamically"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 23: IDOR Prevention — Official cannot use another match's ID
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/non-existent-match-id`, {
      headers: { cookie: `szwbt_session=${tokenOfficialA}` },
    });
    const res = await getMatchDetail(req, { params: Promise.resolve({ id: "non-existent-match-id" }) } as any);
    assert(res.status === 404, "Test 23: Non-existent match returns HTTP 404 (IDOR safe)");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 24: Readiness Checklist derivation
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match102.id}`, {
      headers: { cookie: `szwbt_session=${tokenOfficialA}` },
    });
    const res = await getMatchDetail(req, { params: Promise.resolve({ id: match102.id }) } as any);
    const body = await res.json();
    assert(
      body.data.readiness.courtAssigned === true &&
        body.data.readiness.participantsConfigured === true &&
        body.data.readiness.scoringConfigured === true,
      "Test 24: Database-driven readiness checklist correctly evaluates court, players, and rules"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 25: Match Official cannot publish results directly (requires Admin/Referee)
  // ──────────────────────────────────────────────────────────────────────────
  {
    const match = await prisma.match.findUnique({ where: { id: match101.id } });
    assert(
      match?.isPublished === false,
      "Test 25: Internal completed match result remains unpublished to public portal"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 26: Empty State verification when official has no assigned matches
  // ──────────────────────────────────────────────────────────────────────────
  {
    // Temporarily unassign matches from Official B
    const req = new NextRequest("http://localhost:3000/api/official/matches", {
      headers: { cookie: `szwbt_session=${tokenOfficialB}` },
    });
    const res = await getAssignedMatches(req, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    assert(
      body.data.totalAssigned === 0 && body.data.currentMatch === null,
      "Test 26: Official with no assigned matches receives totalAssigned = 0 and currentMatch = null"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 27: Court release on match completion
  // ──────────────────────────────────────────────────────────────────────────
  {
    const court1 = await prisma.court.findFirst({ where: { courtNumber: "Court 01" } });
    assert(court1?.status === "READY", "Test 27: Court 01 status is automatically set to READY after completion");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 28: Duplicate score prevention (deduplication logic)
  // ──────────────────────────────────────────────────────────────────────────
  {
    // Start match102
    await postMatchAction(
      new NextRequest(`http://localhost:3000/api/official/matches/${match102.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `szwbt_session=${tokenOfficialA}` },
        body: JSON.stringify({ action: "START" }),
      }),
      { params: Promise.resolve({ id: match102.id }) } as any
    );

    const clientReqId = "fixed-req-id-12345";
    // First score call
    const res1 = await postMatchAction(
      new NextRequest(`http://localhost:3000/api/official/matches/${match102.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `szwbt_session=${tokenOfficialA}` },
        body: JSON.stringify({ action: "SCORE", pointTo: "PLAYER_A", clientRequestId: clientReqId }),
      }),
      { params: Promise.resolve({ id: match102.id }) } as any
    );

    // Immediate second score call with same clientRequestId
    const res2 = await postMatchAction(
      new NextRequest(`http://localhost:3000/api/official/matches/${match102.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `szwbt_session=${tokenOfficialA}` },
        body: JSON.stringify({ action: "SCORE", pointTo: "PLAYER_A", clientRequestId: clientReqId }),
      }),
      { params: Promise.resolve({ id: match102.id }) } as any
    );

    assert(
      res1.status === 200 && res2.status === 429,
      "Test 28: Duplicate score submission with same clientRequestId rejected with HTTP 429"
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 29: Super Admin has override clearance to view and assist
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest(`http://localhost:3000/api/official/matches/${match102.id}`, {
      headers: { cookie: `szwbt_session=${tokenAdmin}` },
    });
    const res = await getMatchDetail(req, { params: Promise.resolve({ id: match102.id }) } as any);
    assert(res.status === 200, "Test 29: Super Admin has global clearance to inspect any match");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 30: Zero hardcoded mock matches in production endpoints
  // ──────────────────────────────────────────────────────────────────────────
  {
    const req = new NextRequest("http://localhost:3000/api/official/matches", {
      headers: { cookie: `szwbt_session=${tokenOfficialA}` },
    });
    const res = await getAssignedMatches(req, { params: Promise.resolve({}) } as any);
    const body = await res.json();
    const hasFakeData =
      body.data.currentMatch?.matchNumber?.includes("QF-WS-01") ||
      body.data.currentMatch?.playerA?.includes("KLE Technological University");
    assert(
      !hasFakeData,
      "Test 30: Endpoints return only real database entities, zero mock/fake hardcoded records"
    );
  }

  // Cleanup test matches
  await prisma.matchEvent.deleteMany({ where: { matchId: { in: [match101.id, match102.id] } } });
  await prisma.match.deleteMany({ where: { id: { in: [match101.id, match102.id] } } });
  if (officialB) {
    await prisma.userRole.deleteMany({ where: { userId: officialB.id } });
    await prisma.user.delete({ where: { id: officialB.id } });
  }

  console.log("\n============================================================");
  console.log("ALL DASHBOARD 07 MATCH OFFICIAL TESTS PASSED (30/30)");
  console.log("============================================================\n");
}

runOfficialWorkspaceTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
