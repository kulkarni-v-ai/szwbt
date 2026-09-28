import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/rbac/token";
import { ROLES } from "../src/lib/rbac/roles";
import { PERMISSIONS } from "../src/lib/rbac/permissions";
import { GET as getReportsOverview } from "../src/app/api/reports/overview/route";
import { GET as getReportsDataset } from "../src/app/api/reports/dataset/route";
import { POST as exportReport } from "../src/app/api/reports/export/route";
import {
  GET as getSavedReports,
  POST as createSavedReport,
  DELETE as deleteSavedReport,
} from "../src/app/api/reports/saved/route";

test("REPORTS & ANALYTICS CENTER TESTS (/admin/reports)", async (t) => {
  // 1. Setup Auth Tokens
  const reportsUser = await prisma.user.findUnique({
    where: { email: "reports@szwbt2026.edu" },
  });
  assert(reportsUser, "Reports Lead user must exist in database");

  const reportsToken = createSessionToken({
    userId: reportsUser.id,
    email: reportsUser.email,
    roles: [ROLES.REPORTS_STAFF],
    permissions: [
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.PARTICIPANT_READ,
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.ACCOMMODATION_READ,
      PERMISSIONS.TRANSPORT_READ,
      PERMISSIONS.MATCH_READ,
      PERMISSIONS.RESULT_READ,
      PERMISSIONS.REGISTRATION_READ,
      PERMISSIONS.FINANCE_REPORT,
    ],
  });

  const superAdminUser = await prisma.user.findFirst({
    where: { email: "admin@szwbt2026.edu" },
  });
  assert(superAdminUser, "Super Admin user must exist");

  const superAdminToken = createSessionToken({
    userId: superAdminUser.id,
    email: superAdminUser.email,
    roles: [ROLES.SUPER_ADMIN],
    permissions: Object.values(PERMISSIONS),
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

  // Restricted organizer (has REPORTS_READ but NO FINANCE_REPORT and NO AUDIT_READ)
  const organizerUser = await prisma.user.findFirst({
    where: { email: "organizer@szwbt2026.edu" },
  });
  assert(organizerUser, "Organizer user must exist");

  const organizerToken = createSessionToken({
    userId: organizerUser.id,
    email: organizerUser.email,
    roles: [ROLES.ORGANIZER],
    permissions: [
      PERMISSIONS.REPORTS_READ,
      PERMISSIONS.MATCH_READ,
      PERMISSIONS.RESULT_READ,
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.PARTICIPANT_READ,
    ],
  });

  // Test 1: Authorized Reports Staff can access overview telemetry
  await t.test("Test 1: Authorized Reports Staff can access overview telemetry", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/overview", {
      headers: { cookie: `szwbt_session=${reportsToken}` },
    });
    const res = await getReportsOverview(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(body.kpis, "Must return real KPI metrics");
    assert(typeof body.kpis.registeredParticipants === "number");
    assert(typeof body.kpis.registeredTeams === "number");
    assert(typeof body.kpis.accommodation.totalBeds === "number");
    assert.equal(body.kpis.transport.hasPayment, false); // Zero transport payment confirmation
  });

  // Test 2: Unauthorized Volunteer receives HTTP 403 Forbidden
  await t.test("Test 2: Unauthorized Volunteer receives HTTP 403 Forbidden", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/overview", {
      headers: { cookie: `szwbt_session=${volunteerToken}` },
    });
    const res = await getReportsOverview(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert(body.error.includes("403 Forbidden"));
  });

  // Test 3: Unauthenticated request receives HTTP 401 Unauthorized
  await t.test("Test 3: Unauthenticated request receives HTTP 401 Unauthorized", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/overview");
    const res = await getReportsOverview(req);
    assert.equal(res.status, 401);
  });

  // Test 4: Authorized user can query Registration dataset
  await t.test("Test 4: Authorized user can query Registration dataset", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/dataset?category=REGISTRATION", {
      headers: { cookie: `szwbt_session=${reportsToken}` },
    });
    const res = await getReportsDataset(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.category, "REGISTRATION");
    assert(Array.isArray(body.records));
  });

  // Test 5: Participant reports do NOT expose raw document files/binaries or private URLs
  await t.test("Test 5: Participant reports do NOT expose raw document files/binaries or private URLs", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/dataset?category=PARTICIPANTS", {
      headers: { cookie: `szwbt_session=${reportsToken}` },
    });
    const res = await getReportsDataset(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    for (const record of body.records) {
      assert.equal(record.filePath, undefined, "Raw document file path must NEVER be exposed");
      assert.equal(record.compiledPdfPath, undefined, "Compiled PDF path must NEVER be exposed");
      assert.equal(record.passwordHash, undefined, "Secrets must NEVER be exposed");
      assert(record.documentReadiness !== undefined, "Document readiness metadata should be present");
    }
  });

  // Test 6: Transport reports contain NO payment functionality (Zero transport payment policy verified)
  await t.test("Test 6: Transport reports contain NO payment functionality (Zero transport payment)", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/dataset?category=TRANSPORT", {
      headers: { cookie: `szwbt_session=${reportsToken}` },
    });
    const res = await getReportsDataset(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    for (const record of body.records) {
      assert.equal(record.fareAmount, undefined, "Transport must have no fare amounts");
      assert.equal(record.utr, undefined, "Transport must have no UTR references");
      assert.equal(record.paymentMethod, undefined, "Transport must have no payment methods");
      assert.equal(record.fareType, "FREE_COMPLIMENTARY");
    }
  });

  // Test 7: User without finance permission cannot access Finance reports (Strict 403 Forbidden)
  await t.test("Test 7: User without finance permission cannot access Finance reports (Strict 403)", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/dataset?category=FINANCE", {
      headers: { cookie: `szwbt_session=${organizerToken}` },
    });
    const res = await getReportsDataset(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert(body.error.includes("Finance clearance"));
  });

  // Test 8: User with finance clearance can query Finance reports
  await t.test("Test 8: User with finance clearance can query Finance reports", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/dataset?category=FINANCE", {
      headers: { cookie: `szwbt_session=${reportsToken}` },
    });
    const res = await getReportsDataset(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.category, "FINANCE");
    assert(Array.isArray(body.records));
  });

  // Test 9: User without AUDIT_READ cannot access Audit reports (Strict 403 Forbidden)
  await t.test("Test 9: User without AUDIT_READ cannot access Audit reports (Strict 403)", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/dataset?category=AUDIT", {
      headers: { cookie: `szwbt_session=${reportsToken}` }, // Reports staff does NOT have AUDIT_READ
    });
    const res = await getReportsDataset(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert(body.error.includes("Audit reports require AUDIT_READ clearance"));
  });

  // Test 10: Super Admin with AUDIT_READ can access Audit reports
  await t.test("Test 10: Super Admin with AUDIT_READ can access Audit reports", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/dataset?category=AUDIT", {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const res = await getReportsDataset(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.category, "AUDIT");
    assert(Array.isArray(body.records));
  });

  // Test 11: Authorized user can export report to CSV
  await t.test("Test 11: Authorized user can export report to CSV", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `szwbt_session=${reportsToken}`,
      },
      body: JSON.stringify({
        reportType: "REGISTRATION",
        format: "CSV",
        filters: {},
      }),
    });
    const res = await exportReport(req);
    assert.equal(res.status, 200);
    assert(res.headers.get("Content-Type")?.includes("text/csv"));
    assert(res.headers.get("Content-Disposition")?.includes("attachment"));
    const text = await res.text();
    assert(text.includes("Team_Code") || text.includes("NO_DATA_AVAILABLE"));
  });

  // Test 12: Export generates tamper-evident audit log
  await t.test("Test 12: Export generates tamper-evident audit log", async () => {
    const recentAudit = await prisma.auditLog.findFirst({
      where: { action: "REPORT_EXPORTED", actorEmail: reportsUser.email },
      orderBy: { timestamp: "desc" },
    });
    assert(recentAudit, "An audit log entry for REPORT_EXPORTED must be recorded");
    assert.equal(recentAudit.resourceType, "report");
    assert.equal(recentAudit.resourceId, "REGISTRATION");
  });

  // Test 13: Export cannot contain unauthorized fields (Finance export blocked for user without finance clearance)
  await t.test("Test 13: Finance export blocked for user without finance clearance (Strict 403)", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `szwbt_session=${organizerToken}`,
      },
      body: JSON.stringify({
        reportType: "FINANCE",
        format: "CSV",
      }),
    });
    const res = await exportReport(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  // Test 14: Private exports cannot be accessed anonymously (HTTP 401)
  await t.test("Test 14: Private exports cannot be accessed anonymously (HTTP 401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportType: "REGISTRATION", format: "CSV" }),
    });
    const res = await exportReport(req);
    assert.equal(res.status, 401);
  });

  // Test 15: Saved reports configuration CRUD works and validates clearance
  await t.test("Test 15: Saved reports configuration CRUD works and validates clearance", async () => {
    // 1. Create Saved Report
    const createReq = new NextRequest("http://localhost:3000/api/reports/saved", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `szwbt_session=${reportsToken}`,
      },
      body: JSON.stringify({
        name: "Test Automated Accommodation Report",
        reportType: "ACCOMMODATION",
        filters: { status: "AVAILABLE" },
      }),
    });
    const createRes = await createSavedReport(createReq);
    assert.equal(createRes.status, 200);
    const createBody = await createRes.json();
    assert.equal(createBody.success, true);
    const savedId = createBody.savedReport.id;
    assert(savedId);

    // 2. Query Saved Reports
    const listReq = new NextRequest("http://localhost:3000/api/reports/saved", {
      headers: { cookie: `szwbt_session=${reportsToken}` },
    });
    const listRes = await getSavedReports(listReq);
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.success, true);
    assert(listBody.savedReports.some((r: any) => r.id === savedId));

    // 3. Delete Saved Report
    const delReq = new NextRequest(`http://localhost:3000/api/reports/saved?id=${savedId}`, {
      method: "DELETE",
      headers: { cookie: `szwbt_session=${reportsToken}` },
    });
    const delRes = await deleteSavedReport(delReq);
    assert.equal(delRes.status, 200);
  });

  // Test 16: Direct API manipulation with invalid category fails safely
  await t.test("Test 16: Direct API manipulation with invalid category fails safely", async () => {
    const req = new NextRequest("http://localhost:3000/api/reports/dataset?category=INVALID_CATEGORY", {
      headers: { cookie: `szwbt_session=${reportsToken}` },
    });
    const res = await getReportsDataset(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert(body.error.includes("Invalid report category"));
  });
});
