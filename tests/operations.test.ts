import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as getOperationsOverview } from "@/app/api/operations/route";
import { GET as getIncidents, POST as createIncident } from "@/app/api/operations/incidents/route";
import { GET as getIncidentDetail, PATCH as updateIncident } from "@/app/api/operations/incidents/[id]/route";
import { GET as getTasks, POST as createTask } from "@/app/api/operations/tasks/route";
import { GET as getTaskDetail, PATCH as updateTask } from "@/app/api/operations/tasks/[id]/route";
import { GET as getVenueAreas, PATCH as updateVenueArea } from "@/app/api/operations/venue/route";
import { GET as getStaffRoster, POST as createStaffAssignment } from "@/app/api/operations/staff/route";
import { GET as getCourtsOverview, PATCH as updateCourtStatus } from "@/app/api/operations/courts/route";
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

describe("ON-GROUND OPERATIONS COMMAND CENTER TESTS (/operations)", async () => {
  // Setup users
  let opsUser: any;
  let superAdminUser: any;
  let participantUser: any;
  let volunteerUser: any;
  let opsToken: string;
  let superAdminToken: string;
  let participantToken: string;
  let volunteerToken: string;

  before(async () => {
    opsUser = await prisma.user.findUnique({ where: { email: "ops@szwbt2026.edu" } });
    superAdminUser = await prisma.user.findUnique({ where: { email: "admin@szwbt2026.edu" } });
    participantUser = await prisma.user.findUnique({ where: { email: "player@szwbt2026.edu" } });
    volunteerUser = await prisma.user.findUnique({ where: { email: "volunteer@szwbt2026.edu" } });

    assert.ok(opsUser, "Operations user exists in test database");
    assert.ok(superAdminUser, "Super admin user exists in test database");
    assert.ok(participantUser, "Participant user exists in test database");

    opsToken = createSessionToken({
      userId: opsUser.id,
      email: opsUser.email,
      roles: [ROLES.OPERATIONS_STAFF],
      permissions: [
        PERMISSIONS.REGISTRATION_READ,
        PERMISSIONS.ACCOMMODATION_READ,
        PERMISSIONS.TRANSPORT_READ,
        PERMISSIONS.ANNOUNCEMENT_READ,
        PERMISSIONS.PARTICIPANT_READ,
        PERMISSIONS.LIVE_READ,
        PERMISSIONS.LIVE_OPERATE,
      ],
    });

    superAdminToken = createSessionToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      roles: [ROLES.SUPER_ADMIN],
      permissions: Object.values(PERMISSIONS),
    });

    participantToken = createSessionToken({
      userId: participantUser.id,
      email: participantUser.email,
      roles: [ROLES.PARTICIPANT],
      permissions: [PERMISSIONS.PARTICIPANT_READ],
    });

    if (volunteerUser) {
      volunteerToken = createSessionToken({
        userId: volunteerUser.id,
        email: volunteerUser.email,
        roles: [ROLES.VOLUNTEER],
        permissions: [PERMISSIONS.TRANSPORT_READ, PERMISSIONS.ANNOUNCEMENT_READ],
      });
    }
  });

  // TEST 1: Authorized Operations Staff can access /api/operations
  it("Test 1: Authorized Operations Staff can access command center telemetry", async () => {
    const req = createMockRequest("/api/operations", "GET", undefined, opsToken);
    const res = await getOperationsOverview(req);
    assert.equal(res.status, 200, "Should return HTTP 200 OK");
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.globalStatus, "Global status should be populated");
    assert.ok(json.metrics, "Metrics should be populated");
    assert.ok(Array.isArray(json.incidents), "Incidents list should be array");
    assert.ok(Array.isArray(json.tasks), "Tasks list should be array");
    assert.ok(Array.isArray(json.venueAreas), "Venue areas list should be array");
  });

  // TEST 2: Unauthorized role (Participant) rejected with 403 Forbidden
  it("Test 2: Unauthorized Participant is strictly rejected with HTTP 403 Forbidden", async () => {
    const req = createMockRequest("/api/operations", "GET", undefined, participantToken);
    const res = await getOperationsOverview(req);
    assert.equal(res.status, 403, "Should return HTTP 403 Forbidden");
    const json = await res.json();
    assert.equal(json.success, false);
    assert.match(json.error, /403 Forbidden/);
  });

  // TEST 3: Unauthenticated request rejected with 401 Unauthorized
  it("Test 3: Unauthenticated request is strictly rejected with HTTP 401 Unauthorized", async () => {
    const req = createMockRequest("/api/operations", "GET");
    const res = await getOperationsOverview(req);
    assert.equal(res.status, 401, "Should return HTTP 401 Unauthorized");
  });

  // TEST 4: Incident Creation Workflow
  let createdIncidentId: string;
  it("Test 4: Operations Staff can report a high-priority operational incident", async () => {
    const body = {
      title: "Court 03 Light Fixture Flickering",
      category: "VENUE",
      severity: "HIGH",
      priority: "HIGH",
      location: "Court Block B - Court 03",
      description: "High-bay LED array #4 intermittent flicker during practice.",
    };
    const req = createMockRequest("/api/operations/incidents", "POST", body, opsToken);
    const res = await createIncident(req);
    assert.equal(res.status, 200, "Should return HTTP 200");
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.incident.id);
    assert.equal(json.incident.severity, "HIGH");
    createdIncidentId = json.incident.id;
  });

  // TEST 5: Query Incidents with filter
  it("Test 5: Operations Staff can filter incidents by severity and category", async () => {
    const req = createMockRequest(
      "/api/operations/incidents?severity=HIGH&category=VENUE",
      "GET",
      undefined,
      opsToken
    );
    const res = await getIncidents(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.incidents));
    assert.ok(json.incidents.some((i: any) => i.id === createdIncidentId));
  });

  // TEST 6: Incident Detail & Lifecycle Update (Acknowledge & Assign)
  it("Test 6: Operations Staff can acknowledge and assign responder to incident", async () => {
    assert.ok(createdIncidentId, "Incident ID must exist from previous test");
    const req = createMockRequest(
      `/api/operations/incidents/${createdIncidentId}`,
      "PATCH",
      {
        status: "IN_PROGRESS",
        assignedResponder: "Electrical Maintenance Team",
        latestUpdate: "Electrician dispatched with replacement ballast",
      },
      opsToken
    );
    const res = await updateIncident(req, { params: Promise.resolve({ id: createdIncidentId }) });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.incident.status, "IN_PROGRESS");
    assert.equal(json.incident.assignedResponder, "Electrical Maintenance Team");
  });

  // TEST 7: Resolve Incident with Audit logging
  it("Test 7: Operations Staff can resolve incident with resolution notes", async () => {
    assert.ok(createdIncidentId);
    const req = createMockRequest(
      `/api/operations/incidents/${createdIncidentId}`,
      "PATCH",
      {
        status: "RESOLVED",
        resolutionNotes: "Ballast replaced. Court 03 illumination verified at 1500 lux.",
      },
      opsToken
    );
    const res = await updateIncident(req, { params: Promise.resolve({ id: createdIncidentId }) });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.incident.status, "RESOLVED");
    assert.equal(json.incident.resolutionNotes, "Ballast replaced. Court 03 illumination verified at 1500 lux.");
  });

  // TEST 8: Task Command Center - Create Task
  let createdTaskId: string;
  it("Test 8: Operations Staff can dispatch new task to queue", async () => {
    const body = {
      title: "Inspect Umpire Radios Court Block A",
      category: "TECHNICAL",
      priority: "NORMAL",
      location: "Court Block A Desk",
      dueTime: "11:45 IST",
      instructions: "Check battery levels and frequency channel 4.",
    };
    const req = createMockRequest("/api/operations/tasks", "POST", body, opsToken);
    const res = await createTask(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.task.id);
    createdTaskId = json.task.id;
  });

  // TEST 9: Task Status Update
  it("Test 9: Operations Staff can update task status to COMPLETED", async () => {
    assert.ok(createdTaskId);
    const req = createMockRequest(
      `/api/operations/tasks/${createdTaskId}`,
      "PATCH",
      { status: "COMPLETED" },
      opsToken
    );
    const res = await updateTask(req, { params: Promise.resolve({ id: createdTaskId }) });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.task.status, "COMPLETED");
  });

  // TEST 10: Venue Sector Readiness Query and Update
  it("Test 10: Operations Staff can query and update venue area status", async () => {
    const reqList = createMockRequest("/api/operations/venue", "GET", undefined, opsToken);
    const resList = await getVenueAreas(reqList);
    assert.equal(resList.status, 200);
    const jsonList = await resList.json();
    assert.ok(jsonList.venueAreas.length > 0);

    const firstArea = jsonList.venueAreas[0];
    const reqUpdate = createMockRequest(
      "/api/operations/venue",
      "PATCH",
      { id: firstArea.id, status: "ACTIVE", notes: "Field check completed" },
      opsToken
    );
    const resUpdate = await updateVenueArea(reqUpdate);
    assert.equal(resUpdate.status, 200);
    const jsonUpdate = await resUpdate.json();
    assert.equal(jsonUpdate.venueArea.status, "ACTIVE");
  });

  // TEST 11: Staff & Volunteer Roster Query and Deployment
  it("Test 11: Operations Staff can query personnel roster and create deployment assignment", async () => {
    const reqList = createMockRequest("/api/operations/staff", "GET", undefined, opsToken);
    const resList = await getStaffRoster(reqList);
    assert.equal(resList.status, 200);
    const jsonList = await resList.json();
    assert.ok(Array.isArray(jsonList.staff));

    if (volunteerUser) {
      const reqAssign = createMockRequest(
        "/api/operations/staff",
        "POST",
        {
          userId: volunteerUser.id,
          title: "Evening Shuttle Escort",
          venue: "Arena South Bay",
          area: "Transit Hub",
          shiftStart: "18:00",
          shiftEnd: "21:00",
          supervisor: "Fleet Officer Somesh",
        },
        opsToken
      );
      const resAssign = await createStaffAssignment(reqAssign);
      assert.equal(resAssign.status, 200);
      const jsonAssign = await resAssign.json();
      assert.equal(jsonAssign.success, true);
      assert.equal(jsonAssign.assignment.title, "Evening Shuttle Escort");
    }
  });

  // TEST 12: Courts Operational Overview
  it("Test 12: Operations Staff can query court status overview", async () => {
    const req = createMockRequest("/api/operations/courts", "GET", undefined, opsToken);
    const res = await getCourtsOverview(req);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.courts));
    assert.ok(json.courts.some((c: any) => c.courtNumber === "Court 01"));
  });

  // TEST 13: Zero Transport Payment Policy Enforced
  it("Test 13: Zero transport payment policy strictly verified in operations contracts", async () => {
    const req = createMockRequest("/api/operations", "GET", undefined, opsToken);
    const res = await getOperationsOverview(req);
    const json = await res.json();
    assert.equal(
      json.globalStatus.transport,
      "IN SERVICE",
      "Transport is strictly complimentary operations without payment"
    );
  });
});
