/**
 * Integration Test for Dashboard 02 — Registration Desk Operations
 * Tests the live operational desk APIs against localhost:3000
 */

export {};

async function main() {
  console.log("\n============================================================");
  console.log("RUNNING LIVE REGISTRATION DESK WORKFLOW INTEGRATION TESTS");
  console.log("============================================================\n");

  const baseUrl = "http://localhost:3000";
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  \x1b[32m✔ PASS\x1b[0m [${testName}]`);
      passed++;
    } else {
      console.error(`  \x1b[31m✖ FAIL\x1b[0m [${testName}] ${detail || ""}`);
      failed++;
    }
  }

  // 1. Login as Registration Staff
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: "registration@szwbt2026.edu", password: "szwbt2026pass" }),
  });
  assert(loginRes.ok, "Registration Staff login successful");
  const cookie = loginRes.headers.get("set-cookie")?.match(/szwbt_session=([^;]+)/)?.[1];
  const authHeaders = {
    cookie: `szwbt_session=${cookie}`,
    "Content-Type": "application/json",
  };

  // 2. Fetch Registration Desk KPIs & Records
  const deskRes = await fetch(`${baseUrl}/api/admin/registrations`, { headers: authHeaders });
  const deskData = await deskRes.json();
  assert(
    deskRes.ok && deskData.success && deskData.kpis !== undefined,
    "GET /api/admin/registrations returns real KPIs and registration records",
    JSON.stringify(deskData.kpis)
  );

  // 3. Duplicate Check API
  const dupCheckRes = await fetch(`${baseUrl}/api/participants/duplicate-check`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Nonexistent Athlete 999",
      email: "unique.athlete999@univ.edu",
      phone: "+91 99999 11111",
      institution: "KLE Technological University",
    }),
  });
  const dupData = await dupCheckRes.json();
  assert(
    dupCheckRes.ok && dupData.hasDuplicate === false,
    "Duplicate check returns false for unique athlete"
  );

  // 4. Document Upload API
  const sampleBase64 = "data:image/jpeg;base64," + Buffer.from("SZWBT-DOCUMENT-SAMPLE-BUFFER").toString("base64");
  const uploadRes = await fetch(`${baseUrl}/api/documents/upload`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      type: "UNIVERSITY_ID",
      fileName: "university_id_card.jpg",
      dataUrl: sampleBase64,
      mimeType: "image/jpeg",
    }),
  });
  const uploadData = await uploadRes.json();
  assert(
    uploadRes.ok && uploadData.success && uploadData.document?.status === "READY",
    "POST /api/documents/upload processes camera image and returns status: READY"
  );

  // 5. Complete Full 6-Step Registration Transaction
  const testAthleteName = `Kavya Rao ${Math.floor(100 + Math.random() * 900)}`;
  const submitRes = await fetch(`${baseUrl}/api/registration/submit`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      fullName: testAthleteName,
      email: `kavya.rao.${Date.now()}@kle.edu`,
      mobile: `+91 98451 ${Math.floor(10000 + Math.random() * 90000)}`,
      state: "Karnataka",
      institution: "KLE Technological University, Hubballi",
      isCreatingTeam: true,
      newTeamName: `KLE Hubballi Strikers ${Math.floor(10 + Math.random() * 90)}`,
      managerName: "Dr. Suresh Patil",
      managerPhone: "+91 94812 33445",
      captainName: testAthleteName,
      members: [
        {
          name: "Sanjana M",
          email: "sanjana.m@kle.edu",
          phone: "+91 94812 33446",
          institution: "KLE Technological University, Hubballi",
          role: "MEMBER",
          status: "ACCEPTED",
        },
      ],
      documents: [
        {
          id: uploadData.document.id,
          type: "UNIVERSITY_ID",
          fileName: "university_id_card.jpg",
          status: "READY",
          url: uploadData.document.url,
        },
      ],
      paymentMethod: "UPI",
      amountReceived: 2500,
      utr: `UPI${Date.now().toString().slice(-10)}`,
      feeAmount: 2500,
    }),
  });
  const submitData = await submitRes.json();
  assert(
    submitRes.ok &&
      submitData.success &&
      submitData.playerId &&
      submitData.teamQrToken &&
      submitData.teamQrToken.startsWith("sz26_qr_tm_"),
    "POST /api/registration/submit transactional registration complete with opaque Team QR token",
    JSON.stringify(submitData)
  );

  // 6. UPI Validation Check: Missing UTR Rejection
  const badUpiRes = await fetch(`${baseUrl}/api/registration/submit`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      fullName: "Test Athlete Without UTR",
      mobile: "+91 98451 00000",
      state: "Karnataka",
      institution: "KLE Technological University, Hubballi",
      paymentMethod: "UPI",
      amountReceived: 2500,
      // utr missing
    }),
  });
  assert(
    badUpiRes.status === 400,
    "UPI payment without UTR is strictly rejected with 400 Bad Request"
  );

  // 7. Verify Updated Dashboard Data
  const updatedDeskRes = await fetch(`${baseUrl}/api/admin/registrations?q=${encodeURIComponent(testAthleteName)}`, {
    headers: authHeaders,
  });
  const updatedDeskData = await updatedDeskRes.json();
  assert(
    updatedDeskRes.ok &&
      updatedDeskData.registrations.some((r: any) => r.name === testAthleteName),
    "Updated participant appears in GET /api/admin/registrations recent list"
  );

  console.log("\n============================================================");
  console.log(`REGISTRATION WORKFLOW TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
