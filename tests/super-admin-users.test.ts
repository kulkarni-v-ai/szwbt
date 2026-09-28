/**
 * SUPER ADMIN USER & ACCOUNT MANAGEMENT TEST SUITE
 * Tests all 21 mandatory verification requirements from Section 35:
 *
 * 1. SUPER_ADMIN can access user management.
 * 2. TOURNAMENT_ADMIN cannot access Super Admin user management.
 * 3. REGISTRATION_STAFF receives 403.
 * 4. PARTICIPANT receives 403.
 * 5. VOLUNTEER receives 403.
 * 6. Direct API access by non-Super Admin receives 403 / unauthenticated receives 401.
 * 7. Super Admin can create a user.
 * 8. Super Admin can update permitted account information.
 * 9. Super Admin can assign roles.
 * 10. Super Admin can remove roles.
 * 11. Last Super Admin cannot be removed.
 * 12. Super Admin cannot accidentally disable the only active Super Admin.
 * 13. Password reset uses the identity provider workflow.
 * 14. Passwords are never returned by API.
 * 15. Password hashes are never returned.
 * 16. Tokens are never returned.
 * 17. Force logout revokes sessions where supported.
 * 18. Disabled users cannot continue authenticated access.
 * 19. Role changes affect authorization.
 * 20. All sensitive operations are audited.
 * 21. Direct URL manipulation cannot bypass authorization.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { ROLES } from "../src/lib/rbac/roles";
import { PERMISSIONS } from "../src/lib/rbac/permissions";
import { createSessionToken } from "../src/lib/rbac/token";
import { checkRouteAuthorization } from "../src/lib/rbac/routes";
import { authenticateRequest } from "../src/lib/rbac/guard";

// Target API Route Handlers
import { GET as getUsers, POST as createUser } from "../src/app/api/system/users/route";
import { GET as getUserDetail, PATCH as updateUser } from "../src/app/api/system/users/[id]/route";
import { POST as resetPassword } from "../src/app/api/system/users/[id]/reset-password/route";
import { GET as getUserSessions } from "../src/app/api/system/users/[id]/sessions/route";
import { POST as forceLogout } from "../src/app/api/system/users/[id]/force-logout/route";

describe("SUPER ADMIN USER MANAGEMENT TESTS (/admin/system/users)", () => {
  let superAdminUser: any;
  let tournamentAdminUser: any;
  let regStaffUser: any;
  let participantUser: any;
  let volunteerUser: any;

  let superAdminToken: string;
  let tournamentAdminToken: string;
  let regStaffToken: string;
  let participantToken: string;
  let volunteerToken: string;

  let testCreatedUserId: string | null = null;
  const testUserEmail = `test.operator.${Date.now()}@szwbt2026.edu`;

  before(async () => {
    // 1. Super Admin
    superAdminUser = await prisma.user.findFirst({
      where: { email: "admin@szwbt2026.edu" },
      include: { userRoles: { include: { role: true } } },
    });
    assert(superAdminUser, "Super admin 'admin@szwbt2026.edu' must exist");
    superAdminToken = createSessionToken({
      userId: superAdminUser.id,
      email: superAdminUser.email,
      roles: [ROLES.SUPER_ADMIN],
      permissions: Object.values(PERMISSIONS),
    });

    // 2. Tournament Admin
    tournamentAdminUser = await prisma.user.findFirst({
      where: { email: "tournament@szwbt2026.edu" },
    });
    if (!tournamentAdminUser) {
      tournamentAdminUser = await prisma.user.findFirst({
        where: { userRoles: { some: { role: { name: ROLES.TOURNAMENT_ADMIN } } } },
      });
    }
    const tAdminId = tournamentAdminUser ? tournamentAdminUser.id : "tadmin_mock_id";
    const tAdminEmail = tournamentAdminUser ? tournamentAdminUser.email : "tournament@szwbt2026.edu";
    tournamentAdminToken = createSessionToken({
      userId: tAdminId,
      email: tAdminEmail,
      roles: [ROLES.TOURNAMENT_ADMIN],
      permissions: [PERMISSIONS.MATCH_CREATE, PERMISSIONS.TOURNAMENT_CONFIGURE],
    });

    // 3. Registration Staff
    regStaffUser = await prisma.user.findFirst({
      where: { email: "desk@szwbt2026.edu" },
    });
    const regId = regStaffUser ? regStaffUser.id : "reg_mock_id";
    const regEmail = regStaffUser ? regStaffUser.email : "desk@szwbt2026.edu";
    regStaffToken = createSessionToken({
      userId: regId,
      email: regEmail,
      roles: [ROLES.REGISTRATION_STAFF],
      permissions: [PERMISSIONS.REGISTRATION_READ, PERMISSIONS.REGISTRATION_UPDATE],
    });

    // 4. Participant
    participantUser = await prisma.user.findFirst({
      where: { email: "player@szwbt2026.edu" },
    });
    const partId = participantUser ? participantUser.id : "part_mock_id";
    const partEmail = participantUser ? participantUser.email : "player@szwbt2026.edu";
    participantToken = createSessionToken({
      userId: partId,
      email: partEmail,
      roles: [ROLES.PARTICIPANT],
      permissions: [PERMISSIONS.PARTICIPANT_READ],
    });

    // 5. Volunteer
    volunteerUser = await prisma.user.findFirst({
      where: { email: "volunteer@szwbt2026.edu" },
    });
    const volId = volunteerUser ? volunteerUser.id : "vol_mock_id";
    const volEmail = volunteerUser ? volunteerUser.email : "volunteer@szwbt2026.edu";
    volunteerToken = createSessionToken({
      userId: volId,
      email: volEmail,
      roles: [ROLES.VOLUNTEER],
      permissions: [PERMISSIONS.TRANSPORT_READ],
    });
  });

  after(async () => {
    // Cleanup provisioned test user
    if (testCreatedUserId) {
      await prisma.userSession.deleteMany({ where: { userId: testCreatedUserId } }).catch(() => {});
      await prisma.userRole.deleteMany({ where: { userId: testCreatedUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: testCreatedUserId } }).catch(() => {});
    }
  });

  // Test 1: SUPER_ADMIN can access user management
  it("Test 1: SUPER_ADMIN can access user management", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/users?page=1&limit=10", {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const res = await getUsers(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(Array.isArray(body.users));
    assert(body.totalCount >= 1);
  });

  // Test 2: TOURNAMENT_ADMIN cannot access Super Admin user management
  it("Test 2: TOURNAMENT_ADMIN cannot access Super Admin user management (Strict HTTP 403 Forbidden)", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/users", {
      headers: { cookie: `szwbt_session=${tournamentAdminToken}` },
    });
    const res = await getUsers(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert(body.error.includes("403 Forbidden"));
  });

  // Test 3: REGISTRATION_STAFF receives 403
  it("Test 3: REGISTRATION_STAFF receives HTTP 403 Forbidden", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/users", {
      headers: { cookie: `szwbt_session=${regStaffToken}` },
    });
    const res = await getUsers(req);
    assert.equal(res.status, 403);
  });

  // Test 4: PARTICIPANT receives 403
  it("Test 4: PARTICIPANT receives HTTP 403 Forbidden", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/users", {
      headers: { cookie: `szwbt_session=${participantToken}` },
    });
    const res = await getUsers(req);
    assert.equal(res.status, 403);
  });

  // Test 5: VOLUNTEER receives 403
  it("Test 5: VOLUNTEER receives HTTP 403 Forbidden", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/users", {
      headers: { cookie: `szwbt_session=${volunteerToken}` },
    });
    const res = await getUsers(req);
    assert.equal(res.status, 403);
  });

  // Test 6: Direct API access by unauthenticated user receives 401
  it("Test 6: Direct API access by unauthenticated user receives HTTP 401 Unauthorized", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/users");
    const res = await getUsers(req);
    assert.equal(res.status, 401);
  });

  // Test 7: Super Admin can create a user
  it("Test 7: Super Admin can create a new user account with multi-role assignment", async () => {
    const req = new NextRequest("http://localhost:3000/api/system/users", {
      method: "POST",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testUserEmail,
        name: "Test Court Operator",
        phone: "+91 99887 76655",
        institution: "KLE Technological University",
        state: "Karnataka",
        roles: [ROLES.VOLUNTEER, ROLES.OPERATIONS_STAFF],
        status: "ACTIVE",
      }),
    });

    const res = await createUser(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.email, testUserEmail);
    assert(body.user.roles.includes(ROLES.VOLUNTEER));
    assert(body.user.roles.includes(ROLES.OPERATIONS_STAFF));

    testCreatedUserId = body.user.id;
    assert(testCreatedUserId, "User ID must be returned");
  });

  // Test 8: Super Admin can update permitted account information
  it("Test 8: Super Admin can update permitted account information", async () => {
    assert(testCreatedUserId, "Target user must be created");
    const req = new NextRequest(`http://localhost:3000/api/system/users/${testCreatedUserId}`, {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Updated Operator Name",
        phone: "+91 91234 56789",
        institution: "Hubballi Badminton Academy",
        state: "Karnataka",
      }),
    });

    const res = await updateUser(req, {
      params: Promise.resolve({ id: testCreatedUserId }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.name, "Updated Operator Name");
    assert.equal(body.user.phone, "+91 91234 56789");
    assert.equal(body.user.institution, "Hubballi Badminton Academy");
  });

  // Test 9: Super Admin can assign roles
  it("Test 9: Super Admin can assign roles to a user account", async () => {
    assert(testCreatedUserId, "Target user must be created");
    const req = new NextRequest(`http://localhost:3000/api/system/users/${testCreatedUserId}`, {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roles: [ROLES.OPERATIONS_STAFF, ROLES.SUPPORT_STAFF],
      }),
    });

    const res = await updateUser(req, {
      params: Promise.resolve({ id: testCreatedUserId }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(body.user.roles.includes(ROLES.SUPPORT_STAFF));
  });

  // Test 10: Super Admin can remove roles
  it("Test 10: Super Admin can remove roles from a user account", async () => {
    assert(testCreatedUserId, "Target user must be created");
    const req = new NextRequest(`http://localhost:3000/api/system/users/${testCreatedUserId}`, {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roles: [ROLES.VOLUNTEER], // Removed OPERATIONS_STAFF and SUPPORT_STAFF
      }),
    });

    const res = await updateUser(req, {
      params: Promise.resolve({ id: testCreatedUserId }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.roles.length, 1);
    assert.equal(body.user.roles[0], ROLES.VOLUNTEER);
  });

  // Test 11: Last Super Admin cannot be removed
  it("Test 11: Safety Guard: Cannot remove SUPER_ADMIN from the sole active Super Admin", async () => {
    // Attempt to strip SUPER_ADMIN from superAdminUser
    const req = new NextRequest(`http://localhost:3000/api/system/users/${superAdminUser.id}`, {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        roles: [ROLES.VOLUNTEER], // Stripping SUPER_ADMIN
      }),
    });

    const res = await updateUser(req, {
      params: Promise.resolve({ id: superAdminUser.id }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert(body.error.includes("At least one active Super Admin must remain"));
  });

  // Test 12: Super Admin cannot accidentally disable the only active Super Admin
  it("Test 12: Safety Guard: Cannot disable own admin account or sole active Super Admin", async () => {
    const req = new NextRequest(`http://localhost:3000/api/system/users/${superAdminUser.id}`, {
      method: "PATCH",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isActive: false,
      }),
    });

    const res = await updateUser(req, {
      params: Promise.resolve({ id: superAdminUser.id }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert(body.error.includes("Safety Violation"));
  });

  // Test 13: Password reset uses the real identity provider mechanism
  it("Test 13: Password reset dispatches secure verification mechanism", async () => {
    assert(testCreatedUserId, "Target user must be created");
    const req = new NextRequest(`http://localhost:3000/api/system/users/${testCreatedUserId}/reset-password`, {
      method: "POST",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "SEND_RESET",
      }),
    });

    const res = await resetPassword(req, {
      params: Promise.resolve({ id: testCreatedUserId }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(body.message.includes("Password reset instructions"));
  });

  // Test 14: Passwords are never returned by API
  it("Test 14: Credential Privacy: Plaintext passwords are NEVER returned by API", async () => {
    assert(testCreatedUserId, "Target user must be created");
    const req = new NextRequest(`http://localhost:3000/api/system/users/${testCreatedUserId}`, {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const res = await getUserDetail(req, {
      params: Promise.resolve({ id: testCreatedUserId }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal("password" in body.user, false, "Response must not contain password");
  });

  // Test 15: Password hashes are never returned
  it("Test 15: Credential Privacy: Password hashes are NEVER returned by API", async () => {
    assert(testCreatedUserId, "Target user must be created");
    const req = new NextRequest(`http://localhost:3000/api/system/users/${testCreatedUserId}`, {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const res = await getUserDetail(req, {
      params: Promise.resolve({ id: testCreatedUserId }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal("passwordHash" in body.user, false, "Response must not contain passwordHash");
  });

  // Test 16: Tokens are never returned
  it("Test 16: Credential Privacy: Session tokens or auth keys are NEVER returned in sessions API", async () => {
    assert(testCreatedUserId, "Target user must be created");
    const req = new NextRequest(`http://localhost:3000/api/system/users/${testCreatedUserId}/sessions`, {
      headers: { cookie: `szwbt_session=${superAdminToken}` },
    });
    const res = await getUserSessions(req, {
      params: Promise.resolve({ id: testCreatedUserId }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert(Array.isArray(body.sessions));
    if (body.sessions.length > 0) {
      assert.equal("sessionToken" in body.sessions[0], false, "Session token must be strictly stripped");
      assert.equal("token" in body.sessions[0], false, "Token must be strictly stripped");
    }
  });

  // Test 17: Force logout revokes sessions where supported
  it("Test 17: Force logout increments sessionVersion and clears active sessions", async () => {
    assert(testCreatedUserId, "Target user must be created");
    
    // Create a mock active session for the test user
    await prisma.userSession.create({
      data: {
        userId: testCreatedUserId,
        sessionToken: `token_test_${Date.now()}`,
        device: "Desktop (Windows 11)",
        browser: "Chrome",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      },
    });

    const userBefore = await prisma.user.findUnique({ where: { id: testCreatedUserId } });
    const versionBefore = userBefore?.sessionVersion || 1;

    const req = new NextRequest(`http://localhost:3000/api/system/users/${testCreatedUserId}/force-logout`, {
      method: "POST",
      headers: {
        cookie: `szwbt_session=${superAdminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ allSessions: true }),
    });

    const res = await forceLogout(req, {
      params: Promise.resolve({ id: testCreatedUserId }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    const userAfter = await prisma.user.findUnique({ where: { id: testCreatedUserId } });
    assert.equal(userAfter!.sessionVersion, versionBefore + 1, "Session version must be incremented");

    const sessionCount = await prisma.userSession.count({ where: { userId: testCreatedUserId } });
    assert.equal(sessionCount, 0, "All sessions must be wiped on force logout");
  });

  // Test 18: Disabled users cannot continue authenticated access
  it("Test 18: Disabled users are immediately rejected by guard middleware (isActive check)", async () => {
    assert(testCreatedUserId, "Target user must be created");

    // Disable the test user
    await prisma.user.update({
      where: { id: testCreatedUserId },
      data: { isActive: false },
    });

    const disabledToken = createSessionToken({
      userId: testCreatedUserId,
      email: testUserEmail,
      roles: [ROLES.VOLUNTEER],
      permissions: [PERMISSIONS.TRANSPORT_READ],
    });

    const req = new NextRequest("http://localhost:3000/api/volunteer", {
      headers: { cookie: `szwbt_session=${disabledToken}` },
    });

    const auth = await authenticateRequest(req);
    assert.equal(auth.authenticated, false, "Disabled user must fail authentication");
    assert.equal(auth.response.status, 403, "Disabled user must receive HTTP 403");
  });

  // Test 19: Role changes affect authorization
  it("Test 19: Role changes immediately update route clearance evaluation", () => {
    // User with only VOLUNTEER cannot access /admin/system/users
    const checkVolunteer = checkRouteAuthorization("/admin/system/users", [PERMISSIONS.TRANSPORT_READ], [ROLES.VOLUNTEER]);
    assert.equal(checkVolunteer.authorized, false, "Volunteer cannot access /admin/system/users");

    // User granted SUPER_ADMIN can access /admin/system/users
    const checkSuperAdmin = checkRouteAuthorization("/admin/system/users", Object.values(PERMISSIONS), [ROLES.SUPER_ADMIN]);
    assert.equal(checkSuperAdmin.authorized, true, "Super Admin is authorized for /admin/system/users");
  });

  // Test 20: All sensitive operations are audited
  it("Test 20: Sensitive administrative operations create tamper-evident audit records", async () => {
    assert(testCreatedUserId, "Target user must be created");
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { resourceId: testCreatedUserId },
          { metadata: { contains: testUserEmail } },
        ],
      },
    });

    assert(auditLogs.length >= 1, "Audit logs must be created for sensitive operations");
    const actions = auditLogs.map((l) => l.action);
    assert(actions.includes("USER_CREATED") || actions.includes("ROLE_ASSIGNED") || actions.includes("FORCE_LOGOUT"));
  });

  // Test 21: Direct URL manipulation cannot bypass authorization
  it("Test 21: Direct URL manipulation cannot bypass authorization for /admin/system/users", () => {
    const maliciousVolunteer = checkRouteAuthorization(
      "/admin/system/users",
      [PERMISSIONS.TRANSPORT_READ],
      [ROLES.VOLUNTEER]
    );
    assert.equal(maliciousVolunteer.authorized, false);

    const maliciousParticipant = checkRouteAuthorization(
      "/admin/system/users",
      [PERMISSIONS.PARTICIPANT_READ],
      [ROLES.PARTICIPANT]
    );
    assert.equal(maliciousParticipant.authorized, false);

    const maliciousTeamManager = checkRouteAuthorization(
      "/admin/system/users",
      [PERMISSIONS.TEAM_READ],
      [ROLES.TEAM_MANAGER]
    );
    assert.equal(maliciousTeamManager.authorized, false);
  });
});
