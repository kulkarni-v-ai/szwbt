import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/rbac/token";
import { ROLES } from "../src/lib/rbac/roles";
import { PERMISSIONS } from "../src/lib/rbac/permissions";
import { GET as getTournamentOverview } from "../src/app/api/tournament/overview/route";
import {
  GET as getTournamentSettings,
  PATCH as updateTournamentSettings,
} from "../src/app/api/tournament/settings/route";
import {
  GET as getTournamentCategories,
  POST as createTournamentCategory,
} from "../src/app/api/tournament/categories/route";
import {
  GET as getTournamentEvents,
  POST as createTournamentEvent,
} from "../src/app/api/tournament/events/route";
import {
  GET as getTournamentCourts,
  POST as createTournamentCourt,
} from "../src/app/api/tournament/courts/route";
import { PATCH as updateTournamentCourt } from "../src/app/api/tournament/courts/[id]/route";
import {
  GET as getTournamentSchedule,
  POST as scheduleTournamentMatch,
} from "../src/app/api/tournament/schedule/route";
import { PATCH as rescheduleTournamentMatch } from "../src/app/api/tournament/schedule/[id]/route";
import {
  GET as getScheduleLock,
  POST as toggleScheduleLock,
} from "../src/app/api/tournament/schedule/lock/route";
import { GET as getScheduleConflicts } from "../src/app/api/tournament/conflicts/route";
import { GET as getTournamentReadiness } from "../src/app/api/tournament/readiness/route";

