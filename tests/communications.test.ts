import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/rbac/token";
import { ROLES } from "../src/lib/rbac/roles";
import { PERMISSIONS } from "../src/lib/rbac/permissions";
import { GET as getOverview } from "../src/app/api/admin/communications/route";
import {
  GET as getAnnouncements,
  POST as createAnnouncement,
} from "../src/app/api/admin/communications/announcements/route";
import {
  GET as getAnnouncementById,
  PATCH as patchAnnouncementById,
  DELETE as deleteAnnouncementById,
} from "../src/app/api/admin/communications/announcements/[id]/route";
import { GET as getDeliveries } from "../src/app/api/admin/communications/deliveries/route";
import { POST as retryDelivery } from "../src/app/api/admin/communications/deliveries/retry/route";
import { POST as postPreview } from "../src/app/api/admin/communications/preview/route";
import {
  GET as getTemplates,
  POST as postTemplate,
} from "../src/app/api/admin/communications/templates/route";
import {
  GET as getTemplateById,
  PATCH as patchTemplateById,
  DELETE as deleteTemplateById,
} from "../src/app/api/admin/communications/templates/[id]/route";
import { GET as getHistory } from "../src/app/api/admin/communications/history/route";
import { POST as postEmergency } from "../src/app/api/admin/communications/emergency/route";
import { GET as getFinancePayments } from "../src/app/api/finance/payments/route";
import {
  getRouteSecurityRequirement,
  checkRouteAuthorization,
  PROTECTED_ROUTES,
} from "../src/lib/rbac/routes";

