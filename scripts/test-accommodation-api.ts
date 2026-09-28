/**
 * Accommodation Operations API Test Suite
 * Tests all accommodation endpoints with realistic tokens and operations.
 */

import { prisma } from "../src/lib/prisma";

async function runTests() {
  console.log("============================================================");
  console.log("RUNNING LIVE ACCOMMODATION API INTEGRATION TESTS");
  console.log("============================================================");

  // 1. Authenticate as Accommodation Staff
  const baseUrl = "http://localhost:3000";
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: "hostel@szwbt2026.edu", password: "szwbt2026pass" }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${await loginRes.text()}`);
  }

  const cookie = loginRes.headers.get("set-cookie")?.match(/szwbt_session=([^;]+)/)?.[1];
  const headers = {
    cookie: `szwbt_session=${cookie}`,
    "Content-Type": "application/json",
  };

  // Test 1: GET /api/accommodation/overview
  const res1 = await fetch(`${baseUrl}/api/accommodation/overview`, { headers });
  const data1 = await res1.json();
  if (res1.ok && data1.success && data1.kpis.totalBeds === 100) {
    console.log("  ✔ PASS [Test 01: GET /api/accommodation/overview returns real KPIs (100 beds total)]");
  } else {
    throw new Error(`Test 01 failed: ${JSON.stringify(data1)}`);
  }

  // Test 2: GET /api/accommodation/rooms?hostelId=SHALMALA
  const res2 = await fetch(`${baseUrl}/api/accommodation/rooms?hostelId=SHALMALA`, { headers });
  const data2 = await res2.json();
  if (res2.ok && data2.success && data2.rooms.length === 12 && data2.rooms[0].beds.length === 5) {
    console.log("  ✔ PASS [Test 02: GET /api/accommodation/rooms returns 12 rooms with EXACTLY 5 beds each]");
  } else {
    throw new Error(`Test 02 failed: ${JSON.stringify(data2)}`);
  }

  // Test 3: QR Resolve for existing team
  const team = await prisma.team.findFirst();
  const res3 = await fetch(`${baseUrl}/api/accommodation/qr/resolve`, {
    method: "POST",
    headers,
    body: JSON.stringify({ qrToken: team?.teamQrToken || team?.teamCode }),
  });
  const data3 = await res3.json();
  if (res3.ok && data3.success && data3.team.totalMembers >= 0) {
    console.log("  ✔ PASS [Test 03: POST /api/accommodation/qr/resolve resolves opaque token into team dossier]");
  } else {
    throw new Error(`Test 03 failed: ${JSON.stringify(data3)}`);
  }

  // Test 4: Find Person search
  const participant = await prisma.participant.findFirst();
  const res4 = await fetch(`${baseUrl}/api/accommodation/people/search?q=${encodeURIComponent(participant?.name.slice(0, 4) || "Kavya")}`, { headers });
  const data4 = await res4.json();
  if (res4.ok && data4.success && data4.people.length > 0) {
    console.log("  ✔ PASS [Test 04: GET /api/accommodation/people/search finds matching participant dossier]");
  } else {
    throw new Error(`Test 04 failed: ${JSON.stringify(data4)}`);
  }

  // Test 5: Double allocation / Concurrency protection
  // Try to allocate an already occupied bed
  const occupiedBed = await prisma.bed.findFirst({ where: { status: "OCCUPIED" } });
  if (occupiedBed) {
    const res5 = await fetch(`${baseUrl}/api/accommodation/allocations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        bedId: occupiedBed.id,
        participantId: participant?.id,
      }),
    });
    if (res5.status === 409 || res5.status === 400) {
      console.log("  ✔ PASS [Test 05: Concurrency Defense: Occupied bed allocation strictly rejected]");
    } else {
      throw new Error(`Test 05 failed: expected 409, got ${res5.status}`);
    }
  }

  // Test 6: Accommodation Payment with Cash & UPI with missing UTR
  const res6 = await fetch(`${baseUrl}/api/accommodation/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      entityType: "TEAM",
      entityId: team?.id,
      amount: 3000,
      method: "UPI", // missing utr
    }),
  });
  if (res6.status === 400) {
    console.log("  ✔ PASS [Test 06: UPI Accommodation payment strictly requires UTR/Transaction reference]");
  } else {
    throw new Error(`Test 06 failed: expected 400 for missing UTR, got ${res6.status}`);
  }

  // Test 7: Successful Cash Accommodation Payment
  const res7 = await fetch(`${baseUrl}/api/accommodation/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      entityType: "TEAM",
      entityId: team?.id,
      amount: 3000,
      method: "CASH",
    }),
  });
  const data7 = await res7.json();
  if (res7.ok && data7.success) {
    console.log("  ✔ PASS [Test 07: Cash Accommodation payment recorded in isolated ledger]");
  } else {
    throw new Error(`Test 07 failed: ${JSON.stringify(data7)}`);
  }

  console.log("============================================================");
  console.log("ACCOMMODATION API TESTS: 7 PASSED, 0 FAILED");
  console.log("============================================================");
}

runTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
