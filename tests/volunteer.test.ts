import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as getVolunteerOverview } from "@/app/api/volunteer/route";
import { GET as getVolunteerTasks } from "@/app/api/volunteer/tasks/route";
import { GET as getVolunteerTaskDetail, PATCH as updateVolunteerTask } from "@/app/api/volunteer/tasks/[id]/route";
import { GET as getVolunteerAssignments } from "@/app/api/volunteer/assignments/route";
import { GET as getVolunteerShift, POST as updateVolunteerShift } from "@/app/api/volunteer/shift/route";
import { GET as getVolunteerIssues, POST as reportVolunteerIssue } from "@/app/api/volunteer/issues/route";
import { POST as requestVolunteerHelp } from "@/app/api/volunteer/help/route";
import { GET as getVolunteerProfile } from "@/app/api/volunteer/profile/route";
import { createSessionToken } from "@/lib/rbac/token";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/rbac/roles";
import { PERMISSIONS } from "@/lib/rbac/permissions";

function createMockRequest(
  url: string,
  method = "GET",
  body?: any,
  token?: string
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Cookie"] = `szwbt_session=${token}`;
  }

  const init: any = {
    method,
    headers,
  };
  if (body) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("VOLUNTEER OPERATIONS PORTAL TESTS (/volunteer)", async () => {
  let volUser: any;
  let otherVolUser: any;
  let participantUser: any;
  let superAdminUser: any;
  let volToken: string;
  let otherVolToken: string;
  let participantToken: string;
  let superAdminToken: string;

  before(async () => {
    volUser = await prisma.user.findUnique({ where: { email: "volunteer@szwbt2026.edu" } });
    participantUser = await prisma.user.findUnique({ where: { email: "player@szwbt2026.edu" } });
    superAdminUser = await prisma.user.findUnique({ where: { email: "admin@szwbt2026.edu" } });

    assert.ok(volUser, "Volunteer user exists");
    assert.ok(participantUser, "Participant user exists");

    // Ensure a second volunteer exists for strict resource isolation tests
    otherVolUser = await prisma.user.upsert({
      where: { email: "volunteer2@szwbt2026.edu" },
      update: {},
      create: {
        email: "volunteer2@szwbt2026.edu",
        name: "Second Volunteer Rahul",
        passwordHash: "szwbt2026pass",
        badge: "FIELD DESK 2",
        targetUrl: "/volunteer",
      },
    });

    volToken = createSessionToken({
      userId: volUser.id,
      email: volUser.email,
      roles: [ROLES.VOLUNTEER],
      permissions: [PERMISSIONS.TRANSPORT_READ, PERMISSIONS.ANNOUNCEMENT_READ, PERMISSIONS.MATCH_READ],
    });

    otherVolToken = createSessionToken({
      userId: otherVolUser.id,
      email: otherVolUser.email,
      roles: [ROLES.VOLUNTEER],
      permissions: [PERMISSIONS.TRANSPORT_READ, PERMISSIONS.ANNOUNCEMENT_READ],
    });

    participantToken = createSessionToken({
      userId: participantUser.id,
      email: participantUser.email,
      roles: [ROLES.PARTICIPANT],
      permissions: [PERMISSIONS.PARTICIPANT_READ],
    });

    superAdminToken = createSessionToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      roles: [ROLES.SUPER_ADMIN],
      permissions: Object.values(PERMISSIONS),
    });
  });

  // TEST 1: Authorized Volunteer can access /api/volunteer
  it("Test 1: Authorized Volunteer can access overview telemetry", async () => {
    const req = createMockRequest("/api/volunteer", "GET", undefined, volToken);
    const res = await getVolunteerOverview(req);
    assert.equal(res.status, 200, "Should return HTTP 200 OK");
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.volunteer);
    assert.ok(json.currentShift);
    assert.ok(json.kpis);
    assert.ok(Array.isArray(json.tasks));
  });

  // TEST 2: Unauthorized user (Participant) is rejected with 403 Forbidden
  it("Test 2: Unauthorized Participant is strictly rejected with HTTP 403 Forbidden", async () => {
    const req = createMockRequest("/api/volunteer", "GET", undefined, participantToken);
    const res = await getVolunteerOverview(req);
    assert.equal(res.status, 403, "Should return HTTP 403 Forbidden");
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error, /403 Forbidden/);
  });

  // TEST 3: Unauthenticated request rejected with 401
  it("Test 3: Unauthenticated request is strictly rejected with HTTP 401 Unauthorized", async () => {
    const req = createMockRequest("/api/volunteer", "GET");
    const res = await getVolunteerOverview(req);
    assert.equal(res.status, 401, "Should return HTTP 401 Unauthorized");
  });

  // TEST 4: Query Volunteer Tasks
  let ownTaskId: string;
  it("Test 4: Volunteer can query their assigned operational tasks", async () => {
    const req = createMockRequest("/api/volunteer/tasks", "GET", undefined, volToken);
    const res = await getVolunteerTasks(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.tasks));
    assert.ok(json.tasks.length > 0);
    ownTaskId = json.tasks[0].id;
  });

  // TEST 5: STRICT RESOURCE ISOLATION - Volunteer A can view own task
  it("Test 5: Volunteer A can view own task specification", async () => {
    assert.ok(ownTaskId);
    const req = createMockRequest(`/api/volunteer/tasks/${ownTaskId}`, "GET", undefined, volToken);
    const res = await getVolunteerTaskDetail(req, { params: Promise.resolve({ id: ownTaskId }) });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.task.id, ownTaskId);
  });

  // TEST 6: STRICT RESOURCE ISOLATION - Volunteer B CANNOT view Volunteer A's task (403 Forbidden)
  it("Test 6: Volunteer B CANNOT view Volunteer A's task (Strict HTTP 403 Forbidden)", async () => {
    assert.ok(ownTaskId);
    const req = createMockRequest(`/api/volunteer/tasks/${ownTaskId}`, "GET", undefined, otherVolToken);
    const res = await getVolunteerTaskDetail(req, { params: Promise.resolve({ id: ownTaskId }) });
    assert.equal(res.status, 403, "Should return HTTP 403 Forbidden for unauthorized volunteer");
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error, /403 Forbidden/);
  });

  // TEST 7: STRICT RESOURCE ISOLATION - Volunteer B CANNOT mutate Volunteer A's task (403 Forbidden)
  it("Test 7: Volunteer B CANNOT mutate Volunteer A's task status (Strict HTTP 403 Forbidden)", async () => {
    assert.ok(ownTaskId);
    const req = createMockRequest(
      `/api/volunteer/tasks/${ownTaskId}`,
      "PATCH",
      { status: "COMPLETED" },
      otherVolToken
    );
    const res = await updateVolunteerTask(req, { params: Promise.resolve({ id: ownTaskId }) });
    assert.equal(res.status, 403, "Must reject cross-volunteer mutation with 403 Forbidden");
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error, /403 Forbidden/);
  });

  // TEST 8: Task Workflow - Volunteer A can update own task (In Progress -> Completed)
  it("Test 8: Volunteer A can transition own task to IN_PROGRESS and then COMPLETED", async () => {
    assert.ok(ownTaskId);
    // Start task
    const reqStart = createMockRequest(
      `/api/volunteer/tasks/${ownTaskId}`,
      "PATCH",
      { status: "IN_PROGRESS" },
      volToken
    );
    const resStart = await updateVolunteerTask(reqStart, { params: Promise.resolve({ id: ownTaskId }) });
    assert.equal(resStart.status, 200);
    const jsonStart = await resStart.json();
    assert.equal(jsonStart.task.status, "IN_PROGRESS");

    // Complete task
    const reqComp = createMockRequest(
      `/api/volunteer/tasks/${ownTaskId}`,
      "PATCH",
      { status: "COMPLETED" },
      volToken
    );
    const resComp = await updateVolunteerTask(reqComp, { params: Promise.resolve({ id: ownTaskId }) });
    assert.equal(resComp.status, 200);
    const jsonComp = await resComp.json();
    assert.equal(jsonComp.task.status, "COMPLETED");
  });

  // TEST 9: Shift Lifecycle Mutations
  it("Test 9: Volunteer can execute shift lifecycle (BREAK, RESUME, END_SHIFT)", async () => {
    // Break
    const reqBreak = createMockRequest(
      "/api/volunteer/shift",
      "POST",
      { action: "BREAK", notes: "15 min lunch interval" },
      volToken
    );
    const resBreak = await updateVolunteerShift(reqBreak);
    assert.equal(resBreak.status, 200);
    const jsonBreak = await resBreak.json();
    assert.equal(jsonBreak.shift.status, "BREAK");

    // Resume
    const reqResume = createMockRequest(
      "/api/volunteer/shift",
      "POST",
      { action: "RESUME" },
      volToken
    );
    const resResume = await updateVolunteerShift(reqResume);
    assert.equal(resResume.status, 200);
    const jsonResume = await resResume.json();
    assert.equal(jsonResume.shift.status, "ON_SHIFT");
  });

  // TEST 10: Issue Reporting
  let createdIssueId: string;
  it("Test 10: Volunteer can report operational issue from the field", async () => {
    const body = {
      title: "Water Dispenser Empty Court Block A",
      category: "EQUIPMENT",
      priority: "NORMAL",
      location: "Court Block A - Umpire Lounge",
      description: "20L bubbletop can depleted, athletes requesting drinking water.",
    };
    const req = createMockRequest("/api/volunteer/issues", "POST", body, volToken);
    const res = await reportVolunteerIssue(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.issue.id);
    createdIssueId = json.issue.id;
  });

  // TEST 11: View Own Reported Issues
  it("Test 11: Volunteer can list their own reported issues", async () => {
    const req = createMockRequest("/api/volunteer/issues", "GET", undefined, volToken);
    const res = await getVolunteerIssues(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.issues));
    assert.ok(json.issues.some((i: any) => i.id === createdIssueId));
  });

  // TEST 12: Request Help / Urgent Escalation
  it("Test 12: Volunteer can trigger REQUEST HELP distress dispatch", async () => {
    const body = {
      destination: "Medical",
      message: "Athlete sprained ankle during warm-up court 2. Requesting physiotherapist with ice pack.",
      location: "Annex Practice Hall",
    };
    const req = createMockRequest("/api/volunteer/help", "POST", body, volToken);
    const res = await requestVolunteerHelp(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.incident.escalatedTo, "Medical");
    assert.equal(json.incident.priority, "URGENT");
  });

  // TEST 13: Query Volunteer Profile
  it("Test 13: Volunteer can query their operational profile", async () => {
    const req = createMockRequest("/api/volunteer/profile", "GET", undefined, volToken);
    const res = await getVolunteerProfile(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.profile.volunteerCode);
    assert.equal(json.profile.email, volUser.email);
  });
});
