import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/rbac/token";
import { ROLES } from "../src/lib/rbac/roles";
import { PERMISSIONS } from "../src/lib/rbac/permissions";
import { GET as getSystemHealth } from "../src/app/api/system/health/route";
import { POST as triggerEmailTest } from "../src/app/api/system/health/email-test/route";
import { GET as getSystemUsers } from "../src/app/api/system/users/route";
import {
  GET as getSystemUserDetail,
  PATCH as updateSystemUser,
} from "../src/app/api/system/users/[id]/route";
import { GET as getSystemRoles } from "../src/app/api/system/roles/route";
import { GET as getSystemPermissions } from "../src/app/api/system/permissions/route";
import {
  GET as getSystemConfiguration,
  PATCH as updateSystemConfiguration,
} from "../src/app/api/system/configuration/route";
import { GET as getSystemAudit } from "../src/app/api/system/audit/route";

test("SYSTEM HEALTH & ADMINISTRATION CENTER TESTS (/admin/system)", async (t) => {
  // 1. Setup Auth Tokens
  const superAdminUser = await prisma.user.findFirst({
    where: { email: "admin@szwbt2026.edu" },
  });
  assert(superAdminUser, "Super Admin user must exist in database");

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

  const supportUser = await prisma.user.findFirst({
    where: { email: "support@szwbt2026.edu" },
  });
  assert(supportUser, "Support user must exist");

  const supportToken = createSessionToken({
    userId: supportUser.id,
    email: supportUser.email,
    roles: [ROLES.SUPPORT_STAFF],
    permissions: [
      PERMISSIONS.SUPPORT_READ,
      PERMISSIONS.SUPPORT_UPDATE,
      PERMISSIONS.SUPPORT_COMMENT,
    ],
  });

  // Test 1: Super Admin can access System Health telemetry
  await t.test("Test 1: Super Admin can access System Health telemetry", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/health", {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const res = await getSystemHealth(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(body.overallStatus, "Overall status must exist");
    assert(body.services, "Services object must exist");

    // Verify database health check ping
    const dbService = body.services.database;
    assert(dbService, "Database service card must exist");
    assert.equal(dbService.status, "HEALTHY");
    assert(typeof dbService.latencyMs === "number", "Latency in ms must be a number");
    assert(typeof dbService.activeUsers === "number");
    assert(typeof dbService.activeParticipants === "number");
  });

  // Test 2: Unauthorized volunteer is rejected with HTTP 403 Forbidden
  await t.test("Test 2: Unauthorized volunteer is rejected with HTTP 403", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/health", {
      headers: { cookie: `szwbt_session=${volunteerToken}` },
    });
    const res = await getSystemHealth(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert(body.error.includes("403 Forbidden"));
  });

  // Test 3: Unauthenticated request is rejected with HTTP 401 Unauthorized
  await t.test("Test 3: Unauthenticated request is rejected with HTTP 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/health");
    const res = await getSystemHealth(req);
    assert.equal(res.status, 401);
  });

  // Test 4: Support staff cannot access system configuration (HTTP 403)
  await t.test("Test 4: Support staff cannot access system configuration", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/configuration", {
      headers: { cookie: `szwbt_session=${supportToken}` },
    });
    const res = await getSystemConfiguration(req);
    assert.equal(res.status, 403);
  });

  // Test 5: Super Admin can list system users with pagination & search
  await t.test("Test 5: Super Admin can list system users with pagination & search", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/users?limit=10&page=1", {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const res = await getSystemUsers(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(Array.isArray(body.users));
    assert(body.users.length > 0);
    assert(body.totalCount >= 1);
    assert.equal(body.page, 1);
  });

  // Test 6: Super Admin can inspect user detail & recent activity
  await t.test("Test 6: Super Admin can inspect user detail & recent activity", async () => {
    const req = new NextRequest(`http://localhost:3000/api/system/users/${supportUser.id}`, {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const res = await getSystemUserDetail(req, {
      params: Promise.resolve({ id: supportUser.id }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.email, supportUser.email);
    assert(Array.isArray(body.user.roles));
    assert(Array.isArray(body.recentActivity));
  });

  // Test 7: Super Admin CANNOT deactivate own account (Safety Violation 400)
  await t.test("Test 7: Super Admin CANNOT deactivate own account", async () => {
    const req = new NextRequest(`http://localhost:3000/api/system/users/${superAdminUser.id}`, {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ isActive: false }),
    });
    const res = await updateSystemUser(req, {
      params: Promise.resolve({ id: superAdminUser.id }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert(body.error.includes("Safety Violation: You cannot deactivate your own administrative account"));
  });

  // Test 8: Super Admin can toggle another user's active status safely
  await t.test("Test 8: Super Admin can toggle another user's active status safely", async () => {
    const req = new NextRequest(`http://localhost:3000/api/system/users/${volunteerUser.id}`, {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ isActive: true }),
    });
    const res = await updateSystemUser(req, {
      params: Promise.resolve({ id: volunteerUser.id }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.isActive, true);
  });

  // Test 9: Super Admin can fetch system roles and permissions
  await t.test("Test 9: Super Admin can fetch system roles and permissions", async () => {
    const rolesReq = new NextRequest("http://localhost:3000/api/system/roles", {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const rolesRes = await getSystemRoles(rolesReq);
    assert.equal(rolesRes.status, 200);
    const rolesBody = await rolesRes.json();
    assert.equal(rolesBody.success, true);
    assert(Array.isArray(rolesBody.roles));
    assert(rolesBody.roles.some((r: any) => r.name === "SUPER_ADMIN"));

    const permsReq = new NextRequest("http://localhost:3000/api/system/permissions", {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const permsRes = await getSystemPermissions(permsReq);
    assert.equal(permsRes.status, 200);
    const permsBody = await permsRes.json();
    assert.equal(permsBody.success, true);
    assert(permsBody.grouped, "Must group permissions by resource");
    assert(permsBody.totalCount > 20);
  });

  // Test 10: Super Admin can fetch system configuration without leaking secrets
  await t.test("Test 10: Super Admin can fetch system configuration safely", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/configuration", {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const res = await getSystemConfiguration(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(Array.isArray(body.settings));

    // Verify secret protection
    for (const s of body.settings) {
      assert(!s.key.toLowerCase().includes("secret"), "No secrets exposed");
      assert(!s.key.toLowerCase().includes("database_url"), "No DB url exposed");
      assert(!s.key.toLowerCase().includes("password"), "No password exposed");
    }
  });

  // Test 11: Super Admin can update valid configuration setting
  await t.test("Test 11: Super Admin can update valid configuration setting", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/configuration", {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        key: "tournament.venue",
        value: "KLE Technological University Indoor Stadium, Hubballi",
      }),
    });
    const res = await updateSystemConfiguration(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.setting.key, "tournament.venue");
    assert.equal(body.setting.value, "KLE Technological University Indoor Stadium, Hubballi");
  });

  // Test 12: STRICT ZERO TRANSPORT PAYMENT RULE: Transport fee configuration rejected with 400
  await t.test("Test 12: Strict Zero Transport Payment Policy is enforced", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/configuration", {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        key: "transport.fee",
        value: "500",
      }),
    });
    const res = await updateSystemConfiguration(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert(
      body.error.includes("Charter Violation: Championship transport is university-provided and complimentary"),
      "Must explicitly enforce Zero Transport Payment charter rule"
    );
  });

  // Test 13: Super Admin can access immutable audit trail
  await t.test("Test 13: Super Admin can access immutable audit trail", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/audit?limit=10&page=1", {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const res = await getSystemAudit(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(Array.isArray(body.logs));
    assert(typeof body.totalCount === "number");
    assert(typeof body.todayCount === "number");
    assert(typeof body.securityAlertsCount === "number");
  });

  // Test 14: Diagnostic test email dispatch works with audit logging
  await t.test("Test 14: Super Admin diagnostic test email dispatch works", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/health/email-test", {
      method: "POST",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        recipient: "test-admin@szwbt2026.edu",
      }),
    });
    const res = await triggerEmailTest(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.delivered, true);
    assert.equal(body.recipient, "test-admin@szwbt2026.edu");

    // Verify audit log entry was created
    const logEntry = await prisma.auditLog.findFirst({
      where: {
        action: "EMAIL_TEST_SENT",
        resourceId: "test-admin@szwbt2026.edu",
      },
      orderBy: { timestamp: "desc" },
    });
    assert(logEntry, "Audit log for test email dispatch must exist");
  });
});
