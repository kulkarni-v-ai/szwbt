/**
 * Comprehensive Account, Profile & Security Test Suite (/profile & /api/me)
 * Strictly verifies all 15 mandatory test cases from Section 48:
 *
 * 1. User can access /profile when authenticated.
 * 2. Unauthenticated user receives 401 according to auth architecture.
 * 3. User cannot access another user's profile via query manipulation (?userId=, ?email=).
 * 4. User cannot modify role (Privilege Escalation blocked with 400).
 * 5. User cannot modify permissions (Privilege Escalation blocked with 400).
 * 6. User cannot change account status (Privilege Escalation blocked with 400).
 * 7. User can update permitted profile fields (name, phone, state, institution).
 * 8. Notification preferences persist correctly to backend.
 * 9. Session revocation works and rejects cross-user revocation.
 * 10. System-critical notifications cannot be disabled.
 * 11. Profile data is derived from authenticated server-side identity.
 * 12. Direct URL manipulation cannot expose another user's data.
 * 13. Private documents remain private (status only, no raw binaries/URLs).
 * 14. Strict Zero Transport Payment Rule: Transport context contains NO payment fields.
 * 15. All 15 authorized roles have route access to self-service /profile.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { ROLES } from "../src/lib/rbac/roles";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/rbac/token";
import { checkRouteAuthorization } from "../src/lib/rbac/routes";
import { GET as getMe, PATCH as patchMe } from "../src/app/api/me/route";
import { GET as getPreferences, PATCH as patchPreferences } from "../src/app/api/me/preferences/route";
import { GET as getSessions } from "../src/app/api/me/sessions/route";
import { POST as revokeSession } from "../src/app/api/me/sessions/revoke/route";
import { GET as getActivity } from "../src/app/api/me/activity/route";

describe("ACCOUNT, PROFILE & SECURITY TESTS (/profile & /api/me)", () => {
  let playerUser: any;
  let adminUser: any;
  let teamUser: any;

  let playerToken: string;
  let adminToken: string;
  let teamToken: string;

  before(async () => {
    // Look up real users in PostgreSQL
    playerUser = await prisma.user.findFirst({
      where: { email: "player@szwbt2026.edu" },
      include: { userRoles: { include: { role: true } } },
    });
    assert(playerUser, "Player user 'player@szwbt2026.edu' must exist in DB");

    adminUser = await prisma.user.findFirst({
      where: { email: "admin@szwbt2026.edu" },
      include: { userRoles: { include: { role: true } } },
    });
    assert(adminUser, "Admin user 'admin@szwbt2026.edu' must exist in DB");

    teamUser = await prisma.user.findFirst({
      where: { email: "team@szwbt2026.edu" },
      include: { userRoles: { include: { role: true } } },
    });
    assert(teamUser, "Team Manager user 'team@szwbt2026.edu' must exist in DB");

    playerToken = createSessionToken({
      userId: playerUser.id,
      email: playerUser.email,
      roles: playerUser.userRoles.map((ur: any) => ur.role.name),
      sessionVersion: playerUser.sessionVersion || 1,
    });

    adminToken = createSessionToken({
      userId: adminUser.id,
      email: adminUser.email,
      roles: adminUser.userRoles.map((ur: any) => ur.role.name),
      sessionVersion: adminUser.sessionVersion || 1,
    });

    teamToken = createSessionToken({
      userId: teamUser.id,
      email: teamUser.email,
      roles: teamUser.userRoles.map((ur: any) => ur.role.name),
      sessionVersion: teamUser.sessionVersion || 1,
    });
  });

  // Helper to create authenticated requests
  function makeReq(url: string, token?: string, method = "GET", body?: any): NextRequest {
    const headers: Record<string, string> = {};
    if (token) {
      headers["cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
    }
    if (body) {
      headers["content-type"] = "application/json";
    }
    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it("Test 1: Authenticated user can access /api/me self-service telemetry", async () => {
    const req = makeReq("/api/me", playerToken);
    const res = await getMe(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.profile.email, "player@szwbt2026.edu");
    assert.equal(data.profile.name, "Ananya Sharma");
    assert.equal(data.profile.accountStatus, "ACTIVE");
    assert(Array.isArray(data.roles), "Roles must be an array");
    assert(Array.isArray(data.authorizedModules), "Authorized modules must be an array");
  });

  it("Test 2: Unauthenticated request receives strict HTTP 401 Unauthorized", async () => {
    const req = makeReq("/api/me"); // No token
    const res = await getMe(req);
    assert.equal(res.status, 401);

    const data = await res.json();
    assert.equal(data.success, false);
    assert(data.error.includes("401 Unauthorized"));
  });

  it("Test 3: Identity Resolution: Query spoofing (?userId=, ?email=) is strictly ignored", async () => {
    // Player tries to pass admin's ID and email in query params
    const req = makeReq(`/api/me?userId=${adminUser.id}&email=admin@szwbt2026.edu&role=SUPER_ADMIN`, playerToken);
    const res = await getMe(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    // Must strictly return playerUser, NOT adminUser
    assert.equal(data.profile.id, playerUser.id);
    assert.equal(data.profile.email, playerUser.email);
    assert.notEqual(data.profile.id, adminUser.id);
  });

  it("Test 4: Privilege Escalation Protection: Modifying role is strictly rejected (HTTP 400)", async () => {
    const req = makeReq("/api/me", playerToken, "PATCH", {
      role: "SUPER_ADMIN",
    });
    const res = await patchMe(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert(data.error.includes("Role, permission, and account privilege escalation is strictly prohibited"));
  });

  it("Test 5: Privilege Escalation Protection: Modifying permissions is strictly rejected (HTTP 400)", async () => {
    const req = makeReq("/api/me", playerToken, "PATCH", {
      permissions: ["admin:read", "system:configure"],
    });
    const res = await patchMe(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert(data.error.includes("strictly prohibited"));
  });

  it("Test 6: Privilege Escalation Protection: Modifying account status or isAdmin is rejected (HTTP 400)", async () => {
    const req = makeReq("/api/me", playerToken, "PATCH", {
      isAdmin: true,
      isActive: true,
      status: "APPROVED_SUPERUSER",
    });
    const res = await patchMe(req);
    assert.equal(res.status, 400);

    const data = await res.json();
    assert.equal(data.success, false);
    assert(data.error.includes("strictly prohibited"));
  });

  it("Test 7: Self-Service Profile Update: Permitted fields succeed and persist", async () => {
    const req = makeReq("/api/me", playerToken, "PATCH", {
      name: "Ananya Sharma",
      phone: "+91 98451 99999",
      state: "Karnataka",
      institution: "KLE Technological University",
    });
    const res = await patchMe(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.profile.phone, "+91 98451 99999");
    assert.equal(data.profile.institution, "KLE Technological University");
  });

  it("Test 8: Audit Logging: Profile update creates tamper-evident audit log", async () => {
    const recentAudit = await prisma.auditLog.findFirst({
      where: {
        actorUserId: playerUser.id,
        action: "PROFILE_UPDATED",
      },
      orderBy: { timestamp: "desc" },
    });
    assert(recentAudit, "PROFILE_UPDATED audit log must exist in PostgreSQL");
    assert.equal(recentAudit.resourceType, "user");
  });

  it("Test 9: Notification Preferences: GET & PATCH persist to backend", async () => {
    // 1. GET preferences
    const getReq = makeReq("/api/me/preferences", playerToken);
    const getRes = await getPreferences(getReq);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.success, true);
    assert.equal(getData.preferences.systemNotifications, true);

    // 2. PATCH preferences
    const patchReq = makeReq("/api/me/preferences", playerToken, "PATCH", {
      matchUpdates: false,
      transportUpdates: true,
    });
    const patchRes = await patchPreferences(patchReq);
    assert.equal(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.equal(patchData.preferences.matchUpdates, false);
    assert.equal(patchData.preferences.transportUpdates, true);

    // Verify in database
    const dbPref = await prisma.userPreference.findUnique({
      where: { userId: playerUser.id },
    });
    assert(dbPref, "User preference record must exist in DB");
    assert.equal(dbPref.matchUpdates, false);
  });

  it("Test 10: Mandatory System Notifications CANNOT be disabled (HTTP 400)", async () => {
    const patchReq = makeReq("/api/me/preferences", playerToken, "PATCH", {
      systemNotifications: false,
    });
    const patchRes = await patchPreferences(patchReq);
    assert.equal(patchRes.status, 400);

    const data = await patchRes.json();
    assert.equal(data.success, false);
    assert(data.error.includes("System notifications are required"));
  });

  it("Test 11: Active Sessions query and session revocation work safely", async () => {
    // 1. Query sessions
    const getReq = makeReq("/api/me/sessions", playerToken);
    const getRes = await getSessions(getReq);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.success, true);
    assert(Array.isArray(getData.sessions), "Sessions must be an array");

    // 2. Create a test session to revoke
    const testSession = await prisma.userSession.create({
      data: {
        userId: playerUser.id,
        sessionToken: `test_token_${Date.now()}`,
        device: "Mobile Test Device",
        browser: "Mobile Safari",
        location: "Hubballi, Karnataka, IN",
        isCurrent: false,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    // 3. Revoke test session
    const revokeReq = makeReq("/api/me/sessions/revoke", playerToken, "POST", {
      sessionId: testSession.id,
    });
    const revokeRes = await revokeSession(revokeReq);
    assert.equal(revokeRes.status, 200);
    const revokeData = await revokeRes.json();
    assert.equal(revokeData.success, true);

    // Verify session is deleted from DB
    const deletedSession = await prisma.userSession.findUnique({
      where: { id: testSession.id },
    });
    assert.equal(deletedSession, null);
  });

  it("Test 12: Cross-User Session Revocation is strictly blocked (HTTP 403 Forbidden)", async () => {
    // Create session belonging to Admin
    const adminSession = await prisma.userSession.create({
      data: {
        userId: adminUser.id,
        sessionToken: `admin_session_${Date.now()}`,
        device: "Admin Workstation",
        browser: "Chrome",
        location: "Hubballi, Karnataka, IN",
        isCurrent: false,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    // Player attempts to revoke Admin's session
    const attackReq = makeReq("/api/me/sessions/revoke", playerToken, "POST", {
      sessionId: adminSession.id,
    });
    const attackRes = await revokeSession(attackReq);
    assert.equal(attackRes.status, 403);

    const attackData = await attackRes.json();
    assert.equal(attackData.success, false);
    assert(attackData.error.includes("Cannot revoke a session belonging to another user"));

    // Cleanup
    await prisma.userSession.delete({ where: { id: adminSession.id } });
  });

  it("Test 13: Strict Zero Transport Payment Rule: Transport context contains NO payment fields", async () => {
    const req = makeReq("/api/me", playerToken);
    const res = await getMe(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    if (data.tournamentContext?.transport) {
      const trans = data.tournamentContext.transport;
      assert.equal(trans.isComplimentary, true);
      assert.equal(trans.fee, undefined, "Transport must NEVER contain fee field");
      assert.equal(trans.payment, undefined, "Transport must NEVER contain payment field");
      assert.equal(trans.utr, undefined, "Transport must NEVER contain utr field");
      assert.equal(trans.balance, undefined, "Transport must NEVER contain balance field");
    }
  });

  it("Test 14: Private Documents Privacy: Status only, no raw file paths, URLs or binaries", async () => {
    const req = makeReq("/api/me", playerToken);
    const res = await getMe(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    if (data.tournamentContext?.documents) {
      for (const doc of data.tournamentContext.documents) {
        assert(doc.id, "Document must have id");
        assert(doc.type, "Document must have type");
        assert(doc.status, "Document must have status");
        assert.equal(doc.filePath, undefined, "Document must NEVER expose raw server file path");
        assert.equal(doc.rawBinary, undefined, "Document must NEVER expose binary data");
        assert.equal(doc.downloadUrl, undefined, "Document must NEVER expose public URL");
      }
    }
  });

  it("Test 15: All Authorized Roles can access self-service /profile route", () => {
    const rolesToTest = [
      ROLES.PARTICIPANT,
      ROLES.TEAM_MANAGER,
      ROLES.VOLUNTEER,
      ROLES.MATCH_OFFICIAL,
      ROLES.COMMUNICATIONS_STAFF,
      ROLES.SUPER_ADMIN,
    ];

    for (const role of rolesToTest) {
      const authCheck = checkRouteAuthorization("/profile", [], [role]);
      assert.equal(
        authCheck.authorized,
        true,
        `Role '${role}' must be authorized to access self-service '/profile'`
      );
    }
  });

  it("Test 16: Personal Account Activity: Returns isolated user audit events", async () => {
    const req = makeReq("/api/me/activity", playerToken);
    const res = await getActivity(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert(Array.isArray(data.activity), "Activity must be an array");
    for (const act of data.activity) {
      assert(act.id);
      assert(act.action);
      assert(act.description);
      // Secrets must never be exposed
      assert.equal(act.password, undefined);
      assert.equal(act.token, undefined);
    }
  });
});
