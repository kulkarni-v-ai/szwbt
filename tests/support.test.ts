import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/rbac/token";
import { ROLES } from "../src/lib/rbac/roles";
import { PERMISSIONS } from "../src/lib/rbac/permissions";
import { GET as getSupportOverview } from "../src/app/api/support/route";
import {
  GET as getTickets,
  POST as createTicket,
} from "../src/app/api/support/tickets/route";
import {
  GET as getTicketById,
  PATCH as patchTicketById,
} from "../src/app/api/support/tickets/[id]/route";
import { POST as postTicketMessage } from "../src/app/api/support/tickets/[id]/messages/route";
import { POST as escalateTicket } from "../src/app/api/support/tickets/[id]/escalate/route";
import { GET as getFinancePayments } from "../src/app/api/finance/payments/route";

test("SUPPORT / HELP DESK PORTAL TESTS (/support)", async (t) => {
  // 1. Setup Auth Tokens
  const supportUser = await prisma.user.findUnique({
    where: { email: "support@szwbt2026.edu" },
  });
  assert(supportUser, "Support Desk Lead user must exist in database");

  const supportToken = createSessionToken({
    userId: supportUser.id,
    email: supportUser.email,
    roles: [ROLES.SUPPORT_STAFF],
    permissions: [
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.ACCOMMODATION_READ,
      PERMISSIONS.TRANSPORT_READ,
      PERMISSIONS.ANNOUNCEMENT_READ,
      PERMISSIONS.SUPPORT_READ,
      PERMISSIONS.SUPPORT_CREATE,
      PERMISSIONS.SUPPORT_UPDATE,
      PERMISSIONS.SUPPORT_ASSIGN,
      PERMISSIONS.SUPPORT_RESOLVE,
      PERMISSIONS.SUPPORT_CLOSE,
      PERMISSIONS.SUPPORT_ESCALATE,
      PERMISSIONS.SUPPORT_COMMENT,
    ],
  });

  const participantUser = await prisma.user.findFirst({
    where: { email: "player@szwbt2026.edu" },
  });
  assert(participantUser, "Participant user must exist");

  const participantToken = createSessionToken({
    userId: participantUser.id,
    email: participantUser.email,
    roles: [ROLES.PARTICIPANT],
    permissions: [PERMISSIONS.PARTICIPANT_READ],
  });

  const volunteerUser = await prisma.user.findFirst({
    where: { email: "volunteer@szwbt2026.edu" },
  });
  assert(volunteerUser, "Volunteer user must exist");

  const volunteerToken = createSessionToken({
    userId: volunteerUser.id,
    email: volunteerUser.email,
    roles: [ROLES.VOLUNTEER],
    permissions: [PERMISSIONS.TRANSPORT_READ],
  });

  const foreignParticipantToken = createSessionToken({
    userId: "foreign-user-id-999",
    email: "foreign.athlete@otheruni.edu",
    roles: [ROLES.PARTICIPANT],
    permissions: [PERMISSIONS.PARTICIPANT_READ],
  });

  const supportHeaders = {
    Cookie: `szwbt_session=${supportToken}`,
    Authorization: `Bearer ${supportToken}`,
  };

  const participantHeaders = {
    Cookie: `szwbt_session=${participantToken}`,
    Authorization: `Bearer ${participantToken}`,
  };

  const volunteerHeaders = {
    Cookie: `szwbt_session=${volunteerToken}`,
    Authorization: `Bearer ${volunteerToken}`,
  };

  const foreignParticipantHeaders = {
    Cookie: `szwbt_session=${foreignParticipantToken}`,
    Authorization: `Bearer ${foreignParticipantToken}`,
  };

  let testTicketId: string = "";

  // -------------------------------------------------------------
  // TEST 1: Authorized Support Staff can access overview telemetry
  // -------------------------------------------------------------
  await t.test("Test 1: Authorized Support Staff can access overview telemetry", async () => {
    const req = new NextRequest("http://localhost:3000/api/support", {
      headers: supportHeaders,
    });
    const res = await getSupportOverview(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(typeof data.summary.openTickets, "number");
    assert.equal(typeof data.summary.unassignedTickets, "number");
    assert.equal(Array.isArray(data.priorityQueue), true);
    assert.equal(data.permissions.canCreate, true);
    assert.equal(data.permissions.canResolve, true);
  });

  // -------------------------------------------------------------
  // TEST 2: Unauthorized Volunteer is strictly rejected with HTTP 403 Forbidden
  // -------------------------------------------------------------
  await t.test("Test 2: Unauthorized Volunteer is strictly rejected with HTTP 403 Forbidden", async () => {
    const req = new NextRequest("http://localhost:3000/api/support", {
      headers: volunteerHeaders,
    });
    const res = await getSupportOverview(req);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /403 Forbidden/i);
  });

  // -------------------------------------------------------------
  // TEST 3: Unauthenticated request is strictly rejected with HTTP 401 Unauthorized
  // -------------------------------------------------------------
  await t.test("Test 3: Unauthenticated request is strictly rejected with HTTP 401 Unauthorized", async () => {
    const req = new NextRequest("http://localhost:3000/api/support");
    const res = await getSupportOverview(req);
    assert.equal(res.status, 401);
  });

  // -------------------------------------------------------------
  // TEST 4: Support Staff can create a new support ticket
  // -------------------------------------------------------------
  await t.test("Test 4: Support Staff can create a new support ticket", async () => {
    const req = new NextRequest("http://localhost:3000/api/support/tickets", {
      method: "POST",
      headers: { ...supportHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Player Jersey Number Registration Discrepancy",
        description: "Jersey registered as #7 but athlete wears #10 on court. Requesting scorekeeper notification.",
        requesterEmail: "player@szwbt2026.edu",
        requesterName: "Ananya Sharma",
        requesterType: "PARTICIPANT",
        category: "REGISTRATION",
        priority: "NORMAL",
        relatedResourceType: "PARTICIPANT",
        relatedResourceId: "P-SZWBT-001",
      }),
    });
    const res = await createTicket(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.ticket.subject, "Player Jersey Number Registration Discrepancy");
    assert.match(data.ticket.ticketNumber, /^TKT-2026-/);
    testTicketId = data.ticket.id;
  });

  // -------------------------------------------------------------
  // TEST 5: Support Staff can assign ticket to eligible support responder
  // -------------------------------------------------------------
  await t.test("Test 5: Support Staff can assign ticket to eligible support responder", async () => {
    assert(testTicketId, "Test ticket ID must exist");
    const req = new NextRequest(`http://localhost:3000/api/support/tickets/${testTicketId}`, {
      method: "PATCH",
      headers: { ...supportHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ASSIGN",
        assignedAgentEmail: "agent.kavya@szwbt2026.edu",
        assignedAgentName: "Kavya Murthy",
      }),
    });
    const res = await patchTicketById(req, {
      params: Promise.resolve({ id: testTicketId }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.ticket.assignedAgentEmail, "agent.kavya@szwbt2026.edu");
  });

  // -------------------------------------------------------------
  // TEST 6: Assigning to ineligible or non-existent user is strictly rejected
  // -------------------------------------------------------------
  await t.test("Test 6: Assigning to ineligible user is strictly rejected", async () => {
    assert(testTicketId, "Test ticket ID must exist");
    const req = new NextRequest(`http://localhost:3000/api/support/tickets/${testTicketId}`, {
      method: "PATCH",
      headers: { ...supportHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ASSIGN",
        assignedAgentEmail: "nonexistent.fake@szwbt2026.edu",
      }),
    });
    const res = await patchTicketById(req, {
      params: Promise.resolve({ id: testTicketId }),
    });
    assert.equal(res.status, 400);
  });

  // -------------------------------------------------------------
  // TEST 7: Support Staff can post public response and internal note
  // -------------------------------------------------------------
  await t.test("Test 7: Support Staff can post public response and internal note", async () => {
    assert(testTicketId, "Test ticket ID must exist");

    // 1. Post internal note
    const noteReq = new NextRequest(`http://localhost:3000/api/support/tickets/${testTicketId}/messages`, {
      method: "POST",
      headers: { ...supportHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Internal note: Chief match official notified. Table umpire will verify during warmup.",
        messageType: "INTERNAL_NOTE",
      }),
    });
    const noteRes = await postTicketMessage(noteReq, {
      params: Promise.resolve({ id: testTicketId }),
    });
    const noteData = await noteRes.json();

    assert.equal(noteRes.status, 200);
    assert.equal(noteData.message.messageType, "INTERNAL_NOTE");

    // 2. Post public reply
    const replyReq = new NextRequest(`http://localhost:3000/api/support/tickets/${testTicketId}/messages`, {
      method: "POST",
      headers: { ...supportHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Hello Ananya, we have updated your court lineup roster with jersey #10.",
        messageType: "PUBLIC",
      }),
    });
    const replyRes = await postTicketMessage(replyReq, {
      params: Promise.resolve({ id: testTicketId }),
    });
    const replyData = await replyRes.json();

    assert.equal(replyRes.status, 200);
    assert.equal(replyData.message.messageType, "PUBLIC");
  });

  // -------------------------------------------------------------
  // TEST 8: Participant sees public messages, but INTERNAL NOTES are strictly hidden
  // -------------------------------------------------------------
  await t.test("Test 8: Requester participant sees public messages, but INTERNAL NOTES are strictly hidden", async () => {
    assert(testTicketId, "Test ticket ID must exist");
    const req = new NextRequest(`http://localhost:3000/api/support/tickets/${testTicketId}`, {
      headers: participantHeaders, // Ananya's token
    });
    const res = await getTicketById(req, {
      params: Promise.resolve({ id: testTicketId }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);

    // Verify ZERO internal notes are exposed
    const hasInternalNotes = data.ticket.messages.some((m: any) => m.messageType === "INTERNAL_NOTE");
    assert.equal(hasInternalNotes, false, "Internal notes must NEVER be exposed to participant requesters");

    // Verify public messages are present
    const hasPublicMessage = data.ticket.messages.some((m: any) => m.messageType === "PUBLIC");
    assert.equal(hasPublicMessage, true, "Public messages must be visible to requester");
  });

  // -------------------------------------------------------------
  // TEST 9: Another participant CANNOT access this ticket (HTTP 403 Forbidden)
  // -------------------------------------------------------------
  await t.test("Test 9: Foreign participant CANNOT access another participant's ticket (HTTP 403 Forbidden)", async () => {
    assert(testTicketId, "Test ticket ID must exist");
    const req = new NextRequest(`http://localhost:3000/api/support/tickets/${testTicketId}`, {
      headers: foreignParticipantHeaders,
    });
    const res = await getTicketById(req, {
      params: Promise.resolve({ id: testTicketId }),
    });
    assert.equal(res.status, 403);
  });

  // -------------------------------------------------------------
  // TEST 10: Support staff can escalate ticket to target department
  // -------------------------------------------------------------
  await t.test("Test 10: Support staff can escalate ticket to target department", async () => {
    assert(testTicketId, "Test ticket ID must exist");
    const req = new NextRequest(`http://localhost:3000/api/support/tickets/${testTicketId}/escalate`, {
      method: "POST",
      headers: { ...supportHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        targetDepartment: "MATCH_OPERATIONS",
        escalationReason: "Need official referee sign-off on court scorecard for jersey change.",
        priority: "HIGH",
      }),
    });
    const res = await escalateTicket(req, {
      params: Promise.resolve({ id: testTicketId }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.ticket.status, "ESCALATED");
    assert.equal(data.escalation.targetDepartment, "MATCH_OPERATIONS");
  });

  // -------------------------------------------------------------
  // TEST 11: Support staff can resolve ticket with resolution record
  // -------------------------------------------------------------
  await t.test("Test 11: Support staff can resolve ticket with resolution record", async () => {
    assert(testTicketId, "Test ticket ID must exist");
    const req = new NextRequest(`http://localhost:3000/api/support/tickets/${testTicketId}`, {
      method: "PATCH",
      headers: { ...supportHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "RESOLVE",
        resolutionNotes: "Referee approved jersey #10. Live electronic match sheet updated for Court 01.",
      }),
    });
    const res = await patchTicketById(req, {
      params: Promise.resolve({ id: testTicketId }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.ticket.status, "RESOLVED");
    assert(data.ticket.resolvedAt !== null, "resolvedAt must be populated");
  });

  // -------------------------------------------------------------
  // TEST 12: Support staff can reopen a resolved ticket
  // -------------------------------------------------------------
  await t.test("Test 12: Support staff can reopen a resolved ticket", async () => {
    assert(testTicketId, "Test ticket ID must exist");
    const req = new NextRequest(`http://localhost:3000/api/support/tickets/${testTicketId}`, {
      method: "PATCH",
      headers: { ...supportHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "REOPEN" }),
    });
    const res = await patchTicketById(req, {
      params: Promise.resolve({ id: testTicketId }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.ticket.status, "OPEN");
    assert.equal(data.ticket.resolvedAt, null);
  });

  // -------------------------------------------------------------
  // TEST 13: Direct URL access to non-existent ticket returns 404
  // -------------------------------------------------------------
  await t.test("Test 13: Direct URL access to non-existent ticket returns 404", async () => {
    const req = new NextRequest("http://localhost:3000/api/support/tickets/non-existent-case-9999", {
      headers: supportHeaders,
    });
    const res = await getTicketById(req, {
      params: Promise.resolve({ id: "non-existent-case-9999" }),
    });
    assert.equal(res.status, 404);
  });

  // -------------------------------------------------------------
  // TEST 14: Support staff cannot access Finance APIs (Strict 403 Forbidden)
  // -------------------------------------------------------------
  await t.test("Test 14: Support staff cannot access Finance APIs (Strict 403 Forbidden)", async () => {
    const finReq = new NextRequest("http://localhost:3000/api/finance/payments", {
      headers: supportHeaders,
    });
    const finRes = await getFinancePayments(finReq);
    assert.equal(finRes.status, 403);
  });

  // -------------------------------------------------------------
  // TEST 15: Zero transport payment policy strictly enforced on support tickets
  // -------------------------------------------------------------
  await t.test("Test 15: Zero transport payment policy strictly enforced on support tickets", async () => {
    // Attempting to create transport ticket with payment terms is rejected
    const req = new NextRequest("http://localhost:3000/api/support/tickets", {
      method: "POST",
      headers: { ...supportHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Bus Ticket Payment Receipt Issue",
        description: "Where do I pay the UPI fee for the university shuttle bus fare?",
        category: "TRANSPORT",
        priority: "LOW",
      }),
    });
    const res = await createTicket(req);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /transport is complimentary/i);
  });
});
