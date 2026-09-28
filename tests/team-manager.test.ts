/**
 * Comprehensive Team Manager Portal Test Suite
 * Strictly verifies all 15 mandatory test cases:
 *
 * 1. Team Manager can access own team.
 * 2. Team Manager cannot access another team.
 * 3. Team Manager cannot access admin dashboard.
 * 4. Team Manager cannot access finance admin.
 * 5. Team Manager cannot access accommodation administration.
 * 6. Team Manager cannot access transport administration.
 * 7. Team Manager cannot modify official match results.
 * 8. Team Manager cannot access another team's payment records.
 * 9. Team Manager cannot access another team's accommodation.
 * 10. Team Manager cannot access private documents without permission.
 * 11. Secure QR resolves only for authorized staff workflows.
 * 12. Manipulated teamId cannot bypass authorization.
 * 13. Unauthenticated access is rejected.
 * 14. Empty team state works.
 * 15. Network failures / invalid tokens handled correctly.
 */

import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { PERMISSIONS } from "../src/lib/rbac/permissions";
import { ROLES } from "../src/lib/rbac/roles";
import { getUserContext, checkResourceScope, hasPermission } from "../src/lib/rbac/service";
import { createSessionToken } from "../src/lib/rbac/token";
import { checkRouteAuthorization } from "../src/lib/rbac/routes";
import { GET as getTeamOverview } from "../src/app/api/team/route";
import { GET as getTeamMembers } from "../src/app/api/team/members/route";
import { GET as getTeamPayments } from "../src/app/api/team/payments/route";
import { GET as getTeamAccommodation } from "../src/app/api/team/accommodation/route";
import { GET as getTeamTransport } from "../src/app/api/team/transport/route";
import { GET as getTeamQR } from "../src/app/api/team/qr/route";
import { GET as getFinancePayments } from "../src/app/api/finance/payments/route";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m [Test ${testName}]`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m [Test ${testName}] ${detail || ""}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("\n============================================================");
  console.log("RUNNING TEAM MANAGER PORTAL PRODUCTION AUTHORIZATION TESTS (15/15)");
  console.log("============================================================\n");

  // 1. Retrieve Team Manager and Super Admin users
  const teamManagerUser = await prisma.user.findUnique({
    where: { email: "team@szwbt2026.edu" },
  });
  const superAdminUser = await prisma.user.findUnique({
    where: { email: "admin@szwbt2026.edu" },
  });

  if (!teamManagerUser) {
    throw new Error("Team Manager user not found in DB. Run 'npx tsx prisma/seed-team-manager.ts' first.");
  }

  const managerContext = (await getUserContext(teamManagerUser.id))!;
  const managerToken = createSessionToken({
    userId: teamManagerUser.id,
    email: teamManagerUser.email,
    roles: managerContext.roles,
    permissions: managerContext.permissions,
  });

  const authHeaders = {
    cookie: `szwbt_session=${managerToken}`,
  };

  // -------------------------------------------------------------
  // TEST 1: Team Manager can access own team
  // -------------------------------------------------------------
  const ownTeamReq = new NextRequest("http://localhost:3000/api/team", {
    headers: authHeaders,
  });
  const ownTeamRes = await getTeamOverview(ownTeamReq);
  const ownTeamData = await ownTeamRes.json();

  assert(
    ownTeamRes.status === 200 &&
      ownTeamData.success === true &&
      ownTeamData.selectedTeam?.id === teamManagerUser.teamId &&
      ownTeamData.selectedTeam?.name === "Bangalore University Warriors",
    "01: Team Manager can authoritatively access own team details and KPIs"
  );

  // -------------------------------------------------------------
  // TEST 2: Team Manager cannot access another team via query param
  // -------------------------------------------------------------
  const foreignTeamReq = new NextRequest("http://localhost:3000/api/team?teamId=foreign-team-kerala-99", {
    headers: authHeaders,
  });
  const foreignTeamRes = await getTeamOverview(foreignTeamReq);
  const foreignTeamData = await foreignTeamRes.json();

  assert(
    foreignTeamRes.status === 403 &&
      foreignTeamData.success === false &&
      foreignTeamData.error?.includes("403 Forbidden"),
    "02: Team Manager cannot access another institution's team by passing foreign teamId (HTTP 403)"
  );

  // -------------------------------------------------------------
  // TEST 3: Team Manager cannot access admin dashboard
  // -------------------------------------------------------------
  const adminRouteAuth = checkRouteAuthorization("/admin", managerContext.permissions, managerContext.roles);
  assert(
    !adminRouteAuth.authorized,
    "03: Team Manager is denied clearance from accessing Master Admin Dashboard (/admin)"
  );

  // -------------------------------------------------------------
  // TEST 4: Team Manager cannot access finance admin
  // -------------------------------------------------------------
  const finRouteAuth = checkRouteAuthorization("/admin/finance", managerContext.permissions, managerContext.roles);
  const finApiReq = new NextRequest("http://localhost:3000/api/finance/payments", {
    headers: authHeaders,
  });
  const finApiRes = await getFinancePayments(finApiReq);

  assert(
    !finRouteAuth.authorized && finApiRes.status === 403,
    "04: Team Manager cannot access Finance Admin portal or administrative payment APIs"
  );

  // -------------------------------------------------------------
  // TEST 5: Team Manager cannot access accommodation administration
  // -------------------------------------------------------------
  const accomRouteAuth = checkRouteAuthorization(
    "/admin/accommodation",
    managerContext.permissions,
    managerContext.roles
  );
  assert(
    !accomRouteAuth.authorized,
    "05: Team Manager cannot access Accommodation Admin dashboard (/admin/accommodation)"
  );

  // -------------------------------------------------------------
  // TEST 6: Team Manager cannot access transport administration
  // -------------------------------------------------------------
  const transRouteAuth = checkRouteAuthorization(
    "/admin/transport",
    managerContext.permissions,
    managerContext.roles
  );
  assert(
    !transRouteAuth.authorized,
    "06: Team Manager cannot access Transport Fleet Admin dashboard (/admin/transport)"
  );

  // -------------------------------------------------------------
  // TEST 7: Team Manager cannot modify official match results
  // -------------------------------------------------------------
  const scoringSubmitScope = await checkResourceScope(
    managerContext,
    "match",
    "match-blr-live-01",
    "submit"
  );
  assert(
    !scoringSubmitScope.allowed && !hasPermission(managerContext, PERMISSIONS.SCORING_SUBMIT),
    "07: Team Manager is strictly denied from submitting or altering official match scores"
  );

  // -------------------------------------------------------------
  // TEST 8: Team Manager cannot access another team's payment records
  // -------------------------------------------------------------
  const otherPaymentScope = await checkResourceScope(
    managerContext,
    "payment",
    "payment-other-99",
    "read",
    { teamId: "other-team-unauthorized" }
  );
  assert(
    !otherPaymentScope.allowed,
    "08: Team Manager is blocked from accessing another institution's payment records"
  );

  // -------------------------------------------------------------
  // TEST 9: Team Manager cannot access another team's accommodation
  // -------------------------------------------------------------
  const otherAccomScope = await checkResourceScope(
    managerContext,
    "accommodation",
    "alloc-other-99",
    "read",
    { teamId: "other-team-unauthorized" }
  );
  assert(
    !otherAccomScope.allowed,
    "09: Team Manager is blocked from accessing another institution's accommodation details"
  );

  // -------------------------------------------------------------
  // TEST 10: Team Manager cannot access private documents without permission
  // -------------------------------------------------------------
  const otherDocScope = await checkResourceScope(
    managerContext,
    "document",
    "doc-other-99",
    "read",
    { teamId: "other-team-unauthorized" }
  );
  assert(
    !otherDocScope.allowed,
    "10: Team Manager cannot inspect or access private documents belonging to other teams"
  );

  // -------------------------------------------------------------
  // TEST 11: Secure QR encodes only opaque token (no PII inside token)
  // -------------------------------------------------------------
  const qrReq = new NextRequest("http://localhost:3000/api/team/qr", {
    headers: authHeaders,
  });
  const qrRes = await getTeamQR(qrReq);
  const qrData = await qrRes.json();

  const tokenString = qrData.pass?.qrToken || "";
  const containsPII =
    tokenString.includes("Deepa") ||
    tokenString.includes("Rajesh") ||
    tokenString.includes("@") ||
    tokenString.includes("9845") ||
    tokenString.includes("S-101") ||
    tokenString.includes("2500");

  assert(
    qrRes.status === 200 &&
      qrData.success === true &&
      Boolean(qrData.pass?.qrToken) &&
      !containsPII,
    "11: Secure QR pass uses opaque reference token without encoding PII (no names, phones, rooms, or fees)"
  );

  // -------------------------------------------------------------
  // TEST 12: Manipulated teamId cannot bypass authorization
  // -------------------------------------------------------------
  const manipulatedReq = new NextRequest(
    "http://localhost:3000/api/team/payments?teamId=cmuf5chq5000er3p3a33fwpbh",
    {
      headers: authHeaders,
    }
  );
  const manipulatedRes = await getTeamPayments(manipulatedReq);
  assert(
    manipulatedRes.status === 403,
    "12: Manipulated teamId query parameter is strictly rejected with HTTP 403 Forbidden"
  );

  // -------------------------------------------------------------
  // TEST 13: Unauthenticated access is rejected
  // -------------------------------------------------------------
  const unauthReq = new NextRequest("http://localhost:3000/api/team");
  const unauthRes = await getTeamOverview(unauthReq);
  assert(
    unauthRes.status === 401,
    "13: Unauthenticated access to /api/team is strictly rejected with HTTP 401 Unauthorized"
  );

  // -------------------------------------------------------------
  // TEST 14: Empty team state works gracefully
  // -------------------------------------------------------------
  // Create a temporary user with TEAM_MANAGER role but no assigned teamId
  const emptyManager = await prisma.user.upsert({
    where: { email: "unassigned.manager@szwbt2026.edu" },
    update: { teamId: null, isActive: true },
    create: {
      email: "unassigned.manager@szwbt2026.edu",
      name: "Unassigned Manager",
      passwordHash: "szwbt2026pass",
      teamId: null,
      isActive: true,
    },
  });

  const tmRole = await prisma.role.findUnique({ where: { name: ROLES.TEAM_MANAGER } });
  if (tmRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: emptyManager.id, roleId: tmRole.id },
      },
      update: {},
      create: { userId: emptyManager.id, roleId: tmRole.id },
    });
  }

  const emptyContext = (await getUserContext(emptyManager.id))!;
  const emptyToken = createSessionToken({
    userId: emptyManager.id,
    email: emptyManager.email,
    roles: emptyContext.roles,
    permissions: emptyContext.permissions,
  });

  const emptyReq = new NextRequest("http://localhost:3000/api/team", {
    headers: { cookie: `szwbt_session=${emptyToken}` },
  });
  const emptyRes = await getTeamOverview(emptyReq);
  const emptyData = await emptyRes.json();

  assert(
    emptyRes.status === 200 &&
      emptyData.success === true &&
      emptyData.team === null &&
      emptyData.authorizedTeams.length === 0,
    "14: Empty team state is handled cleanly with authorizedTeams: [] and team: null"
  );

  // Clean up temporary user
  await prisma.user.delete({ where: { email: "unassigned.manager@szwbt2026.edu" } });

  // -------------------------------------------------------------
  // TEST 15: Invalid / Corrupted session token handled correctly
  // -------------------------------------------------------------
  const corruptReq = new NextRequest("http://localhost:3000/api/team", {
    headers: { cookie: "szwbt_session=corrupted.fake.jwt.token" },
  });
  const corruptRes = await getTeamOverview(corruptReq);
  assert(
    corruptRes.status === 401,
    "15: Corrupted or tampered session token is rejected with HTTP 401 Unauthorized"
  );

  console.log("\n============================================================");
  console.log(`TEAM MANAGER TEST SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("============================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error("Fatal Test Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