test("PARTICIPANT & TEAM COMMUNICATIONS CENTER TESTS (/admin/communications)", async (t) => {
  // 1. Setup Auth Tokens
  const commUser = await prisma.user.findUnique({
    where: { email: "comm@szwbt2026.edu" },
  });
  assert(commUser, "Communications Staff user comm@szwbt2026.edu must exist in database");

  const commToken = createSessionToken({
    userId: commUser.id,
    email: commUser.email,
    roles: [ROLES.COMMUNICATIONS_STAFF],
    permissions: [
      PERMISSIONS.ANNOUNCEMENT_READ,
      PERMISSIONS.ANNOUNCEMENT_CREATE,
      PERMISSIONS.ANNOUNCEMENT_UPDATE,
      PERMISSIONS.ANNOUNCEMENT_PUBLISH,
      PERMISSIONS.REPORTS_READ,
    ],
  });

  const participantUser = await prisma.user.findFirst({
    where: { email: "player@szwbt2026.edu" },
  });
  assert(participantUser, "Participant user player@szwbt2026.edu must exist");

  const participantToken = createSessionToken({
    userId: participantUser.id,
    email: participantUser.email,
    roles: [ROLES.PARTICIPANT],
    permissions: [PERMISSIONS.PARTICIPANT_READ],
  });

  const volunteerUser = await prisma.user.findFirst({
    where: { email: "volunteer@szwbt2026.edu" },
  });
  assert(volunteerUser, "Volunteer user volunteer@szwbt2026.edu must exist");

  const volunteerToken = createSessionToken({
    userId: volunteerUser.id,
    email: volunteerUser.email,
    roles: [ROLES.VOLUNTEER],
    permissions: [PERMISSIONS.TRANSPORT_READ],
  });

  const commHeaders = {
    Cookie: `szwbt_session=${commToken}`,
    Authorization: `Bearer ${commToken}`,
  };

  const participantHeaders = {
    Cookie: `szwbt_session=${participantToken}`,
    Authorization: `Bearer ${participantToken}`,
  };

  const volunteerHeaders = {
    Cookie: `szwbt_session=${volunteerToken}`,
    Authorization: `Bearer ${volunteerToken}`,
  };

  let testAnnouncementId: string = "";
  let scheduledAnnouncementId: string = "";
  let publishedAnnouncementId: string = "";
  let testTemplateId: string = "";

  // -------------------------------------------------------------
  // TEST 1: Authorized Communications Staff can access overview telemetry & KPIs
  // -------------------------------------------------------------
  await t.test("Test 1: Authorized Communications Staff can access overview telemetry & real KPIs", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/communications", {
      headers: commHeaders,
    });
    const res = await getOverview(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(typeof data.summary.publishedCount, "number");
    assert.equal(typeof data.summary.draftCount, "number");
    assert.equal(typeof data.summary.scheduledCount, "number");
    assert.equal(typeof data.summary.publishedTodayCount, "number");
    assert.equal(typeof data.summary.activeDeliveriesCount, "number");
    assert.equal(typeof data.summary.failedDeliveriesCount, "number");
    assert.equal(typeof data.summary.emergencyMessagesCount, "number");
    assert.equal(data.permissions.canCreate, true);
    assert.equal(data.permissions.canPublish, true);
  });

  // -------------------------------------------------------------
  // TEST 2: Unauthorized Participant is strictly rejected with HTTP 403 Forbidden
  // -------------------------------------------------------------
  await t.test("Test 2: Unauthorized Participant is strictly rejected with HTTP 403 Forbidden", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/communications", {
      headers: participantHeaders,
    });
    const res = await getOverview(req);
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /403 Forbidden/i);
  });

  // -------------------------------------------------------------
  // TEST 3: Unauthenticated request is strictly rejected with HTTP 401 Unauthorized
  // -------------------------------------------------------------
  await t.test("Test 3: Unauthenticated request is strictly rejected with HTTP 401 Unauthorized", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/communications");
    const res = await getOverview(req);
    assert.equal(res.status, 401);
  });

  // -------------------------------------------------------------
  // TEST 4: Communications Staff can preview audience & channel formatting
  // -------------------------------------------------------------
  await t.test("Test 4: Communications Staff can preview audience & channel formatting", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/communications/preview", {
      method: "POST",
      headers: { ...commHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Court 1 Schedule Shift",
        content: "First match shifted to 09:30 IST due to technical court inspection.",
        targetAudience: "PARTICIPANTS",
        channels: "IN_APP,EMAIL",
      }),
    });
    const res = await postPreview(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(typeof data.estimatedRecipients, "number");
    assert.equal(data.channels.IN_APP.status, "CONFIGURED");
    assert.equal(data.channels.SMS.status, "NOT CONFIGURED");
    assert.equal(data.channels.PUSH.status, "NOT CONFIGURED");
  });

  // -------------------------------------------------------------
  // TEST 5: Zero Transport Payment Rule: Payment requests in preview/create are rejected (400)
  // -------------------------------------------------------------
  await t.test("Test 5: Zero Transport Payment Rule: Payment requests in communications are strictly rejected (400)", async () => {
    // Attempt 1: In preview
    const previewReq = new NextRequest("http://localhost:3000/api/admin/communications/preview", {
      method: "POST",
      headers: { ...commHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Pay Transport Fee for Shuttle Service",
        content: "Please pay transport UPI of INR 100 to board the morning shuttle.",
        targetAudience: "ALL",
      }),
    });
    const prevRes = await postPreview(previewReq);
    assert.equal(prevRes.status, 400);
    const prevData = await prevRes.json();
    assert.match(prevData.error, /complimentary/i);

    // Attempt 2: In announcement creation
    const annReq = new NextRequest("http://localhost:3000/api/admin/communications/announcements", {
      method: "POST",
      headers: { ...commHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Shuttle Bus Pass Payment",
        content: "Submit transport UTR reference for shuttle bus seat reservation.",
        category: "TRANSPORT",
        priority: "NORMAL",
        targetAudience: "ALL",
        channels: "IN_APP",
      }),
    });
    const annRes = await createAnnouncement(annReq);
    assert.equal(annRes.status, 400);
    const annData = await annRes.json();
    assert.match(annData.error, /complimentary/i);
  });

  // -------------------------------------------------------------
  // TEST 6: Communications Staff can create an announcement draft
  // -------------------------------------------------------------
  await t.test("Test 6: Communications Staff can create an announcement draft", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/communications/announcements", {
      method: "POST",
      headers: { ...commHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Draft: Media Center Wi-Fi Accreditation Credentials",
        content: "Instructions for accredited media personnel regarding Wi-Fi access tokens in Press Area 1.",
        category: "GENERAL",
        priority: "NORMAL",
        targetAudience: "ALL",
        channels: "IN_APP",
        status: "DRAFT",
      }),
    });
    const res = await createAnnouncement(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.announcement.status, "DRAFT");
    assert.equal(data.announcement.isPublished, false);
    testAnnouncementId = data.announcement.id;
  });

  // -------------------------------------------------------------
  // TEST 7: Communications Staff can publish an announcement immediately
  // -------------------------------------------------------------
  await t.test("Test 7: Communications Staff can publish an announcement immediately", async () => {
    const req = new NextRequest("http://localhost:3000/api/admin/communications/announcements", {
      method: "POST",
      headers: { ...commHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Court 02 Live Match Delay Notice",
        content: "Match between VTU Belagavi and Osmania University delayed by 15 minutes for court drying.",
        category: "MATCH",
        priority: "HIGH",
        targetAudience: "ALL",
        channels: "IN_APP",
        status: "PUBLISHED",
        relatedResource: "court:Court 02",
      }),
    });
    const res = await createAnnouncement(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.announcement.status, "PUBLISHED");
    assert.equal(data.announcement.isPublished, true);
    publishedAnnouncementId = data.announcement.id;
  });

  // -------------------------------------------------------------
  // TEST 8: Users CANNOT modify published communications (Section 46 Test 5)
  // -------------------------------------------------------------
  await t.test("Test 8: Users CANNOT modify published communications (Section 46 Test 5)", async () => {
    assert(publishedAnnouncementId, "Published announcement ID must exist");
    const req = new NextRequest(
      `http://localhost:3000/api/admin/communications/announcements/${publishedAnnouncementId}`,
      {
        method: "PATCH",
        headers: { ...commHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Tampered title on already published broadcast",
          content: "Tampered body",
        }),
      }
    );
    const res = await patchAnnouncementById(req, {
      params: Promise.resolve({ id: publishedAnnouncementId }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /Published communications cannot be modified/i);
  });

  // -------------------------------------------------------------
  // TEST 9: Communications Staff can schedule future broadcast & cancel it
  // -------------------------------------------------------------
  await t.test("Test 9: Communications Staff can schedule future broadcast & cancel it", async () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const req = new NextRequest("http://localhost:3000/api/admin/communications/announcements", {
      method: "POST",
      headers: { ...commHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Scheduled Release: Day 3 Quarter-Final Lineup",
        content: "Official Day 3 fixture lineup released for all participating South Zone universities.",
        category: "SCHEDULE",
        priority: "NORMAL",
        targetAudience: "TEAM_MANAGERS",
        channels: "IN_APP",
        status: "SCHEDULED",
        scheduledFor: futureDate,
      }),
    });
    const res = await createAnnouncement(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.announcement.status, "SCHEDULED");
    scheduledAnnouncementId = data.announcement.id;

    // Now Cancel
    const cancelReq = new NextRequest(
      `http://localhost:3000/api/admin/communications/announcements/${scheduledAnnouncementId}`,
      {
        method: "PATCH",
        headers: { ...commHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      }
    );
    const cancelRes = await patchAnnouncementById(cancelReq, {
      params: Promise.resolve({ id: scheduledAnnouncementId }),
    });
    const cancelData = await cancelRes.json();

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelData.announcement.status, "CANCELLED");
  });

  // -------------------------------------------------------------
  // TEST 10: Dedicated Emergency Broadcast requires confirmation; rejects without it
  // -------------------------------------------------------------
  await t.test("Test 10: Dedicated Emergency Broadcast endpoint enforces clearance & confirmation", async () => {
    // Without confirmation flag
    const noConfReq = new NextRequest("http://localhost:3000/api/admin/communications/emergency", {
      method: "POST",
      headers: { ...commHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Severe Weather Warning",
        content: "Extreme storm in progress. All outdoor movement suspended.",
        emergencyConfirmed: false,
      }),
    });
    const noConfRes = await postEmergency(noConfReq);
    assert.equal(noConfRes.status, 400);

    // Unauthorized volunteer attempt
    const volReq = new NextRequest("http://localhost:3000/api/admin/communications/emergency", {
      method: "POST",
      headers: { ...volunteerHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Unauthorized broadcast",
        content: "Attempt from volunteer",
        emergencyConfirmed: true,
      }),
    });
    const volRes = await postEmergency(volReq);
    assert.equal(volRes.status, 403);

    // Authorized staff with confirmation
    const authReq = new NextRequest("http://localhost:3000/api/admin/communications/emergency", {
      method: "POST",
      headers: { ...commHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Arena B Technical Safety Inspection Completed",
        content: "All courts certified nominal. Day 2 sessions resume at 10:45 IST.",
        targetAudience: "ALL",
        channels: "IN_APP",
        emergencyConfirmed: true,
      }),
    });
    const authRes = await postEmergency(authReq);
    const authData = await authRes.json();
    assert.equal(authRes.status, 200);
    assert.equal(authData.success, true);
    assert.equal(authData.announcement.priority, "EMERGENCY");
  });

  // -------------------------------------------------------------
  // TEST 11: Historical Communications Log can be queried with server-side filters
  // -------------------------------------------------------------
  await t.test("Test 11: Historical Communications Log queries with server-side filters", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/admin/communications/history?channel=IN_APP&page=1&limit=10",
      { headers: commHeaders }
    );
    const res = await getHistory(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert(Array.isArray(data.items), "Items must be an array");
    assert.equal(typeof data.total, "number");
    assert.equal(typeof data.totalPages, "number");
  });

  // -------------------------------------------------------------
  // TEST 12: Communication Template CRUD with Safe Variables & Zero Transport Rule
  // -------------------------------------------------------------
  await t.test("Test 12: Communication Template CRUD with Safe Variables & Zero Transport Rule", async () => {
    // Attempt template with transport payment -> rejected
    const badReq = new NextRequest("http://localhost:3000/api/admin/communications/templates", {
      method: "POST",
      headers: { ...commHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Transport Fee Reminder",
        code: "TPL_TRANS_FEE_FAIL",
        subject: "Pay transport fee",
        bodyTemplate: "Pay transport UPI to get ticket",
      }),
    });
    const badRes = await postTemplate(badReq);
    assert.equal(badRes.status, 400);

    // Create valid template with safe variables
    const validReq = new NextRequest("http://localhost:3000/api/admin/communications/templates", {
      method: "POST",
      headers: { ...commHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Match Call Notice",
        code: `TPL_TEST_${Date.now()}`,
        category: "MATCH",
        priority: "HIGH",
        audience: "ALL",
        channels: "IN_APP",
        subject: "Match Call: Court {{match_id}}",
        bodyTemplate: "Player {{participant_name}} of {{team_name}}, report to {{venue}} at {{time}}.",
      }),
    });
    const validRes = await postTemplate(validReq);
    const validData = await validRes.json();

    assert.equal(validRes.status, 200);
    assert.equal(validData.success, true);
    testTemplateId = validData.template.id;

    // Update Template
    const updateReq = new NextRequest(
      `http://localhost:3000/api/admin/communications/templates/${testTemplateId}`,
      {
        method: "PATCH",
        headers: { ...commHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Urgent Match Call: Court {{match_id}}",
        }),
      }
    );
    const updateRes = await patchTemplateById(updateReq, {
      params: Promise.resolve({ id: testTemplateId }),
    });
    assert.equal(updateRes.status, 200);

    // Delete Template
    const delReq = new NextRequest(
      `http://localhost:3000/api/admin/communications/templates/${testTemplateId}`,
      {
        method: "DELETE",
        headers: commHeaders,
      }
    );
    const delRes = await deleteTemplateById(delReq, {
      params: Promise.resolve({ id: testTemplateId }),
    });
    assert.equal(delRes.status, 200);
  });

  // -------------------------------------------------------------
  // TEST 13: Delivery logs query and controlled retry on failed delivery
  // -------------------------------------------------------------
  await t.test("Test 13: Delivery logs query and controlled retry on failed delivery", async () => {
    const delReq = new NextRequest("http://localhost:3000/api/admin/communications/deliveries", {
      headers: commHeaders,
    });
    const delRes = await getDeliveries(delReq);
    const delData = await delRes.json();

    assert.equal(delRes.status, 200);
    assert.equal(delData.success, true);
    assert(Array.isArray(delData.deliveries), "Deliveries must be an array");

    const failed = delData.deliveries.find((d: any) => d.status === "FAILED");
    if (failed) {
      const retryReq = new NextRequest("http://localhost:3000/api/admin/communications/deliveries/retry", {
        method: "POST",
        headers: { ...commHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId: failed.id }),
      });
      const retryRes = await retryDelivery(retryReq);
      const retryData = await retryRes.json();

      assert.equal(retryRes.status, 200);
      assert.equal(retryData.success, true);
      assert.equal(retryData.delivery.status, "DELIVERED");
    }
  });

  // -------------------------------------------------------------
  // TEST 14: Direct URL Security & Route Authorization Coverage (Section 45 & 46)
  // -------------------------------------------------------------
  await t.test("Test 14: Direct URL Security & Route Authorization Coverage (Section 45 & 46)", async () => {
    const childRoutes = [
      "/admin/communications",
      "/admin/communications/create",
      "/admin/communications/announcements",
      "/admin/communications/templates",
      "/admin/communications/scheduled",
      "/admin/communications/history",
      "/admin/communications/delivery",
      "/admin/communications/emergency",
    ];

    for (const route of childRoutes) {
      // 1. Must be declared in PROTECTED_ROUTES
      assert(
        (PROTECTED_ROUTES as readonly string[]).includes(route),
        `Route '${route}' must be declared in PROTECTED_ROUTES`
      );

      // 2. Must have security requirement
      const req = getRouteSecurityRequirement(route);
      assert(req, `Route '${route}' must have a security requirement`);

      // 3. Communications Staff is authorized
      const commCheck = checkRouteAuthorization(route, [req.requiredPermission], [ROLES.COMMUNICATIONS_STAFF]);
      assert.equal(
        commCheck.authorized,
        true,
        `Communications staff must be authorized for '${route}'`
      );

      // 4. Participant is NOT authorized
      const partCheck = checkRouteAuthorization(route, [PERMISSIONS.PARTICIPANT_READ], [ROLES.PARTICIPANT]);
      assert.equal(
        partCheck.authorized,
        false,
        `Participant must NOT be authorized for '${route}'`
      );

      // 5. Volunteer is NOT authorized
      const volCheck = checkRouteAuthorization(route, [PERMISSIONS.TRANSPORT_READ], [ROLES.VOLUNTEER]);
      assert.equal(
        volCheck.authorized,
        false,
        `Volunteer must NOT be authorized for '${route}'`
      );
    }
  });

  // -------------------------------------------------------------
  // TEST 15: Communications Staff CANNOT access Finance APIs (Strict 403 Forbidden)
  // -------------------------------------------------------------
  await t.test("Test 15: Communications Staff CANNOT access Finance APIs (Strict 403 Forbidden)", async () => {
    const finReq = new NextRequest("http://localhost:3000/api/finance/payments", {
      headers: commHeaders,
    });
    const finRes = await getFinancePayments(finReq);
    assert.equal(finRes.status, 403);
  });
});
