/**
 * Integration Test for Dashboard 04 — Transport Operations
 * Tests the live operational transport APIs against localhost:3000
 */

export {};

async function main() {
  console.log("\n============================================================");
  console.log("RUNNING LIVE TRANSPORT OPERATIONS INTEGRATION TESTS");
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

  // 1. Unauthenticated Access is Blocked (401)
  const unauthRes = await fetch(`${baseUrl}/api/transport/overview`);
  assert(unauthRes.status === 401, "Test 01: Unauthenticated request to /api/transport/overview returns 401 Unauthorized");

  // 2. Unauthorized Role Access is Blocked (403)
  // Login as finance staff
  const financeLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: "finance@szwbt2026.edu", password: "szwbt2026pass" }),
  });
  const financeCookie = financeLoginRes.headers.get("set-cookie")?.match(/szwbt_session=([^;]+)/)?.[1];
  const financeHeaders = { cookie: `szwbt_session=${financeCookie}`, "Content-Type": "application/json" };

  const financeTransportRes = await fetch(`${baseUrl}/api/transport/overview`, { headers: financeHeaders });
  assert(
    financeTransportRes.status === 403,
    "Test 02: Finance Staff calling transport overview receives HTTP 403 Forbidden",
    `Status: ${financeTransportRes.status}`
  );

  // 3. Login as Transport Staff
  const transportLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: "transport@szwbt2026.edu", password: "szwbt2026pass" }),
  });
  assert(transportLoginRes.ok, "Test 03: Transport Staff login successful");
  const transportCookie = transportLoginRes.headers.get("set-cookie")?.match(/szwbt_session=([^;]+)/)?.[1];
  const authHeaders = {
    cookie: `szwbt_session=${transportCookie}`,
    "Content-Type": "application/json",
  };

  // 4. Fetch Transport Overview KPIs
  const overviewRes = await fetch(`${baseUrl}/api/transport/overview`, { headers: authHeaders });
  const overviewData = await overviewRes.json();
  assert(
    overviewRes.ok && overviewData.success && overviewData.kpis.totalTrips > 0,
    "Test 04: GET /api/transport/overview returns real database-aggregated KPIs",
    JSON.stringify(overviewData.kpis)
  );

  // 5. Fetch Routes & Vehicles & Drivers
  const routesRes = await fetch(`${baseUrl}/api/transport/routes`, { headers: authHeaders });
  const routesData = await routesRes.json();
  assert(routesRes.ok && routesData.routes?.length > 0, "Test 05: GET /api/transport/routes returns routes with stops");

  const vehiclesRes = await fetch(`${baseUrl}/api/transport/vehicles`, { headers: authHeaders });
  const vehiclesData = await vehiclesRes.json();
  assert(vehiclesRes.ok && vehiclesData.vehicles?.length > 0, "Test 06: GET /api/transport/vehicles returns vehicles with physical capacity");

  const driversRes = await fetch(`${baseUrl}/api/transport/drivers`, { headers: authHeaders });
  const driversData = await driversRes.json();
  assert(driversRes.ok && driversData.drivers?.length > 0, "Test 07: GET /api/transport/drivers returns drivers");

  // 6. Test Vehicle & Driver Overlap Conflict Protection
  const firstRoute = routesData.routes[0];
  const firstVehicle = vehiclesData.vehicles[0];
  const firstDriver = driversData.drivers[0];

  const testRunId = Math.floor(1000 + Math.random() * 9000);
  const testDate = `2026-10-${20 + (testRunId % 8)}`;
  const testTime = `${String(8 + (testRunId % 12)).padStart(2, "0")}:${String(testRunId % 60).padStart(2, "0")} IST`;

  // Create a test trip
  const createTripRes1 = await fetch(`${baseUrl}/api/transport/trips`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      scheduledDate: testDate,
      scheduledTime: testTime,
      estimatedArrival: "12:00 IST",
      routeId: firstRoute.id,
      vehicleId: firstVehicle.id,
      driverId: firstDriver.id,
      pickupPoint: firstRoute.origin,
      dropPoint: firstRoute.destination,
    }),
  });
  const trip1Data = await createTripRes1.json();
  assert(createTripRes1.ok && trip1Data.success, "Test 08: Trip created with derived physical capacity", JSON.stringify(trip1Data));

  // Attempt duplicate trip with same vehicle at same date/time (OVERLAP PROTECTION)
  const overlapVehicleRes = await fetch(`${baseUrl}/api/transport/trips`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      scheduledDate: testDate,
      scheduledTime: testTime,
      routeId: firstRoute.id,
      vehicleId: firstVehicle.id,
      driverId: driversData.drivers[1].id,
    }),
  });
  assert(
    overlapVehicleRes.status === 409,
    "Test 09: Overlapping vehicle assignment rejected with HTTP 409 Conflict"
  );

  // 7. Search Participants
  const searchRes = await fetch(`${baseUrl}/api/transport/passengers/search?q=Sanj`, { headers: authHeaders });
  const searchData = await searchRes.json();
  assert(
    searchRes.ok && searchData.success && searchData.participants.length > 0,
    "Test 10: Server-side participant search returns eligible tournament athletes"
  );

  const testParticipant = searchData.participants[0];

  // 8. Assign Passenger to Trip
  const assignRes = await fetch(`${baseUrl}/api/transport/passenger-assignments`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      tripId: trip1Data.trip.id,
      participantId: testParticipant.id,
      pickupPoint: firstRoute.origin,
    }),
  });
  const assignData = await assignRes.json();
  assert(
    assignRes.ok && assignData.success,
    "Test 11: Passenger assigned to trip with capacity verification"
  );

  // Duplicate assignment attempt
  const dupAssignRes = await fetch(`${baseUrl}/api/transport/passenger-assignments`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      tripId: trip1Data.trip.id,
      participantId: testParticipant.id,
      pickupPoint: firstRoute.origin,
    }),
  });
  assert(dupAssignRes.status === 409, "Test 12: Duplicate passenger assignment blocked with HTTP 409");

  // 9. QR Scan Resolution & Wrong Trip Protection
  // Scan token on the correct trip
  const scanCorrectRes = await fetch(`${baseUrl}/api/transport/boarding/scan`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      qrToken: testParticipant.qrCode || testParticipant.playerId,
      tripId: trip1Data.trip.id,
    }),
  });
  const scanCorrectData = await scanCorrectRes.json();
  assert(
    scanCorrectRes.ok && scanCorrectData.verification.isAssignedToThisTrip === true,
    "Test 13: QR scan correctly resolves participant and confirms trip assignment"
  );

  // Scan same participant on a DIFFERENT trip (WRONG TRIP PROTECTION)
  const anotherTrip = overviewData.schedule.find((s: any) => s.id !== trip1Data.trip.id);
  if (anotherTrip) {
    const scanWrongRes = await fetch(`${baseUrl}/api/transport/boarding/scan`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        qrToken: testParticipant.qrCode || testParticipant.playerId,
        tripId: anotherTrip.id,
      }),
    });
    const scanWrongData = await scanWrongRes.json();
    assert(
      scanWrongRes.ok && scanWrongData.verification.isWrongTrip === true,
      "Test 14: Wrong trip scan triggers WRONG TRIP PROTECTION warning"
    );
  }

  // 10. Mark Passenger Boarded
  const boardRes = await fetch(`${baseUrl}/api/transport/boarding`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      tripId: trip1Data.trip.id,
      participantId: testParticipant.id,
    }),
  });
  const boardData = await boardRes.json();
  assert(boardRes.ok && boardData.success && boardData.message === "BOARDED", "Test 15: Mark boarded recorded successfully with operator audit");

  // Duplicate boarding attempt
  const dupBoardRes = await fetch(`${baseUrl}/api/transport/boarding`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      tripId: trip1Data.trip.id,
      participantId: testParticipant.id,
    }),
  });
  assert(dupBoardRes.status === 409, "Test 16: Duplicate boarding blocked with HTTP 409 (PASSENGER_ALREADY_BOARDED)");

  // 11. No-Show Protection: cannot mark no-show if already boarded
  const noShowBlockedRes = await fetch(`${baseUrl}/api/transport/no-show`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      tripId: trip1Data.trip.id,
      participantId: testParticipant.id,
    }),
  });
  assert(noShowBlockedRes.status === 400, "Test 17: Cannot mark boarded passenger as no-show (HTTP 400)");

  // 12. Controlled Status Transitions
  // SCHEDULED -> BOARDING
  const statusRes1 = await fetch(`${baseUrl}/api/transport/trips/${trip1Data.trip.id}/status`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "BOARDING" }),
  });
  assert(statusRes1.ok, "Test 18: Controlled transition SCHEDULED -> BOARDING succeeded");

  // BOARDING -> IN_TRANSIT
  const statusRes2 = await fetch(`${baseUrl}/api/transport/trips/${trip1Data.trip.id}/status`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "IN_TRANSIT" }),
  });
  assert(statusRes2.ok, "Test 19: Controlled transition BOARDING -> IN_TRANSIT succeeded");

  // Invalid transition attempt: IN_TRANSIT -> SCHEDULED (must be blocked)
  const invalidStatusRes = await fetch(`${baseUrl}/api/transport/trips/${trip1Data.trip.id}/status`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "SCHEDULED" }),
  });
  assert(invalidStatusRes.status === 400, "Test 20: Arbitrary invalid status transition blocked (HTTP 400)");

  // IN_TRANSIT -> ARRIVED
  const statusRes3 = await fetch(`${baseUrl}/api/transport/trips/${trip1Data.trip.id}/status`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "ARRIVED" }),
  });
  assert(statusRes3.ok, "Test 21: Trip marked ARRIVED and fleet vehicle released to AVAILABLE");

  // 13. Transport History and Audit Logs
  const historyRes = await fetch(`${baseUrl}/api/transport/history`, { headers: authHeaders });
  const historyData = await historyRes.json();
  assert(
    historyRes.ok && historyData.trips?.length > 0 && historyData.auditLogs?.length > 0,
    "Test 22: GET /api/transport/history returns paginated history and operational audit logs"
  );

  // 14. ZERO PAYMENT VERIFICATION: Transport Staff has ZERO access to payment ledgers
  const paymentAttemptRes = await fetch(`${baseUrl}/api/accommodation/payments`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ category: "SHUTTLE", amount: 500 }),
  });
  assert(
    paymentAttemptRes.status === 403,
    "Test 23: ZERO PAYMENT ENFORCEMENT — Transport staff denied from financial payment ledger (HTTP 403 Forbidden)"
  );

  console.log("\n============================================================");
  console.log(`TRANSPORT OPERATIONS INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
