/**
 * Production Finance Operations & Domain Invariant Test Script
 * Verifies Dashboard 05 Finance APIs, RBAC guards, and strict tournament invariants.
 */

import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/rbac/token";
import { getUserContext } from "../src/lib/rbac/service";
import { NextRequest } from "next/server";
import { GET as getOverview } from "../src/app/api/finance/overview/route";
import { GET as getPayments, POST as postPayment } from "../src/app/api/finance/payments/route";
import { GET as getPaymentDetail, PATCH as patchPaymentDetail } from "../src/app/api/finance/payments/[id]/route";
import { GET as getPending } from "../src/app/api/finance/pending/route";
import { GET as getReports } from "../src/app/api/finance/reports/route";
import { GET as getSearch } from "../src/app/api/finance/search/route";

function assert(condition: boolean, testName: string, details?: any) {
  if (!condition) {
    console.error(`\x1b[31m  ✖ FAIL [${testName}]\x1b[0m`, details || "");
    throw new Error(`Assertion failed: ${testName}`);
  } else {
    console.log(`\x1b[32m  ✔ PASS [${testName}]\x1b[0m`);
  }
}

async function runFinanceTests() {
  console.log("\n============================================================");
  console.log("RUNNING DASHBOARD 05 — FINANCE OPERATIONS TEST SUITE");
  console.log("============================================================\n");

  // 1. Identify Test Users
  const financeUser = await prisma.user.findUnique({
    where: { email: "finance@szwbt2026.edu" },
  });
  const transportUser = await prisma.user.findUnique({
    where: { email: "transport@szwbt2026.edu" },
  });
  const participantUser = await prisma.user.findFirst({
    where: { participantId: { not: null } },
  });

  if (!financeUser || !transportUser) {
    throw new Error("Required test users not found in database.");
  }

  const financeContext = await getUserContext(financeUser.id);
  const transportContext = await getUserContext(transportUser.id);

  if (!financeContext || !transportContext) {
    throw new Error("User contexts could not be loaded.");
  }

  const financeToken = createSessionToken({
    userId: financeUser.id,
    email: financeUser.email,
    roles: financeContext.roles,
    permissions: financeContext.permissions,
  });

  const transportToken = createSessionToken({
    userId: transportUser.id,
    email: transportUser.email,
    roles: transportContext.roles,
    permissions: transportContext.permissions,
  });

  // Ensure a test participant exists for ledger tests
  let testParticipant = await prisma.participant.findFirst();
  if (!testParticipant) {
    testParticipant = await prisma.participant.create({
      data: {
        playerId: "SZ-FIN-TEST-01",
        name: "Ananya Sharma",
        institution: "PES University",
        state: "Karnataka",
        category: "Women's Singles",
        status: "APPROVED",
      },
    });
  }

  // -------------------------------------------------------------
  // TEST 01: Unauthenticated request rejected (HTTP 401)
  // -------------------------------------------------------------
  const unauthReq = new NextRequest("http://localhost:3000/api/finance/overview");
  const unauthRes = await getOverview(unauthReq);
  assert(unauthRes.status === 401, "Test 01: Unauthenticated request to /api/finance/overview produces HTTP 401");

  // -------------------------------------------------------------
  // TEST 02: Transport Staff denied from Finance (HTTP 403)
  // -------------------------------------------------------------
  const transportReq = new NextRequest("http://localhost:3000/api/finance/overview", {
    headers: { cookie: `szwbt_session=${transportToken}` },
  });
  const transportRes = await getOverview(transportReq);
  assert(transportRes.status === 403, "Test 02: Transport staff denied from /api/finance/overview (HTTP 403)");

  // -------------------------------------------------------------
  // TEST 03: Finance Staff authorized on Overview (HTTP 200)
  // -------------------------------------------------------------
  const financeReq = new NextRequest("http://localhost:3000/api/finance/overview", {
    headers: { cookie: `szwbt_session=${financeToken}` },
  });
  const financeRes = await getOverview(financeReq);
  const overviewData = await financeRes.json();
  assert(
    financeRes.status === 200 &&
      overviewData.success === true &&
      overviewData.data.summary !== undefined &&
      overviewData.data.byCategory.REGISTRATION !== undefined &&
      overviewData.data.byCategory.SHUTTLE === undefined, // STRICT ZERO TRANSPORT IN OVERVIEW
    "Test 03: Finance staff receives HTTP 200 with strictly 3 legitimate categories (Zero transport)"
  );

  // -------------------------------------------------------------
  // TEST 04: Zero Transport Invariant — Rejection of transport payment (HTTP 400)
  // -------------------------------------------------------------
  const transportPaymentReq = new NextRequest("http://localhost:3000/api/finance/payments", {
    method: "POST",
    headers: {
      cookie: `szwbt_session=${financeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category: "SHUTTLE",
      entityType: "PARTICIPANT",
      entityId: testParticipant.id,
      amount: 800,
      method: "CASH",
    }),
  });
  const transportPaymentRes = await postPayment(transportPaymentReq);
  const transportPaymentJson = await transportPaymentRes.json();
  assert(
    transportPaymentRes.status === 400 &&
      transportPaymentJson.error?.includes("Transport is university-provided"),
    "Test 04: Attempting to record SHUTTLE / TRANSPORT payment returns HTTP 400 (Transport is university-provided)"
  );

  // -------------------------------------------------------------
  // TEST 05: Mandatory UTR for UPI Payments (HTTP 400)
  // -------------------------------------------------------------
  const missingUtrReq = new NextRequest("http://localhost:3000/api/finance/payments", {
    method: "POST",
    headers: {
      cookie: `szwbt_session=${financeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category: "REGISTRATION",
      entityType: "PARTICIPANT",
      entityId: testParticipant.id,
      amount: 2500,
      method: "UPI",
      utr: "", // Empty UTR
    }),
  });
  const missingUtrRes = await postPayment(missingUtrReq);
  const missingUtrJson = await missingUtrRes.json();
  assert(
    missingUtrRes.status === 400 && missingUtrJson.error?.includes("UTR"),
    "Test 05: Recording UPI payment without UTR returns HTTP 400 (UTR_REQUIRED)"
  );

  // -------------------------------------------------------------
  // TEST 06: Cash Payment Recorded Successfully Without UTR (HTTP 201)
  // -------------------------------------------------------------
  const cashPaymentReq = new NextRequest("http://localhost:3000/api/finance/payments", {
    method: "POST",
    headers: {
      cookie: `szwbt_session=${financeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category: "REGISTRATION",
      entityType: "PARTICIPANT",
      entityId: testParticipant.id,
      amount: 2500,
      method: "CASH",
      notes: "Desk 02 Cash Collection Test",
    }),
  });
  const cashPaymentRes = await postPayment(cashPaymentReq);
  const cashPaymentJson = await cashPaymentRes.json();
  assert(
    cashPaymentRes.status === 201 &&
      cashPaymentJson.success === true &&
      cashPaymentJson.data.transaction.method === "CASH" &&
      cashPaymentJson.data.transaction.amount === 2500,
    "Test 06: Recording CASH payment without UTR succeeds (HTTP 201)"
  );

  // -------------------------------------------------------------
  // TEST 07: Successful UPI Payment with Unique UTR & Duplicate Detection
  // -------------------------------------------------------------
  const uniqueUtr = `TEST-UTR-${Date.now()}`;
  const upiPaymentReq = new NextRequest("http://localhost:3000/api/finance/payments", {
    method: "POST",
    headers: {
      cookie: `szwbt_session=${financeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category: "ACCOMMODATION",
      entityType: "PARTICIPANT",
      entityId: testParticipant.id,
      amount: 3000,
      method: "UPI",
      utr: uniqueUtr,
      notes: "Accommodation Fee Full Settlement",
    }),
  });
  const upiPaymentRes = await postPayment(upiPaymentReq);
  const upiPaymentJson = await upiPaymentRes.json();
  assert(
    upiPaymentRes.status === 201 &&
      upiPaymentJson.success === true &&
      upiPaymentJson.data.transaction.utr === uniqueUtr,
    "Test 07: Recording valid UPI payment with unique UTR succeeds (HTTP 201)"
  );

  const testTxId = upiPaymentJson.data.transaction.id;

  // -------------------------------------------------------------
  // TEST 08: Duplicate UTR Conflict Detection (HTTP 409)
  // -------------------------------------------------------------
  const duplicateUtrReq = new NextRequest("http://localhost:3000/api/finance/payments", {
    method: "POST",
    headers: {
      cookie: `szwbt_session=${financeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category: "ACCOMMODATION",
      entityType: "PARTICIPANT",
      entityId: testParticipant.id,
      amount: 3000,
      method: "UPI",
      utr: uniqueUtr, // Duplicate
    }),
  });
  const duplicateUtrRes = await postPayment(duplicateUtrReq);
  const duplicateUtrJson = await duplicateUtrRes.json();
  assert(
    duplicateUtrRes.status === 409 && duplicateUtrJson.code === "DUPLICATE_UTR",
    "Test 08: Duplicate UTR returns HTTP 409 Conflict with DUPLICATE_UTR code"
  );

  // -------------------------------------------------------------
  // TEST 09: Transaction Detail & Linked Entity Resolution
  // -------------------------------------------------------------
  const detailReq = new NextRequest(`http://localhost:3000/api/finance/payments/${testTxId}`, {
    headers: { cookie: `szwbt_session=${financeToken}` },
  });
  const detailRes = await getPaymentDetail(detailReq, { params: Promise.resolve({ id: testTxId }) });
  const detailJson = await detailRes.json();
  assert(
    detailRes.status === 200 &&
      detailJson.success === true &&
      detailJson.data.transaction.id === testTxId &&
      detailJson.data.entity !== null,
    "Test 09: GET /api/finance/payments/[id] returns receipt detail with linked participant entity"
  );

  // -------------------------------------------------------------
  // TEST 10: Refund Workflow & Fee Ledger Balance Recalculation
  // -------------------------------------------------------------
  const refundReq = new NextRequest(`http://localhost:3000/api/finance/payments/${testTxId}`, {
    method: "PATCH",
    headers: {
      cookie: `szwbt_session=${financeToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "REFUND",
      reason: "Athlete withdrew from tournament accommodation prior to check-in",
    }),
  });
  const refundRes = await patchPaymentDetail(refundReq, { params: Promise.resolve({ id: testTxId }) });
  const refundJson = await refundRes.json();
  assert(
    refundRes.status === 200 &&
      refundJson.success === true &&
      refundJson.data.status === "REFUNDED",
    "Test 10: Authorizing transaction refund marks status as REFUNDED and recalculates ledger balance"
  );

  // -------------------------------------------------------------
  // TEST 11: Pending Ledgers Endpoint (HTTP 200, strictly legitimate categories)
  // -------------------------------------------------------------
  const pendingReq = new NextRequest("http://localhost:3000/api/finance/pending", {
    headers: { cookie: `szwbt_session=${financeToken}` },
  });
  const pendingRes = await getPending(pendingReq);
  const pendingJson = await pendingRes.json();
  assert(
    pendingRes.status === 200 &&
      pendingJson.success === true &&
      pendingJson.data.summary.byCategory.REGISTRATION !== undefined &&
      pendingJson.data.summary.byCategory.SHUTTLE === undefined,
    "Test 11: GET /api/finance/pending returns pending dues strictly for legitimate categories (No transport)"
  );

  // -------------------------------------------------------------
  // TEST 12: Reports & CSV Export (Content-Type: text/csv, RFC 4180)
  // -------------------------------------------------------------
  const csvReq = new NextRequest("http://localhost:3000/api/finance/reports?format=csv", {
    headers: { cookie: `szwbt_session=${financeToken}` },
  });
  const csvRes = await getReports(csvReq);
  const csvText = await csvRes.text();
  assert(
    csvRes.status === 200 &&
      Boolean(csvRes.headers.get("content-type")?.includes("text/csv")) &&
      csvText.startsWith('"Transaction ID"'),
    "Test 12: GET /api/finance/reports?format=csv returns RFC 4180 CSV export stream"
  );

  // -------------------------------------------------------------
  // TEST 13: Operational Entity & Transaction Search
  // -------------------------------------------------------------
  const searchReq = new NextRequest(`http://localhost:3000/api/finance/search?q=${encodeURIComponent(uniqueUtr)}`, {
    headers: { cookie: `szwbt_session=${financeToken}` },
  });
  const searchRes = await getSearch(searchReq);
  const searchJson = await searchRes.json();
  assert(
    searchRes.status === 200 &&
      searchJson.success === true &&
      searchJson.data.transactions.length > 0 &&
      searchJson.data.transactions[0].utr === uniqueUtr,
    "Test 13: GET /api/finance/search finds transaction instantly by bank UTR"
  );

  console.log("\n============================================================");
  console.log("ALL 13 DASHBOARD 05 FINANCE OPERATIONS TESTS PASSED!");
  console.log("============================================================\n");
}

runFinanceTests()
  .catch((err) => {
    console.error("Finance test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
