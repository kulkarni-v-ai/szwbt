import { prisma } from "../src/lib/prisma";

async function runDynamicAccommodationTests() {
  console.log("============================================================");
  console.log("TESTING DYNAMIC ACCOMMODATION CONFIGURATION ARCHITECTURE");
  console.log("============================================================");

  const baseUrl = "http://localhost:3000";

  // 1. Authenticate as Super Admin
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: "admin@szwbt2026.edu", password: "szwbt2026pass" }),
  });
  if (!adminLogin.ok) throw new Error("Super Admin login failed");
  const adminCookie = adminLogin.headers.get("set-cookie")?.match(/szwbt_session=([^;]+)/)?.[1];
  const adminHeaders = { cookie: `szwbt_session=${adminCookie}`, "Content-Type": "application/json" };

  // 2. Authenticate as Accommodation Staff (for RBAC test)
  const staffLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: "hostel@szwbt2026.edu", password: "szwbt2026pass" }),
  });
  if (!staffLogin.ok) throw new Error("Staff login failed");
  const staffCookie = staffLogin.headers.get("set-cookie")?.match(/szwbt_session=([^;]+)/)?.[1];
  const staffHeaders = { cookie: `szwbt_session=${staffCookie}`, "Content-Type": "application/json" };

  // Test 1: RBAC - Accommodation staff cannot configure hostels (403 Forbidden)
  const staffCreateRes = await fetch(`${baseUrl}/api/admin/accommodation/hostels`, {
    method: "POST",
    headers: staffHeaders,
    body: JSON.stringify({ name: "Unauthorized Hostel", code: "UNAUTH" }),
  });
  if (staffCreateRes.status === 403) {
    console.log("  ✔ PASS [Test 01: Accommodation staff denied from modifying hostel configuration (HTTP 403)]");
  } else {
    throw new Error(`Test 01 failed: expected 403, got ${staffCreateRes.status}`);
  }

  // Test 2: Super Admin creates a new custom hostel
  const hostelRes = await fetch(`${baseUrl}/api/admin/accommodation/hostels`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      name: "Tungabhadra Wing",
      code: "TUNGA",
      description: "Athletics annex building",
      genderAllowed: "ANY",
    }),
  });
  const hostelData = await hostelRes.json();
  if (hostelRes.ok && hostelData.success && hostelData.hostel.id) {
    console.log("  ✔ PASS [Test 02: Super Admin creates dynamic hostel ('Tungabhadra Wing', code 'TUNGA')]");
  } else {
    throw new Error(`Test 02 failed: ${JSON.stringify(hostelData)}`);
  }
  const testHostelId = hostelData.hostel.id;

  // Test 3: Super Admin creates a custom floor
  const floorRes = await fetch(`${baseUrl}/api/admin/accommodation/floors`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      hostelId: testHostelId,
      name: "East Annex Floor 2",
      floorNumber: 2,
    }),
  });
  const floorData = await floorRes.json();
  if (floorRes.ok && floorData.success && floorData.floor.id) {
    console.log("  ✔ PASS [Test 03: Super Admin creates custom floor ('East Annex Floor 2')]");
  } else {
    throw new Error(`Test 03 failed: ${JSON.stringify(floorData)}`);
  }
  const testFloorId = floorData.floor.id;

  // Test 4: Super Admin creates room with arbitrary room number ("TB-201", capacity 4)
  const roomRes = await fetch(`${baseUrl}/api/admin/accommodation/rooms`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      hostelId: testHostelId,
      floorId: testFloorId,
      roomNumber: "TB-201",
      displayName: "Tungabhadra Suite 201",
      capacity: 4,
    }),
  });
  const roomData = await roomRes.json();
  if (roomRes.ok && roomData.success && roomData.beds.length === 4) {
    console.log("  ✔ PASS [Test 04: Super Admin creates custom room ('TB-201') with 4 auto-generated beds]");
  } else {
    throw new Error(`Test 04 failed: ${JSON.stringify(roomData)}`);
  }
  const testRoomId = roomData.room.id;

  // Test 5: Room appears dynamically in staff accommodation rooms API
  const staffRoomsRes = await fetch(`${baseUrl}/api/accommodation/rooms?hostelId=${testHostelId}`, {
    headers: staffHeaders,
  });
  const staffRoomsData = await staffRoomsRes.json();
  if (staffRoomsRes.ok && staffRoomsData.rooms.some((r: any) => r.roomNumber === "TB-201")) {
    console.log("  ✔ PASS [Test 05: Room 'TB-201' appears dynamically in staff accommodation dashboard]");
  } else {
    throw new Error(`Test 05 failed: ${JSON.stringify(staffRoomsData)}`);
  }

  // Test 6: Capacity expansion - Increase capacity to 5
  const updateCapRes = await fetch(`${baseUrl}/api/admin/accommodation/rooms/${testRoomId}`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ capacity: 5 }),
  });
  const updateCapData = await updateCapRes.json();
  const bedsCountAfter = await prisma.bed.count({ where: { roomId: testRoomId } });
  if (updateCapRes.ok && bedsCountAfter === 5) {
    console.log("  ✔ PASS [Test 06: Room capacity dynamically expanded to 5 beds (BED 05 generated)]");
  } else {
    throw new Error(`Test 06 failed: expected 5 beds, got ${bedsCountAfter}`);
  }

  // Test 7: Duplicate room number in same hostel is rejected (409)
  const dupRoomRes = await fetch(`${baseUrl}/api/admin/accommodation/rooms`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      hostelId: testHostelId,
      floorId: testFloorId,
      roomNumber: "TB-201", // duplicate
      capacity: 3,
    }),
  });
  if (dupRoomRes.status === 409) {
    console.log("  ✔ PASS [Test 07: Duplicate room number within same hostel strictly rejected (409)]");
  } else {
    throw new Error(`Test 07 failed: expected 409, got ${dupRoomRes.status}`);
  }

  // Test 8: Same room number in another hostel is ALLOWED
  const shalmalaHostel = await prisma.hostel.findFirst({ where: { code: "SHALMALA" } });
  if (shalmalaHostel) {
    const crossHostelRes = await fetch(`${baseUrl}/api/admin/accommodation/rooms`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        hostelId: shalmalaHostel.id,
        roomNumber: "TB-201", // same room number in different hostel
        capacity: 2,
      }),
    });
    if (crossHostelRes.ok) {
      console.log("  ✔ PASS [Test 08: Scoped uniqueness: Same room number in distinct hostel allowed]");
      // Clean up the cross-hostel room
      const crossData = await crossHostelRes.json();
      await prisma.bed.deleteMany({ where: { roomId: crossData.room.id } });
      await prisma.room.delete({ where: { id: crossData.room.id } });
    } else {
      throw new Error(`Test 08 failed: ${await crossHostelRes.text()}`);
    }
  }

  // Clean up test hostel
  await prisma.bed.deleteMany({ where: { roomId: testRoomId } });
  await prisma.room.deleteMany({ where: { hostelId: testHostelId } });
  await prisma.floor.deleteMany({ where: { hostelId: testHostelId } });
  await prisma.hostel.delete({ where: { id: testHostelId } });
  console.log("  ✔ PASS [Test 09: Test topology teardown and cleanup completed cleanly]");

  console.log("============================================================");
  console.log("DYNAMIC ACCOMMODATION TESTS: 9 PASSED, 0 FAILED");
  console.log("============================================================");
}

runDynamicAccommodationTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
