/**
 * End-to-End Live HTTP Route & RBAC URL Security Validation
 * Tests real HTTP calls against the running Next.js dev server on localhost:3000.
 */

export {};

async function main() {
  console.log("\n============================================================");
  console.log("RUNNING LIVE HTTP ROUTE & URL SECURITY TESTS (LOCALHOST:3000)");
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

  async function login(credential: string, password = "szwbt2026pass"): Promise<string> {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential, password }),
    });
    if (!res.ok) {
      throw new Error(`Login failed for ${credential}: ${res.statusText}`);
    }
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) {
      throw new Error(`No set-cookie returned for ${credential}`);
    }
    // Extract szwbt_session cookie value
    const match = setCookie.match(/szwbt_session=([^;]+)/);
    if (!match) {
      throw new Error(`szwbt_session cookie not found in set-cookie header`);
    }
    return `szwbt_session=${match[1]}`;
  }

  // 1. Unauthenticated attempts on protected routes
  console.log("--- 1. UNAUTHENTICATED REQUESTS ---");
  const unauthRes = await fetch(`${baseUrl}/admin/finance`, { redirect: "manual" });
  assert(
    unauthRes.status === 307 && (unauthRes.headers.get("location") || "").includes("/login?returnTo="),
    "Unauthenticated access to /admin/finance redirects to /login with returnTo parameter",
    `Got status ${unauthRes.status}, location: ${unauthRes.headers.get("location")}`
  );

  // 2. Registration Staff Flow
  console.log("\n--- 2. REGISTRATION STAFF FLOW ---");
  const regCookie = await login("registration@szwbt2026.edu");

  // Allowed: /admin/registrations
  const regRes = await fetch(`${baseUrl}/admin/registrations`, {
    headers: { cookie: regCookie },
    redirect: "manual",
  });
  assert(
    regRes.status === 200,
    "Registration Staff accessing /admin/registrations returns 200 OK (ALLOW)",
    `Got status ${regRes.status}`
  );

  // URL Manipulation: Change URL to /admin/finance
  const regToFinRes = await fetch(`${baseUrl}/admin/finance`, {
    headers: { cookie: regCookie },
    redirect: "manual",
  });
  assert(
    regToFinRes.status === 307 && (regToFinRes.headers.get("location") || "").includes("/403"),
    "Registration Staff changing URL to /admin/finance is blocked with redirect to /403 (DENY)",
    `Got status ${regToFinRes.status}, location: ${regToFinRes.headers.get("location")}`
  );

  // URL Manipulation: Change URL to /admin/accommodation
  const regToAccomRes = await fetch(`${baseUrl}/admin/accommodation`, {
    headers: { cookie: regCookie },
    redirect: "manual",
  });
  assert(
    regToAccomRes.status === 307 && (regToAccomRes.headers.get("location") || "").includes("/403"),
    "Registration Staff changing URL to /admin/accommodation is blocked with redirect to /403 (DENY)",
    `Got status ${regToAccomRes.status}, location: ${regToAccomRes.headers.get("location")}`
  );

  // URL Manipulation: Change URL to /admin/live
  const regToLiveRes = await fetch(`${baseUrl}/admin/live`, {
    headers: { cookie: regCookie },
    redirect: "manual",
  });
  assert(
    regToLiveRes.status === 307 && (regToLiveRes.headers.get("location") || "").includes("/403"),
    "Registration Staff changing URL to /admin/live is blocked with redirect to /403 (DENY)",
    `Got status ${regToLiveRes.status}, location: ${regToLiveRes.headers.get("location")}`
  );

  // API Direct Access: Call GET /api/finance/payments directly
  const regApiFinRes = await fetch(`${baseUrl}/api/finance/payments`, {
    headers: { cookie: regCookie },
  });
  assert(
    regApiFinRes.status === 403,
    "Registration Staff calling GET /api/finance/payments directly receives HTTP 403 Forbidden",
    `Got status ${regApiFinRes.status}`
  );

  // 3. Finance Staff Flow
  console.log("\n--- 3. FINANCE STAFF FLOW ---");
  const finCookie = await login("finance@szwbt2026.edu");

  // Allowed: /admin/finance
  const finRes = await fetch(`${baseUrl}/admin/finance`, {
    headers: { cookie: finCookie },
    redirect: "manual",
  });
  assert(
    finRes.status === 200,
    "Finance Staff accessing /admin/finance returns 200 OK (ALLOW)",
    `Got status ${finRes.status}`
  );

  // URL Manipulation: Change URL to /admin/accommodation
  const finToAccomRes = await fetch(`${baseUrl}/admin/accommodation`, {
    headers: { cookie: finCookie },
    redirect: "manual",
  });
  assert(
    finToAccomRes.status === 307 && (finToAccomRes.headers.get("location") || "").includes("/403"),
    "Finance Staff changing URL to /admin/accommodation is blocked with redirect to /403 (DENY)",
    `Got status ${finToAccomRes.status}, location: ${finToAccomRes.headers.get("location")}`
  );

  // API Direct Access: Call GET /api/finance/payments
  const finApiRes = await fetch(`${baseUrl}/api/finance/payments`, {
    headers: { cookie: finCookie },
  });
  assert(
    finApiRes.status === 200,
    "Finance Staff calling GET /api/finance/payments returns HTTP 200 OK",
    `Got status ${finApiRes.status}`
  );

  // 4. Participant Flow
  console.log("\n--- 4. PARTICIPANT ATHLETE FLOW ---");
  const partCookie = await login("player@szwbt2026.edu");

  // Allowed: /dashboard
  const partRes = await fetch(`${baseUrl}/dashboard`, {
    headers: { cookie: partCookie },
    redirect: "manual",
  });
  assert(
    partRes.status === 200,
    "Participant accessing /dashboard returns 200 OK (ALLOW)",
    `Got status ${partRes.status}`
  );

  // URL Manipulation: Participant attempts /admin
  const partToAdminRes = await fetch(`${baseUrl}/admin`, {
    headers: { cookie: partCookie },
    redirect: "manual",
  });
  assert(
    partToAdminRes.status === 307 && (partToAdminRes.headers.get("location") || "").includes("/403"),
    "Participant changing URL to /admin is blocked with redirect to /403 (DENY)",
    `Got status ${partToAdminRes.status}, location: ${partToAdminRes.headers.get("location")}`
  );

  // API Direct Access: Participant calls GET /api/admin/registrations
  const partApiRegRes = await fetch(`${baseUrl}/api/admin/registrations`, {
    headers: { cookie: partCookie },
  });
  assert(
    partApiRegRes.status === 403,
    "Participant calling GET /api/admin/registrations receives HTTP 403 Forbidden",
    `Got status ${partApiRegRes.status}`
  );

  // 5. Super Admin Flow
  console.log("\n--- 5. SUPER ADMIN FLOW ---");
  const superCookie = await login("admin@szwbt2026.edu");

  const superAdminRes = await fetch(`${baseUrl}/admin`, {
    headers: { cookie: superCookie },
    redirect: "manual",
  });
  const superFinRes = await fetch(`${baseUrl}/admin/finance`, {
    headers: { cookie: superCookie },
    redirect: "manual",
  });
  const superRegRes = await fetch(`${baseUrl}/admin/registrations`, {
    headers: { cookie: superCookie },
    redirect: "manual",
  });
  assert(
    superAdminRes.status === 200 && superFinRes.status === 200 && superRegRes.status === 200,
    "Super Admin possesses authorized access across /admin, /admin/finance, and /admin/registrations (ALLOW)",
    `Statuses: /admin=${superAdminRes.status}, /finance=${superFinRes.status}, /reg=${superRegRes.status}`
  );

  // 6. Dedicated /403 Forbidden Page Check
  console.log("\n--- 6. FORBIDDEN PAGE CHECK ---");
  const forbiddenPageRes = await fetch(`${baseUrl}/403?route=/admin/finance&required=finance:read`);
  const forbiddenHtml = await forbiddenPageRes.text();
  assert(
    forbiddenPageRes.status === 200 &&
      forbiddenHtml.includes("ACCESS DENIED") &&
      forbiddenHtml.includes("403") &&
      forbiddenHtml.includes("INSUFFICIENT") &&
      forbiddenHtml.includes("CLEARANCE"),
    "Dedicated /403 Forbidden Page renders with 'ACCESS DENIED', '403', and 'INSUFFICIENT CLEARANCE'"
  );

  console.log("\n============================================================");
  console.log(`LIVE HTTP SECURITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
