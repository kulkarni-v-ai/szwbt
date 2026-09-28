/**
 * Comprehensive RBAC & Authorization Test Suite
 * Strictly verifies all 18 mandatory security test cases:
 *
 * 1. Unauthenticated user → 401
 * 2. Authenticated participant → cannot access /admin
 * 3. Participant → cannot access finance APIs
 * 4. Registration staff → can create registration
 * 5. Registration staff → cannot modify roles
 * 6. Accommodation staff → can allocate bed
 * 7. Accommodation staff → cannot submit match score
 * 8. Transport staff → can manage transport
 * 9. Finance staff → can manage permitted payment records
 * 10. Match official → can score assigned match
 * 11. Match official → cannot score unassigned match
 * 12. Team manager → can access own team
 * 13. Team manager → cannot access another team
 * 14. Participant → cannot access another participant
 * 15. Ordinary admin → cannot grant themselves SUPER_ADMIN
 * 16. Unauthorized API request → 403
 * 17. Disabled user → denied access
 * 18. Role removed → access is revoked appropriately
 */

import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { PERMISSIONS } from "../src/lib/rbac/permissions";
import { ROLES, ROLE_DEFINITIONS } from "../src/lib/rbac/roles";
import {
  getUserContext,
  hasPermission,
  checkResourceScope,
  validateRoleAssignment,
  UserContext,
} from "../src/lib/rbac/service";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "../src/lib/rbac/token";
import {
  authenticateRequest,
  authorizePermissions,
  authorizeResourceScope,
} from "../src/lib/rbac/guard";
import {
  checkRouteAuthorization,
  sanitizeRedirectUrl,
  ROUTES,
} from "../src/lib/rbac/routes";
import { GET as getFinancePayments } from "../src/app/api/finance/payments/route";
import { GET as getAdminRegistrations } from "../src/app/api/admin/registrations/route";

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
  console.log("RUNNING MANDATORY PRODUCTION RBAC AUTHORIZATION TESTS (18/18)");
  console.log("============================================================\n");

  // 1. Setup / Retrieve Test Users from DB
  const superAdminUser = await prisma.user.findUnique({ where: { email: "admin@szwbt2026.edu" } });
  const regStaffUser = await prisma.user.findUnique({ where: { email: "registration@szwbt2026.edu" } });
  const accomStaffUser = await prisma.user.findUnique({ where: { email: "hostel@szwbt2026.edu" } });
  const transStaffUser = await prisma.user.findUnique({ where: { email: "transport@szwbt2026.edu" } });
  const financeStaffUser = await prisma.user.findUnique({ where: { email: "finance@szwbt2026.edu" } });
  const umpireUser = await prisma.user.findUnique({ where: { email: "umpire@szwbt2026.edu" } });
  const teamManagerUser = await prisma.user.findUnique({ where: { email: "team@szwbt2026.edu" } });
  const participantUser = await prisma.user.findUnique({ where: { email: "player@szwbt2026.edu" } });

  if (!superAdminUser || !regStaffUser || !participantUser || !umpireUser || !teamManagerUser) {
    throw new Error("Bootstrap users not found. Run 'npx tsx prisma/seed-rbac.ts' first.");
  }

  // Load contexts
  const superContext = (await getUserContext(superAdminUser.id))!;
  const regContext = (await getUserContext(regStaffUser.id))!;
  const accomContext = (await getUserContext(accomStaffUser!.id))!;
  const transContext = (await getUserContext(transStaffUser!.id))!;
  const financeContext = (await getUserContext(financeStaffUser!.id))!;
  const umpireContext = (await getUserContext(umpireUser.id))!;
  const managerContext = (await getUserContext(teamManagerUser.id))!;
  const participantContext = (await getUserContext(participantUser.id))!;

  // -------------------------------------------------------------
  // TEST 1: Unauthenticated user → 401
  // -------------------------------------------------------------
  const unauthReq = new NextRequest("http://localhost:3000/api/finance/payments");
  const authRes1 = await authenticateRequest(unauthReq);
  assert(
    !authRes1.authenticated && authRes1.response.status === 401,
    "01: Unauthenticated request produces HTTP 401 Unauthorized"
  );

  // -------------------------------------------------------------
  // TEST 2: Authenticated participant → cannot access /admin
  // -------------------------------------------------------------
  const canParticipantConfigureSystem = hasPermission(participantContext, PERMISSIONS.SYSTEM_CONFIGURE);
  const canParticipantManageRoles = hasPermission(participantContext, PERMISSIONS.ROLES_READ);
  assert(
    !canParticipantConfigureSystem && !canParticipantManageRoles && !participantContext.roles.includes("SUPER_ADMIN"),
    "02: Authenticated participant cannot access /admin or system config"
  );

  // -------------------------------------------------------------
  // TEST 3: Participant → cannot access finance APIs
  // -------------------------------------------------------------
  const permErrorFinance = authorizePermissions(participantContext, [PERMISSIONS.FINANCE_READ]);
  const permErrorPayment = authorizePermissions(participantContext, [PERMISSIONS.PAYMENT_READ]);
  assert(
    permErrorFinance !== null &&
      permErrorFinance.status === 403 &&
      permErrorPayment !== null &&
      permErrorPayment.status === 403,
    "03: Participant denied from accessing finance APIs (HTTP 403 Forbidden)"
  );

  // -------------------------------------------------------------
  // TEST 4: Registration staff → can create registration
  // -------------------------------------------------------------
  const canRegCreate = hasPermission(regContext, PERMISSIONS.REGISTRATION_CREATE);
  const canRegComplete = hasPermission(regContext, PERMISSIONS.REGISTRATION_COMPLETE);
  const regCreateGuard = authorizePermissions(regContext, [PERMISSIONS.REGISTRATION_CREATE]);
  assert(
    canRegCreate && canRegComplete && regCreateGuard === null,
    "04: Registration staff is authorized to create registrations"
  );

  // -------------------------------------------------------------
  // TEST 5: Registration staff → cannot modify roles
  // -------------------------------------------------------------
  const canRegAssignRoles = hasPermission(regContext, PERMISSIONS.ROLES_ASSIGN);
  const regRoleAssignGuard = authorizePermissions(regContext, [PERMISSIONS.ROLES_ASSIGN]);
  const regEscalationAttempt = validateRoleAssignment(regContext, participantUser.id, "SUPER_ADMIN");
  assert(
    !canRegAssignRoles &&
      regRoleAssignGuard !== null &&
      regRoleAssignGuard.status === 403 &&
      !regEscalationAttempt.allowed,
    "05: Registration staff is forbidden from modifying roles or assigning permissions"
  );

  // -------------------------------------------------------------
  // TEST 6: Accommodation staff → can allocate bed
  // -------------------------------------------------------------
  const canAccomAllocate = hasPermission(accomContext, PERMISSIONS.ACCOMMODATION_ALLOCATE);
  const accomGuard = authorizePermissions(accomContext, [PERMISSIONS.ACCOMMODATION_ALLOCATE]);
  assert(
    canAccomAllocate && accomGuard === null,
    "06: Accommodation staff is authorized to allocate 5-bed hostel beds"
  );

  // -------------------------------------------------------------
  // TEST 7: Accommodation staff → cannot submit match score
  // -------------------------------------------------------------
  const canAccomScore = hasPermission(accomContext, PERMISSIONS.SCORING_UPDATE);
  const canAccomResult = hasPermission(accomContext, PERMISSIONS.RESULT_SUBMIT);
  const accomScoreGuard = authorizePermissions(accomContext, [PERMISSIONS.SCORING_UPDATE]);
  assert(
    !canAccomScore && !canAccomResult && accomScoreGuard !== null && accomScoreGuard.status === 403,
    "07: Accommodation staff cannot update scores or submit match results (HTTP 403)"
  );

  // -------------------------------------------------------------
  // TEST 8: Transport staff → can manage transport
  // -------------------------------------------------------------
  const canTransCreate = hasPermission(transContext, PERMISSIONS.TRANSPORT_CREATE);
  const canTransBoard = hasPermission(transContext, PERMISSIONS.TRANSPORT_BOARDING);
  const transGuard = authorizePermissions(transContext, [PERMISSIONS.TRANSPORT_BOARDING]);
  assert(
    canTransCreate && canTransBoard && transGuard === null,
    "08: Transport staff is authorized to manage routes and passenger boarding"
  );

  // -------------------------------------------------------------
  // TEST 9: Finance staff → can manage permitted payment records
  // -------------------------------------------------------------
  const canFinanceRead = hasPermission(financeContext, PERMISSIONS.PAYMENT_READ);
  const canFinanceReport = hasPermission(financeContext, PERMISSIONS.FINANCE_REPORT);
  const financePaymentScope = await checkResourceScope(financeContext, "payment", "p-01", "read", {
    paymentCategory: "REGISTRATION",
  });
  assert(
    canFinanceRead && canFinanceReport && financePaymentScope.allowed,
    "09: Finance staff is authorized to manage permitted payment records and generate reports"
  );

  // -------------------------------------------------------------
  // TEST 10: Match official → can score assigned match
  // -------------------------------------------------------------
  const assignedOfficialId = umpireContext.user.officialId || "official-court-01";
  const assignedMatchScope = await checkResourceScope(umpireContext, "match", "match-01", "update", {
    assignedOfficialId,
  });
  assert(
    hasPermission(umpireContext, PERMISSIONS.SCORING_UPDATE) && assignedMatchScope.allowed,
    "10: Match official is authorized to score their assigned match"
  );

  // -------------------------------------------------------------
  // TEST 11: Match official → cannot score unassigned match
  // -------------------------------------------------------------
  const unassignedMatchScope = await checkResourceScope(umpireContext, "match", "match-99", "update", {
    assignedOfficialId: "different-official-court-99",
  });
  assert(
    !unassignedMatchScope.allowed && Boolean(unassignedMatchScope.reason?.includes("not assigned")),
    "11: Match official is rejected from scoring an unassigned match (Resource Ownership)"
  );

  // -------------------------------------------------------------
  // TEST 12: Team manager → can access own team
  // -------------------------------------------------------------
  const ownTeamId = managerContext.user.teamId || "team-blr-warriors";
  const ownTeamScope = await checkResourceScope(managerContext, "team", ownTeamId, "read");
  assert(
    hasPermission(managerContext, PERMISSIONS.TEAM_READ) && ownTeamScope.allowed,
    "12: Team manager is authorized to access resources of their own team"
  );

  // -------------------------------------------------------------
  // TEST 13: Team manager → cannot access another team
  // -------------------------------------------------------------
  const otherTeamScope = await checkResourceScope(managerContext, "team", "foreign-team-kerala-02", "read");
  assert(
    !otherTeamScope.allowed && Boolean(otherTeamScope.reason?.includes("another institution")),
    "13: Team manager is denied from accessing another institution's private team data"
  );

  // -------------------------------------------------------------
  // TEST 14: Participant → cannot access another participant
  // -------------------------------------------------------------
  const ownParticipantId = participantContext.user.participantId || "p1-ananya-sharma";
  const ownPartScope = await checkResourceScope(participantContext, "participant", ownParticipantId, "read");
  const otherPartScope = await checkResourceScope(
    participantContext,
    "participant",
    "p2-foreign-athlete-99",
    "read"
  );
  assert(
    ownPartScope.allowed && !otherPartScope.allowed,
    "14: Participant can view own profile but is blocked from inspecting another athlete"
  );

  // -------------------------------------------------------------
  // TEST 15: Ordinary admin → cannot grant themselves SUPER_ADMIN
  // -------------------------------------------------------------
  const selfEscalation = validateRoleAssignment(regContext, regContext.user.id, ROLES.SUPER_ADMIN);
  const otherEscalation = validateRoleAssignment(regContext, participantUser.id, ROLES.SUPER_ADMIN);
  assert(
    !selfEscalation.allowed &&
      Boolean(selfEscalation.error?.includes("cannot modify your own role")) &&
      !otherEscalation.allowed &&
      Boolean(otherEscalation.error?.includes("Only an active Super Admin")),
    "15: Privilege escalation blocked: non-super admin cannot grant SUPER_ADMIN or self-escalate"
  );

  // -------------------------------------------------------------
  // TEST 16: Unauthorized API request → 403
  // -------------------------------------------------------------
  const deniedReq = authorizePermissions(umpireContext, [PERMISSIONS.FINANCE_REPORT]);
  assert(
    deniedReq !== null && deniedReq.status === 403,
    "16: Unauthorized API request returns strictly HTTP 403 Forbidden with descriptive detail"
  );

  // -------------------------------------------------------------
  // TEST 17: Disabled user → denied access
  // -------------------------------------------------------------
  // Create or update a disabled user in DB
  const disabledUser = await prisma.user.upsert({
    where: { email: "disabled.staff@szwbt2026.edu" },
    update: { isActive: false },
    create: {
      email: "disabled.staff@szwbt2026.edu",
      name: "Deactivated Staff Member",
      passwordHash: "szwbt2026pass",
      isActive: false,
    },
  });

  const disabledContext = await getUserContext(disabledUser.id);
  const disabledToken = createSessionToken({ userId: disabledUser.id, email: disabledUser.email });
  const disabledReq = new NextRequest("http://localhost:3000/api/auth/me", {
    headers: { Authorization: `Bearer ${disabledToken}` },
  });
  const disabledAuthResult = await authenticateRequest(disabledReq);

  assert(
    disabledContext === null &&
      !disabledAuthResult.authenticated &&
      disabledAuthResult.response.status === 403,
    "17: Deactivated/disabled user account is immediately denied access (HTTP 403)"
  );

  // -------------------------------------------------------------
  // TEST 18: Role removed → access is revoked appropriately
  // -------------------------------------------------------------
  // Create a temporary user with VOLUNTEER role, then revoke it
  const tempUser = await prisma.user.upsert({
    where: { email: "temp.revocation@szwbt2026.edu" },
    update: { isActive: true },
    create: {
      email: "temp.revocation@szwbt2026.edu",
      name: "Temporary Volunteer",
      passwordHash: "szwbt2026pass",
      isActive: true,
    },
  });

  const volunteerRole = await prisma.role.findUnique({ where: { name: ROLES.VOLUNTEER } });
  await prisma.userRole.create({
    data: { userId: tempUser.id, roleId: volunteerRole!.id },
  });

  const beforeRevoke = await getUserContext(tempUser.id);
  const hadVolunteerRole = beforeRevoke?.roles.includes(ROLES.VOLUNTEER);

  // Now revoke the role
  await prisma.userRole.deleteMany({
    where: { userId: tempUser.id, roleId: volunteerRole!.id },
  });

  const afterRevoke = await getUserContext(tempUser.id);
  const hasRoleAfterRevoke = afterRevoke?.roles.includes(ROLES.VOLUNTEER);

  assert(
    hadVolunteerRole === true && hasRoleAfterRevoke === false && afterRevoke?.permissions.length === 0,
    "18: When role is removed from database, permissions are immediately and authoritatively revoked"
  );

  // -------------------------------------------------------------
  // TEST 19: Direct URL Testing — Registration Staff Route Restrictions
  // Allowed: /admin/registrations
  // Denied (403): /admin/finance, /admin/accommodation, /admin/live, /admin/system
  // -------------------------------------------------------------
  const regAtRegistrations = checkRouteAuthorization("/admin/registrations", regContext.permissions, regContext.roles);
  const regAtFinance = checkRouteAuthorization("/admin/finance", regContext.permissions, regContext.roles);
  const regAtAccom = checkRouteAuthorization("/admin/accommodation", regContext.permissions, regContext.roles);
  const regAtLive = checkRouteAuthorization("/admin/live", regContext.permissions, regContext.roles);
  const regAtSystem = checkRouteAuthorization("/admin/system", regContext.permissions, regContext.roles);

  assert(
    regAtRegistrations.authorized &&
      !regAtFinance.authorized &&
      !regAtAccom.authorized &&
      !regAtLive.authorized &&
      !regAtSystem.authorized,
    "19: Direct URL manipulation: Registration Staff allowed on /admin/registrations, blocked on /admin/finance, /admin/accommodation, /admin/live, /admin/system"
  );

  // -------------------------------------------------------------
  // TEST 20: Direct URL Testing — Finance Staff Route Restrictions
  // Allowed: /admin/finance
  // Denied (403): /admin/accommodation, /admin/live
  // -------------------------------------------------------------
  const finAtFinance = checkRouteAuthorization("/admin/finance", financeContext.permissions, financeContext.roles);
  const finAtAccom = checkRouteAuthorization("/admin/accommodation", financeContext.permissions, financeContext.roles);
  const finAtLive = checkRouteAuthorization("/admin/live", financeContext.permissions, financeContext.roles);

  assert(
    finAtFinance.authorized && !finAtAccom.authorized && !finAtLive.authorized,
    "20: Direct URL manipulation: Finance Staff allowed on /admin/finance, blocked on /admin/accommodation and /admin/live"
  );

  // -------------------------------------------------------------
  // TEST 21: Direct URL Testing — Accommodation Staff Route Restrictions
  // Allowed: /admin/accommodation
  // Denied (403): /admin/finance
  // -------------------------------------------------------------
  const accomAtAccom = checkRouteAuthorization("/admin/accommodation", accomContext.permissions, accomContext.roles);
  const accomAtFinance = checkRouteAuthorization("/admin/finance", accomContext.permissions, accomContext.roles);

  assert(
    accomAtAccom.authorized && !accomAtFinance.authorized,
    "21: Direct URL manipulation: Accommodation Staff allowed on /admin/accommodation, blocked on /admin/finance"
  );

  // -------------------------------------------------------------
  // TEST 22: Direct URL Testing — Match Official Route Restrictions
  // Allowed: /official
  // Denied (403): /admin/finance, /admin/system
  // -------------------------------------------------------------
  const umpireAtOfficial = checkRouteAuthorization("/official", umpireContext.permissions, umpireContext.roles);
  const umpireAtFinance = checkRouteAuthorization("/admin/finance", umpireContext.permissions, umpireContext.roles);
  const umpireAtSystem = checkRouteAuthorization("/admin/system", umpireContext.permissions, umpireContext.roles);

  assert(
    umpireAtOfficial.authorized && !umpireAtFinance.authorized && !umpireAtSystem.authorized,
    "22: Direct URL manipulation: Match Official allowed on /official, blocked on /admin/finance and /admin/system"
  );

  // -------------------------------------------------------------
  // TEST 23: Direct URL Testing — Participant Route Restrictions
  // Allowed: /dashboard
  // Denied (403): /admin, /admin/registrations
  // -------------------------------------------------------------
  const partAtDashboard = checkRouteAuthorization("/dashboard", participantContext.permissions, participantContext.roles);
  const partAtAdmin = checkRouteAuthorization("/admin", participantContext.permissions, participantContext.roles);
  const partAtRegistrations = checkRouteAuthorization("/admin/registrations", participantContext.permissions, participantContext.roles);

  assert(
    partAtDashboard.authorized && !partAtAdmin.authorized && !partAtRegistrations.authorized,
    "23: Direct URL manipulation: Participant allowed on /dashboard, strictly blocked on /admin and /admin/registrations"
  );

  // -------------------------------------------------------------
  // TEST 24: Direct URL Testing — Super Admin Unrestricted Access
  // -------------------------------------------------------------
  const superAtAdmin = checkRouteAuthorization("/admin", superContext.permissions, superContext.roles);
  const superAtFinance = checkRouteAuthorization("/admin/finance", superContext.permissions, superContext.roles);
  const superAtRegistrations = checkRouteAuthorization("/admin/registrations", superContext.permissions, superContext.roles);
  const superAtAccom = checkRouteAuthorization("/admin/accommodation", superContext.permissions, superContext.roles);

  assert(
    superAtAdmin.authorized && superAtFinance.authorized && superAtRegistrations.authorized && superAtAccom.authorized,
    "24: Direct URL manipulation: Super Admin has authorized clearance across all administrative namespaces"
  );

  // -------------------------------------------------------------
  // TEST 25: API Direct Access — Registration Staff calls GET /api/finance/payments → 403
  // -------------------------------------------------------------
  const regSessionToken = createSessionToken({
    userId: regStaffUser.id,
    email: regStaffUser.email,
    roles: regContext.roles,
    permissions: regContext.permissions,
  });
  const regFinanceApiReq = new NextRequest("http://localhost:3000/api/finance/payments", {
    headers: {
      cookie: `szwbt_session=${regSessionToken}`,
    },
  });
  const regFinanceApiRes = await getFinancePayments(regFinanceApiReq);
  const regFinanceData = await regFinanceApiRes.json();

  assert(
    regFinanceApiRes.status === 403 && regFinanceData.success === false,
    "25: API Direct Access: Registration Staff calling GET /api/finance/payments receives HTTP 403 Forbidden"
  );

  // -------------------------------------------------------------
  // TEST 26: API Direct Access — Participant calls GET /api/admin/registrations → 403
  // -------------------------------------------------------------
  const partSessionToken = createSessionToken({
    userId: participantUser.id,
    email: participantUser.email,
    roles: participantContext.roles,
    permissions: participantContext.permissions,
  });
  const partRegApiReq = new NextRequest("http://localhost:3000/api/admin/registrations", {
    headers: {
      cookie: `szwbt_session=${partSessionToken}`,
    },
  });
  const partRegApiRes = await getAdminRegistrations(partRegApiReq);
  const partRegData = await partRegApiRes.json();

  assert(
    partRegApiRes.status === 403 && partRegData.success === false,
    "26: API Direct Access: Participant calling GET /api/admin/registrations receives HTTP 403 Forbidden"
  );

  // -------------------------------------------------------------
  // TEST 27: Open Redirect Protection — sanitizeRedirectUrl()
  // -------------------------------------------------------------
  const safe1 = sanitizeRedirectUrl("/admin/finance");
  const safe2 = sanitizeRedirectUrl("/team?teamId=123");
  const blocked1 = sanitizeRedirectUrl("https://malicious-site.example");
  const blocked2 = sanitizeRedirectUrl("//malicious-site.example");
  const blocked3 = sanitizeRedirectUrl("/\\malicious-site.example");
  const blocked4 = sanitizeRedirectUrl("/@malicious-site.example");
  const blocked5 = sanitizeRedirectUrl("http://evil.com/admin");

  assert(
    safe1 === "/admin/finance" &&
      safe2 === "/team?teamId=123" &&
      blocked1 === "/admin" &&
      blocked2 === "/admin" &&
      blocked3 === "/admin" &&
      blocked4 === "/admin" &&
      blocked5 === "/admin",
    "27: Open redirect defense: sanitizeRedirectUrl() accepts valid internal paths and blocks all external/protocol exploit vectors"
  );

  // Cleanup temp records
  await prisma.user.delete({ where: { email: "temp.revocation@szwbt2026.edu" } });
  await prisma.user.delete({ where: { email: "disabled.staff@szwbt2026.edu" } });

  console.log("\n============================================================");
  console.log(`RBAC TEST SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("============================================================\n");


  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error("Fatal Test Suite Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