test("TOURNAMENT ADMIN COMMAND CENTER TESTS (/admin/tournament)", async (t) => {
  // 1. Setup Auth Tokens
  const tournamentAdminUser = await prisma.user.findFirst({
    where: { email: "lead.multirole@szwbt2026.edu" },
  });
  assert(tournamentAdminUser, "Tournament Admin user must exist");

  const tournamentAdminToken = createSessionToken({
    userId: tournamentAdminUser.id,
    email: tournamentAdminUser.email,
    roles: [ROLES.TOURNAMENT_ADMIN],
    permissions: [
      PERMISSIONS.TOURNAMENT_READ,
      PERMISSIONS.TOURNAMENT_UPDATE,
      PERMISSIONS.TOURNAMENT_CONFIGURE,
      PERMISSIONS.CATEGORY_MANAGE,
      PERMISSIONS.EVENT_MANAGE,
      PERMISSIONS.COURT_MANAGE,
      PERMISSIONS.SCHEDULE_MANAGE,
      PERMISSIONS.SCHEDULE_LOCK,
      PERMISSIONS.MATCH_READ,
      PERMISSIONS.MATCH_CREATE,
      PERMISSIONS.MATCH_UPDATE,
      PERMISSIONS.ADMIN_READ,
    ],
  });

  const registrationStaffUser = await prisma.user.findFirst({
    where: { email: "registration@szwbt2026.edu" },
  });
  assert(registrationStaffUser, "Registration Staff user must exist");

  const registrationStaffToken = createSessionToken({
    userId: registrationStaffUser.id,
    email: registrationStaffUser.email,
    roles: [ROLES.REGISTRATION_STAFF],
    permissions: [PERMISSIONS.REGISTRATION_READ, PERMISSIONS.REGISTRATION_UPDATE],
  });

  const transportStaffUser = await prisma.user.findFirst({
    where: { email: "transport@szwbt2026.edu" },
  });
  assert(transportStaffUser, "Transport Staff user must exist");

  const transportStaffToken = createSessionToken({
    userId: transportStaffUser.id,
    email: transportStaffUser.email,
    roles: [ROLES.TRANSPORT_STAFF],
    permissions: [PERMISSIONS.TRANSPORT_READ, PERMISSIONS.TRANSPORT_UPDATE],
  });

  const teamManagerUser = await prisma.user.findFirst({
    where: { email: "team@szwbt2026.edu" },
  });
  assert(teamManagerUser, "Team Manager user must exist");

  const teamManagerToken = createSessionToken({
    userId: teamManagerUser.id,
    email: teamManagerUser.email,
    roles: [ROLES.TEAM_MANAGER],
    permissions: [PERMISSIONS.TEAM_READ, PERMISSIONS.PARTICIPANT_READ],
  });

  // Test 1: Tournament Admin can access Overview telemetry
  await t.test("Test 1: Tournament Admin can access Overview telemetry", async () => {
    const req = new NextRequest("http://localhost:3000/api/tournament/overview", {
      headers: { cookie: `szwbt_session=${tournamentAdminToken}` },
    });
    const res = await getTournamentOverview(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(body.tournament, "Must return tournament metadata");
    assert(body.metrics, "Must return tournament metrics");
    assert(body.readiness, "Must return readiness matrix");
    assert(Array.isArray(body.courts), "Must return registered courts");
    assert(typeof body.metrics.totalMatches === "number");
    assert.equal(body.readiness.transport.hasPayment, false); // Zero transport payment rule
  });

  // Test 2: Registration staff cannot modify tournament configuration (HTTP 403)
  await t.test("Test 2: Registration staff cannot modify tournament configuration", async () => {
    const req = new NextRequest("http://localhost:3000/api/tournament/settings", {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${registrationStaffToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    const res = await updateTournamentSettings(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert(body.error.includes("403 Forbidden"));
  });

  // Test 3: Transport staff cannot modify tournament schedule (HTTP 403)
  await t.test("Test 3: Transport staff cannot modify tournament schedule", async () => {
    const req = new NextRequest("http://localhost:3000/api/tournament/schedule", {
      method: "POST",
      headers: {
        cookie: `szwbt_session=${transportStaffToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dayId: "OCT18",
        time: "11:00 IST",
        court: "Court 01",
        matchNumber: "M99",
      }),
    });
    const res = await scheduleTournamentMatch(req);
    assert.equal(res.status, 403);
  });

  // Test 4: Team manager cannot access administrative settings (HTTP 403)
  await t.test("Test 4: Team manager cannot access administrative settings", async () => {
    const req = new NextRequest("http://localhost:3000/api/tournament/settings", {
      headers: { cookie: `szwbt_session=${teamManagerToken}` },
    });
    const res = await getTournamentSettings(req);
    assert.equal(res.status, 403);
  });

  // Test 5: Unauthenticated request is rejected with HTTP 401 Unauthorized
  await t.test("Test 5: Unauthenticated request is rejected with HTTP 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/tournament/overview");
    const res = await getTournamentOverview(req);
    assert.equal(res.status, 401);
  });

  // Test 6: Tournament Admin can update settings and invalid status is rejected
  await t.test("Test 6: Tournament Admin can update settings and invalid status is rejected", async () => {
    // 6a: Invalid status rejected with 400
    const invalidReq = new NextRequest("http://localhost:3000/api/tournament/settings", {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${tournamentAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: "INVALID_STATUS" }),
    });
    const invalidRes = await updateTournamentSettings(invalidReq);
    assert.equal(invalidRes.status, 400);

    // 6b: Valid update
    const validReq = new NextRequest("http://localhost:3000/api/tournament/settings", {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${tournamentAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: "LIVE",
        venue: "KLE Technological University Indoor Stadium, Hubballi",
      }),
    });
    const validRes = await updateTournamentSettings(validReq);
    assert.equal(validRes.status, 200);
    const body = await validRes.json();
    assert.equal(body.success, true);
  });

  // Test 7: Tournament Admin can manage categories
  await t.test("Test 7: Tournament Admin can query and create categories", async () => {
    const getReq = new NextRequest("http://localhost:3000/api/tournament/categories", {
      headers: { cookie: `szwbt_session=${tournamentAdminToken}` },
    });
    const getRes = await getTournamentCategories(getReq);
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.success, true);
    assert(Array.isArray(getBody.categories));
    assert(getBody.categories.some((c: any) => c.code === "WS"));

    // Duplicate code rejection
    const dupReq = new NextRequest("http://localhost:3000/api/tournament/categories", {
      method: "POST",
      headers: {
        cookie: `szwbt_session=${tournamentAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Duplicate Women's Singles",
        code: "WS",
      }),
    });
    const dupRes = await createTournamentCategory(dupReq);
    assert.equal(dupRes.status, 400);
  });

  // Test 8: Tournament Admin can query events
  await t.test("Test 8: Tournament Admin can query competitive events", async () => {
    const req = new NextRequest("http://localhost:3000/api/tournament/events", {
      headers: { cookie: `szwbt_session=${tournamentAdminToken}` },
    });
    const res = await getTournamentEvents(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(Array.isArray(body.events));
    assert(body.events.length >= 1);
  });

  // Test 9: Tournament Admin can query and update court status
  await t.test("Test 9: Tournament Admin can query and update court status", async () => {
    const listReq = new NextRequest("http://localhost:3000/api/tournament/courts", {
      headers: { cookie: `szwbt_session=${tournamentAdminToken}` },
    });
    const listRes = await getTournamentCourts(listReq);
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.success, true);
    assert(listBody.courts.length >= 8);

    const targetCourt = listBody.courts[0];
    const updateReq = new NextRequest(`http://localhost:3000/api/tournament/courts/${targetCourt.id}`, {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${tournamentAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: "READY" }),
    });
    const updateRes = await updateTournamentCourt(updateReq, {
      params: Promise.resolve({ id: targetCourt.id }),
    });
    assert.equal(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.equal(updateBody.success, true);
    assert.equal(updateBody.court.status, "READY");
  });

  // Test 10: Schedule Conflict Validation: Double booking court is rejected (409)
  await t.test("Test 10: Schedule Conflict: Double booking is strictly rejected with 409", async () => {
    // First unlock schedule if locked
    await prisma.scheduleLock.upsert({
      where: { id: "CURRENT_SCHEDULE_LOCK" },
      update: { isLocked: false },
      create: { id: "CURRENT_SCHEDULE_LOCK", isLocked: false },
    });

    // Check existing match to collide with
    const existing = await prisma.match.findFirst();
    assert(existing, "An existing match fixture must exist for collision test");

    const conflictReq = new NextRequest("http://localhost:3000/api/tournament/schedule", {
      method: "POST",
      headers: {
        cookie: `szwbt_session=${tournamentAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dayId: existing.dayId,
        court: existing.court,
        time: existing.time,
        category: "Women's Singles",
        matchNumber: "COLLISION_TEST_99",
        playerA: "Test Player 1",
        playerB: "Test Player 2",
      }),
    });
    const conflictRes = await scheduleTournamentMatch(conflictReq);
    assert.equal(conflictRes.status, 409);
    const conflictBody = await conflictRes.json();
    assert.equal(conflictBody.success, false);
    assert(conflictBody.error.includes("Court Conflict"));
  });

  // Test 11: Schedule Lock prevents fixture modification (423 Locked)
  await t.test("Test 11: Schedule Lock prevents fixture modification", async () => {
    // Set schedule lock to true
    await prisma.scheduleLock.upsert({
      where: { id: "CURRENT_SCHEDULE_LOCK" },
      update: { isLocked: true, lockedBy: "test@szwbt2026.edu" },
      create: { id: "CURRENT_SCHEDULE_LOCK", isLocked: true, lockedBy: "test@szwbt2026.edu" },
    });

    const createReq = new NextRequest("http://localhost:3000/api/tournament/schedule", {
      method: "POST",
      headers: {
        cookie: `szwbt_session=${tournamentAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        dayId: "OCT21",
        court: "Court 08",
        time: "17:00 IST",
        category: "Women's Singles",
        matchNumber: "LOCK_TEST_M1",
        playerA: "Locked Player A",
        playerB: "Locked Player B",
      }),
    });
    const createRes = await scheduleTournamentMatch(createReq);
    assert.equal(createRes.status, 423);

    // Clean up: unlock schedule
    await prisma.scheduleLock.update({
      where: { id: "CURRENT_SCHEDULE_LOCK" },
      data: { isLocked: false },
    });
  });

  // Test 12: Tournament Admin can query Schedule Conflict Center
  await t.test("Test 12: Tournament Admin can query Schedule Conflict Center", async () => {
    const req = new NextRequest("http://localhost:3000/api/tournament/conflicts", {
      headers: { cookie: `szwbt_session=${tournamentAdminToken}` },
    });
    const res = await getScheduleConflicts(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(Array.isArray(body.conflicts));
    assert(typeof body.totalConflicts === "number");
  });

  // Test 13: Tournament Admin can query 12-sector readiness checklist
  await t.test("Test 13: Tournament Admin can query 12-sector readiness checklist", async () => {
    const req = new NextRequest("http://localhost:3000/api/tournament/readiness", {
      headers: { cookie: `szwbt_session=${tournamentAdminToken}` },
    });
    const res = await getTournamentReadiness(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(Array.isArray(body.sectors));
    assert.equal(body.sectors.length, 12, "Must contain all 12 operational sectors");

    // Verify transport sector strictly enforces zero payment
    const transportSector = body.sectors.find((s: any) => s.sector === "TRANSPORT");
    assert(transportSector, "Transport readiness sector must exist");
    assert.equal(transportSector.metrics.hasPayment, false);
  });
});
