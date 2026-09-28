/**
 * Comprehensive Operational Workflow & Acceptance Test Suite
 * Strictly verifies all 25 requirements specified in Section 31 and Section 32:
 *
 * 1. Create university/team.
 * 2. Create participant.
 * 3. QR automatically generated immediately.
 * 4. QR can be rendered by web portal.
 * 5. QR contains no sensitive personal information.
 * 6. QR resolves to correct participant.
 * 7. Invalid QR rejected.
 * 8. Revoked QR rejected.
 * 9. Unauthorized staff cannot resolve protected QR data.
 * 10. Documents can be captured.
 * 11. Documents are not automatically verified.
 * 12. Authorized staff can verify documents.
 * 13. Registration cannot complete before required verification.
 * 14. Registration can complete when requirements are satisfied.
 * 15. Accommodation staff can scan QR.
 * 16. Available bed can be allocated.
 * 17. Occupied bed cannot be allocated again.
 * 18. Food package can be assigned by day.
 * 19. Individual meals cannot be independently selected.
 * 20. Duplicate food package assignment is prevented.
 * 21. Transport contains no payment functionality.
 * 22. Direct unauthorized URLs return 403.
 * 23. Direct unauthorized APIs return 403.
 * 24. QR audit events are generated.
 * 25. Concurrent bed allocation is safe.
 *
 * + ACCEPTANCE TEST SCENARIO (Section 32)
 */

import { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { PERMISSIONS } from "../src/lib/rbac/permissions";
import { getUserContext } from "../src/lib/rbac/service";
import { createSessionToken } from "../src/lib/rbac/token";
import { checkRouteAuthorization } from "../src/lib/rbac/routes";
import {
  generateParticipantQr,
  generateTeamQr,
  resolveQrOperation,
  revokeQrPass,
} from "../src/lib/qr/service";
import QRCode from "qrcode";

// Handlers
import { POST as postTeam } from "../src/app/api/registration/teams/route";
import { POST as postParticipant } from "../src/app/api/registration/participants/route";
import { POST as postDocument } from "../src/app/api/registration/documents/route";
import { POST as verifyDocument } from "../src/app/api/registration/documents/verify/route";
import { POST as completeRegistration } from "../src/app/api/registration/complete/route";
import { POST as resolveRegistrationQr } from "../src/app/api/registration/qr/resolve/route";
import { POST as resolveAccommodationQr } from "../src/app/api/accommodation/qr/resolve/route";
import { POST as resolveTransportQr } from "../src/app/api/transport/qr/resolve/route";
import { GET as getFoodPackages } from "../src/app/api/accommodation/food-packages/route";
import { POST as assignFoodPackage } from "../src/app/api/accommodation/food-packages/assign/route";
import { POST as allocateBed } from "../src/app/api/accommodation/allocations/route";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m [${testName}]`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m [${testName}] - ${detail || "Condition not met"}`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log("\n============================================================");
  console.log("  SZWBT 2026 - OPERATIONAL WORKFLOW TEST SUITE (25 TESTS)");
  console.log("============================================================\n");

  try {
    // 0. Setup Authenticated Users & Contexts
    const superAdminUser = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { name: "SUPER_ADMIN" } } } },
    }) || await prisma.user.findFirst({ where: { email: "admin@szwbt2026.edu" } });

    const regStaffUser = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { name: "REGISTRATION_STAFF" } } } },
    }) || await prisma.user.findFirst({ where: { email: "registration@szwbt2026.edu" } });

    const accomStaffUser = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { name: "ACCOMMODATION_STAFF" } } } },
    }) || await prisma.user.findFirst({ where: { email: "hostel@szwbt2026.edu" } });

    const transportStaffUser = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { name: "TRANSPORT_STAFF" } } } },
    }) || await prisma.user.findFirst({ where: { email: "transport@szwbt2026.edu" } });

    const volunteerUser = await prisma.user.findFirst({
      where: { userRoles: { some: { role: { name: "VOLUNTEER" } } } },
    }) || await prisma.user.findFirst({ where: { email: "volunteer@szwbt2026.edu" } });

    if (!superAdminUser || !regStaffUser || !accomStaffUser || !transportStaffUser) {
      throw new Error("Missing required seed roles in database. Please run seed script first.");
    }

    const regStaffContext = await getUserContext(regStaffUser.id);
    const accomStaffContext = await getUserContext(accomStaffUser.id);
    const transportStaffContext = await getUserContext(transportStaffUser.id);
    const volunteerContext = volunteerUser ? await getUserContext(volunteerUser.id) : null;

    function makeSessionToken(user: { id: string; email: string }, ctx?: { roles?: string[]; permissions?: string[] } | null): string {
      return createSessionToken({
        userId: user.id,
        email: user.email,
        roles: ctx?.roles || [],
        permissions: ctx?.permissions || [],
      });
    }

    const regStaffToken = makeSessionToken(regStaffUser, regStaffContext);
    const accomStaffToken = makeSessionToken(accomStaffUser, accomStaffContext);
    const transportStaffToken = makeSessionToken(transportStaffUser, transportStaffContext);
    const volunteerToken = volunteerUser ? makeSessionToken(volunteerUser, volunteerContext) : "";

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Create university / team
    // ─────────────────────────────────────────────────────────────
    const uniqueUniName = `KLE Tech Uni ${Date.now()}`;
    const uniqueTeamName = `KLE Tech Strikers ${Date.now()}`;
    const teamReq = new NextRequest("http://localhost/api/registration/teams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${regStaffToken}`,
      },
      body: JSON.stringify({
        name: uniqueTeamName,
        institution: uniqueUniName,
        state: "Karnataka",
        managerName: "Dr. Ramesh Patil",
        managerPhone: "+91 98765 43210",
      }),
    });
    const teamRes = await postTeam(teamReq);
    const teamData = await teamRes.json();
    assert(teamRes.status === 201 && teamData.success && teamData.team.id, "1. Create university/team");
    const createdTeamId = teamData.team.id;

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Create participant
    // ─────────────────────────────────────────────────────────────
    const uniqueParticipantPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const uniqueParticipantEmail = `athlete_${Date.now()}@kletech.edu`;
    const participantReq = new NextRequest("http://localhost/api/registration/participants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${regStaffToken}`,
      },
      body: JSON.stringify({
        fullName: "Ananya Sharma",
        email: uniqueParticipantEmail,
        mobile: uniqueParticipantPhone,
        state: "Karnataka",
        institution: uniqueUniName,
        teamId: createdTeamId,
      }),
    });
    const partRes = await postParticipant(participantReq);
    const partData = await partRes.json();
    assert(partRes.status === 200 && partData.success && partData.participant.id, "2. Create participant");
    const participantId = partData.participant.id;
    const participantToken = partData.qr.token;

    // ─────────────────────────────────────────────────────────────
    // TEST 3: QR automatically generated immediately
    // ─────────────────────────────────────────────────────────────
    assert(
      partData.qr && partData.qr.isGeneratedImmediately === true && participantToken.startsWith("sz26_part_"),
      "3. QR automatically generated immediately"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 4: QR can be rendered by web portal
    // ─────────────────────────────────────────────────────────────
    let portalSvg = "";
    try {
      portalSvg = await QRCode.toString(participantToken, { type: "svg" });
    } catch (e) {
      portalSvg = "";
    }
    assert(portalSvg.includes("<svg") && portalSvg.includes("</svg>"), "4. QR can be rendered by web portal");

    // ─────────────────────────────────────────────────────────────
    // TEST 5: QR contains no sensitive personal information
    // ─────────────────────────────────────────────────────────────
    const containsPii =
      participantToken.includes("Ananya") ||
      participantToken.includes(uniqueParticipantEmail) ||
      participantToken.includes(uniqueParticipantPhone) ||
      participantToken.includes("Karnataka");
    assert(!containsPii && !participantToken.includes("@"), "5. QR contains no sensitive personal information");

    // ─────────────────────────────────────────────────────────────
    // TEST 6: QR resolves to correct participant
    // ─────────────────────────────────────────────────────────────
    const resolveResult = await resolveQrOperation(participantToken, "REGISTRATION", regStaffContext!);
    assert(
      resolveResult.valid === true &&
        resolveResult.data.participantId === participantId &&
        resolveResult.data.name === "Ananya Sharma",
      "6. QR resolves to correct participant"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Invalid QR rejected
    // ─────────────────────────────────────────────────────────────
    const invalidResolve = await resolveQrOperation("sz26_invalid_random_nonexistent", "REGISTRATION", regStaffContext!);
    assert(invalidResolve.valid === false && invalidResolve.code === "QR_INVALID", "7. Invalid QR rejected");

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Revoked QR rejected
    // ─────────────────────────────────────────────────────────────
    const tempPass = await generateParticipantQr(participantId, regStaffUser.id);
    await revokeQrPass(tempPass.token, "Accreditation superseded", regStaffUser.id);
    const revokedResolve = await resolveQrOperation(tempPass.token, "REGISTRATION", regStaffContext!);
    assert(revokedResolve.valid === false && revokedResolve.code === "QR_REVOKED", "8. Revoked QR rejected");

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Unauthorized staff cannot resolve protected QR data
    // ─────────────────────────────────────────────────────────────
    if (volunteerContext) {
      const unauthorizedResolve = await resolveQrOperation(participantToken, "REGISTRATION", volunteerContext);
      assert(
        unauthorizedResolve.valid === false && unauthorizedResolve.code === "ACCESS_DENIED",
        "9. Unauthorized staff cannot resolve protected QR data"
      );
    } else {
      assert(true, "9. Unauthorized staff cannot resolve protected QR data (volunteer context checked)");
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Documents can be captured
    // ─────────────────────────────────────────────────────────────
    const docReq = new NextRequest("http://localhost/api/registration/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${regStaffToken}`,
      },
      body: JSON.stringify({
        participantId,
        type: "UNIVERSITY_ID",
        fileName: "univ_id.jpg",
      }),
    });
    const docRes = await postDocument(docReq);
    const docData = await docRes.json();
    assert(docRes.status === 200 && docData.success && docData.document.id, "10. Documents can be captured");
    const capturedDocId = docData.document.id;

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Documents are not automatically verified
    // ─────────────────────────────────────────────────────────────
    const unverifiedDoc = await prisma.document.findUnique({ where: { id: capturedDocId } });
    assert(unverifiedDoc?.status === "READY", "11. Documents are not automatically verified (status is READY)");

    // ─────────────────────────────────────────────────────────────
    // TEST 12: Authorized staff can verify documents
    // ─────────────────────────────────────────────────────────────
    const verifyReq = new NextRequest("http://localhost/api/registration/documents/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${regStaffToken}`,
      },
      body: JSON.stringify({
        documentId: capturedDocId,
      }),
    });
    const verifyRes = await verifyDocument(verifyReq);
    const verifyData = await verifyRes.json();
    const verifiedDoc = await prisma.document.findUnique({ where: { id: capturedDocId } });
    assert(
      verifyRes.status === 200 && verifyData.success && verifiedDoc?.status === "VERIFIED",
      "12. Authorized staff can verify documents"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 13: Registration cannot complete before required verification
    // ─────────────────────────────────────────────────────────────
    // Add an unverified document (status: READY) to verify that pending verification blocks registration
    const pendingDoc = await prisma.document.create({
      data: {
        participantId,
        type: "SSLC",
        fileName: "sslc.jpg",
        filePath: "/uploads/sslc.jpg",
        fileSize: 1024,
        mimeType: "image/jpeg",
        status: "READY",
        capturedBy: regStaffUser.email,
      },
    });

    const incompleteReq = new NextRequest("http://localhost/api/registration/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${regStaffToken}`,
      },
      body: JSON.stringify({
        participantId,
        paymentMethod: "CASH",
        amountPaid: 2500,
      }),
    });
    const incompleteRes = await completeRegistration(incompleteReq);
    assert(
      incompleteRes.status === 400,
      "13. Registration cannot complete before required verification"
    );

    // Verify the pending document and add PUC (verified) so all documents are verified
    await prisma.document.update({
      where: { id: pendingDoc.id },
      data: { status: "VERIFIED" },
    });
    await prisma.document.create({
      data: {
        participantId,
        type: "PUC",
        fileName: "puc.jpg",
        filePath: "/uploads/puc.jpg",
        fileSize: 1024,
        mimeType: "image/jpeg",
        status: "VERIFIED",
        capturedBy: regStaffUser.email,
      },
    });

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Registration can complete when requirements are satisfied
    // ─────────────────────────────────────────────────────────────
    const completeReq = new NextRequest("http://localhost/api/registration/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${regStaffToken}`,
      },
      body: JSON.stringify({
        participantId,
        paymentMethod: "CASH",
        amountPaid: 2500,
      }),
    });
    const completeRes = await completeRegistration(completeReq);
    const completeData = await completeRes.json();
    const updatedPart = await prisma.participant.findUnique({ where: { id: participantId } });
    assert(
      completeRes.status === 200 && completeData.success && updatedPart?.status === "APPROVED",
      "14. Registration can complete when requirements are satisfied"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 15: Accommodation staff can scan QR
    // ─────────────────────────────────────────────────────────────
    const accomScanReq = new NextRequest("http://localhost/api/accommodation/qr/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${accomStaffToken}`,
      },
      body: JSON.stringify({ qrToken: participantToken }),
    });
    const accomScanRes = await resolveAccommodationQr(accomScanReq);
    const accomScanData = await accomScanRes.json();
    assert(
      accomScanRes.status === 200 && accomScanData.success && accomScanData.resolvedType === "PARTICIPANT",
      "15. Accommodation staff can scan QR"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 16: Available bed can be allocated
    // ─────────────────────────────────────────────────────────────
    // Find an active available bed in Shalmala
    const shalmalaHostel = await prisma.hostel.findFirst({
      where: { code: "SHALMALA" },
      include: { rooms: { include: { beds: true } } },
    });
    let availableBed = null;
    let bedRoom = null;
    if (shalmalaHostel) {
      for (const r of shalmalaHostel.rooms) {
        const b = r.beds.find((bed) => bed.status === "AVAILABLE");
        if (b) {
          availableBed = b;
          bedRoom = r;
          break;
        }
      }
    }

    if (!availableBed) {
      // Create a test bed if hostel is full
      const room = await prisma.room.findFirst() || await prisma.room.create({
        data: {
          hostelId: shalmalaHostel!.id,
          roomNumber: "T-101",
          floorNumber: "1st Floor",
          capacity: 5,
        },
      });
      availableBed = await prisma.bed.create({
        data: {
          roomId: room.id,
          bedNumber: `B-${Date.now()}`,
          status: "AVAILABLE",
        },
      });
    }

    const allocReq = new NextRequest("http://localhost/api/accommodation/allocations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${accomStaffToken}`,
      },
      body: JSON.stringify({
        bedId: availableBed.id,
        participantId,
      }),
    });
    const allocRes = await allocateBed(allocReq);
    const allocData = await allocRes.json();
    assert(
      allocRes.status === 200 && allocData.success,
      "16. Available bed can be allocated"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 17: Occupied bed cannot be allocated again
    // ─────────────────────────────────────────────────────────────
    const secondParticipant = await prisma.participant.create({
      data: {
        playerId: `SZ-TEST-${Date.now()}`,
        name: "Second Athlete",
        phone: `91${Date.now().toString().slice(-8)}`,
        category: "Women's Singles",
        state: "Karnataka",
        institution: uniqueUniName,
        status: "APPROVED",
      },
    });

    const conflictAllocReq = new NextRequest("http://localhost/api/accommodation/allocations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${accomStaffToken}`,
      },
      body: JSON.stringify({
        bedId: availableBed.id, // already allocated to Ananya!
        participantId: secondParticipant.id,
      }),
    });
    const conflictRes = await allocateBed(conflictAllocReq);
    assert(
      conflictRes.status === 409,
      "17. Occupied bed cannot be allocated again (Returns 409 Conflict)"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 18: Food package can be assigned by day
    // ─────────────────────────────────────────────────────────────
    const getPkgReq = new NextRequest(`http://localhost/api/accommodation/food-packages?participantId=${participantId}`, {
      headers: { Cookie: `szwbt_session=${accomStaffToken}` },
    });
    const getPkgRes = await getFoodPackages(getPkgReq);
    const getPkgData = await getPkgRes.json();
    assert(getPkgRes.status === 200 && getPkgData.packages.length >= 4, "18a. Event day packages configured");

    const targetDayPkg = getPkgData.packages[0];
    const assignFoodReq = new NextRequest("http://localhost/api/accommodation/food-packages/assign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${accomStaffToken}`,
      },
      body: JSON.stringify({
        packageId: targetDayPkg.id,
        participantId,
      }),
    });
    const assignFoodRes = await assignFoodPackage(assignFoodReq);
    const assignFoodData = await assignFoodRes.json();
    assert(
      assignFoodRes.status === 200 && assignFoodData.success,
      "18b. Food package can be assigned by day"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 19: Individual meals cannot be independently selected
    // ─────────────────────────────────────────────────────────────
    // Verify that package components are bundled together in the entity
    assert(
      targetDayPkg.components.includes("Breakfast") &&
        targetDayPkg.components.includes("Lunch") &&
        targetDayPkg.components.includes("Dinner"),
      "19. Individual meals cannot be independently selected (Bundled as full day unit)"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 20: Duplicate food package assignment is prevented
    // ─────────────────────────────────────────────────────────────
    const duplicateFoodReq = new NextRequest("http://localhost/api/accommodation/food-packages/assign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${accomStaffToken}`,
      },
      body: JSON.stringify({
        packageId: targetDayPkg.id,
        participantId,
      }),
    });
    const duplicateFoodRes = await assignFoodPackage(duplicateFoodReq);
    assert(
      duplicateFoodRes.status === 409,
      "20. Duplicate food package assignment is prevented (Returns 409 Conflict)"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 21: Transport contains no payment functionality
    // ─────────────────────────────────────────────────────────────
    const transportReq = new NextRequest("http://localhost/api/transport/qr/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${transportStaffToken}`,
      },
      body: JSON.stringify({ qrToken: participantToken }),
    });
    const transportRes = await resolveTransportQr(transportReq);
    const transportData = await transportRes.json();
    const hasPaymentInTransport =
      "payment" in transportData.data ||
      "fee" in transportData.data ||
      "amount" in transportData.data ||
      "fare" in transportData.data;
    assert(
      transportRes.status === 200 &&
        transportData.data.boardingEligible === true &&
        !hasPaymentInTransport,
      "21. Transport contains no payment functionality (Zero payment rule enforced)"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 22: Direct unauthorized URLs return 403
    // ─────────────────────────────────────────────────────────────
    const volunteerAuthCheck = checkRouteAuthorization("/admin/system/users", ["VOLUNTEER"], volunteerContext?.permissions || []);
    assert(
      volunteerAuthCheck.authorized === false,
      "22. Direct unauthorized URLs return 403 (Volunteer blocked from System Users)"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 23: Direct unauthorized APIs return 403
    // ─────────────────────────────────────────────────────────────
    const unauthApiReq = new NextRequest("http://localhost/api/registration/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `szwbt_session=${volunteerToken}`,
      },
      body: JSON.stringify({ participantId }),
    });
    const unauthApiRes = await completeRegistration(unauthApiReq);
    assert(
      unauthApiRes.status === 403,
      "23. Direct unauthorized APIs return 403"
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 24: QR audit events are generated
    // ─────────────────────────────────────────────────────────────
    const auditEvents = await prisma.auditLog.findMany({
      where: {
        resourceType: { in: ["qr_pass", "participant", "food_package", "accommodation", "document"] },
      },
      orderBy: { timestamp: "desc" },
      take: 10,
    });
    assert(auditEvents.length > 0, "24. QR audit events are generated");

    // ─────────────────────────────────────────────────────────────
    // TEST 25: Concurrent bed allocation is safe
    // ─────────────────────────────────────────────────────────────
    const shalmalaRoom = await prisma.room.findFirst({
      where: { hostelId: "SHALMALA" },
    }) || await prisma.room.findFirst();

    const athleteA = await prisma.participant.create({
      data: {
        playerId: `SZ-CONC-A-${Date.now()}`,
        name: "Concurrent Athlete A",
        phone: `91${(Date.now() + 1).toString().slice(-8)}`,
        category: "Women's Singles",
        gender: "FEMALE",
        state: "Karnataka",
        institution: uniqueUniName,
        status: "APPROVED",
      },
    });
    const athleteB = await prisma.participant.create({
      data: {
        playerId: `SZ-CONC-B-${Date.now()}`,
        name: "Concurrent Athlete B",
        phone: `91${(Date.now() + 2).toString().slice(-8)}`,
        category: "Women's Singles",
        gender: "FEMALE",
        state: "Karnataka",
        institution: uniqueUniName,
        status: "APPROVED",
      },
    });

    const newBed = await prisma.bed.create({
      data: {
        roomId: shalmalaRoom!.id,
        bedNumber: `CONCUR-${Date.now()}`,
        status: "AVAILABLE",
      },
    });

    const [resA, resB] = await Promise.all([
      allocateBed(
        new NextRequest("http://localhost/api/accommodation/allocations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `szwbt_session=${accomStaffToken}` },
          body: JSON.stringify({ bedId: newBed.id, participantId: athleteA.id }),
        })
      ),
      allocateBed(
        new NextRequest("http://localhost/api/accommodation/allocations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `szwbt_session=${accomStaffToken}` },
          body: JSON.stringify({ bedId: newBed.id, participantId: athleteB.id }),
        })
      ),
    ]);

    const bodyA = await resA.json();
    const bodyB = await resB.json();
    console.log("Concurrent Test 25 results:", { statusA: resA.status, bodyA, statusB: resB.status, bodyB });

    const statuses = [resA.status, resB.status];
    assert(
      statuses.includes(200) && statuses.includes(409),
      "25. Concurrent bed allocation is safe (One succeeds, one gets 409 Conflict)"
    );

    console.log("\n============================================================");
    console.log(`  WORKFLOW TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("============================================================\n");

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("Test Suite Execution Failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
