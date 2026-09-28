import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  MATCH_STATUS,
  COURT_STATUS,
  isPermissibleTransition,
  isPlaceholderSlot,
  resolveKnockoutDependencies,
} from "../src/lib/matches/lifecycle";

async function runTests() {
  console.log("============================================================");
  console.log("MATCH OPERATIONS & CSV AUDIT TEST SUITE");
  console.log("============================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✔ PASS [${name}]`);
            passed++;
          })
          .catch((err: any) => {
            console.error(`  ✘ FAIL [${name}]:`, err.message);
            failed++;
          });
      }
      console.log(`  ✔ PASS [${name}]`);
      passed++;
    } catch (err: any) {
      console.error(`  ✘ FAIL [${name}]:`, err.message);
      failed++;
    }
  }

  // 1. Lifecycle transitions
  test("Test 1: Match state machine permits legal transitions", () => {
    assert.strictEqual(isPermissibleTransition(MATCH_STATUS.SCHEDULED, MATCH_STATUS.READY), true);
    assert.strictEqual(isPermissibleTransition(MATCH_STATUS.READY, MATCH_STATUS.COURT_ASSIGNED), true);
    assert.strictEqual(isPermissibleTransition(MATCH_STATUS.COURT_ASSIGNED, MATCH_STATUS.READY_TO_START), true);
    assert.strictEqual(isPermissibleTransition(MATCH_STATUS.READY_TO_START, MATCH_STATUS.LIVE), true);
    assert.strictEqual(isPermissibleTransition(MATCH_STATUS.LIVE, MATCH_STATUS.PAUSED), true);
    assert.strictEqual(isPermissibleTransition(MATCH_STATUS.PAUSED, MATCH_STATUS.LIVE), true);
    assert.strictEqual(isPermissibleTransition(MATCH_STATUS.MATCH_ENDED, MATCH_STATUS.RESULT_SUBMITTED), true);
    assert.strictEqual(isPermissibleTransition(MATCH_STATUS.RESULT_SUBMITTED, MATCH_STATUS.RESULT_CONFIRMED), true);
    assert.strictEqual(isPermissibleTransition(MATCH_STATUS.RESULT_CONFIRMED, MATCH_STATUS.COMPLETED), true);
  });

  // 2. Knockout placeholder detection
  test("Test 2: System accurately identifies knockout placeholder slots", () => {
    assert.strictEqual(isPlaceholderSlot("TBA"), true);
    assert.strictEqual(isPlaceholderSlot("TBD"), true);
    assert.strictEqual(isPlaceholderSlot("WINNER OF R1-M01"), true);
    assert.strictEqual(isPlaceholderSlot("WINNER_OF_MATCH_1042"), true);
    assert.strictEqual(isPlaceholderSlot("LOSER OF SF-01"), true);
    assert.strictEqual(isPlaceholderSlot("W/O R1-M02"), true);

    // Resolved athletes
    assert.strictEqual(isPlaceholderSlot("Ananya Sharma"), false);
    assert.strictEqual(isPlaceholderSlot("Pooja Hegde"), false);
    assert.strictEqual(isPlaceholderSlot("Deepika Rao"), false);
  });

  // 3. Knockout bracket downstream propagation
  await test("Test 3: Concluding a match automatically propagates winner to dependent knockout matches", async () => {
    const futureMatches = [
      {
        id: "match-qf-1",
        matchNumber: "QF-M01",
        playerA: "WINNER OF R1-M01",
        institutionA: "TBD",
        playerB: "WINNER OF R1-M02",
        institutionB: "TBD",
        status: "SCHEDULED",
      },
    ];

    const mockTx = {
      match: {
        findMany: async () => futureMatches,
        update: async ({ where, data }: any) => {
          const match = futureMatches.find((m) => m.id === where.id);
          if (match) Object.assign(match, data);
          return match;
        },
      },
    };

    // Step A: Win R1-M01
    const count1 = await resolveKnockoutDependencies(mockTx, {
      id: "m-r1-1",
      matchNumber: "R1-M01",
      winner: "PLAYER_A",
      playerA: "Ananya Sharma",
      institutionA: "KLE Technological University",
      playerB: "Pooja Hegde",
      institutionB: "Bangalore University",
    });

    assert.strictEqual(count1, 1);
    assert.strictEqual(futureMatches[0].playerA, "Ananya Sharma");
    assert.strictEqual(futureMatches[0].institutionA, "KLE Technological University");
    assert.strictEqual(futureMatches[0].status, "SCHEDULED"); // waiting for Slot B

    // Step B: Win R1-M02
    const count2 = await resolveKnockoutDependencies(mockTx, {
      id: "m-r1-2",
      matchNumber: "R1-M02",
      winner: "PLAYER_A",
      playerA: "Deepika Rao",
      institutionA: "Anna University",
      playerB: "Kavya Nair",
      institutionB: "University of Kerala",
    });

    assert.strictEqual(count2, 1);
    assert.strictEqual(futureMatches[0].playerB, "Deepika Rao");
    assert.strictEqual(futureMatches[0].institutionB, "Anna University");
    // Both slots now resolved -> must automatically promote to READY
    assert.strictEqual(futureMatches[0].status, "READY");
  });

  // 4. CSV Directory & Templates Validation
  const examplesDir = path.resolve(__dirname, "../docs/csv-examples");

  test("Test 4: docs/csv-examples directory and README.md exist", () => {
    assert.strictEqual(fs.existsSync(examplesDir), true);
    assert.strictEqual(fs.existsSync(path.join(examplesDir, "README.md")), true);
  });

  test("Test 5: All 10 discovered synthetic CSV examples exist and are valid", () => {
    const requiredFiles = [
      "institutions/university_master_template.csv",
      "tournament/tournament_schedule_template.csv",
      "tournament/match_results_export_example.csv",
      "registration/team_contingents_export_example.csv",
      "registration/participants_roster_export_example.csv",
      "accommodation/hostel_bed_inventory_export_example.csv",
      "transport/transport_manifest_export_example.csv",
      "finance/finance_ledger_export_example.csv",
      "reports/support_tickets_export_example.csv",
      "reports/audit_logs_export_example.csv",
    ];

    for (const relPath of requiredFiles) {
      const fullPath = path.join(examplesDir, relPath);
      assert.strictEqual(fs.existsSync(fullPath), true, `Missing file: ${relPath}`);
      const content = fs.readFileSync(fullPath, "utf-8").trim();
      assert.strictEqual(content.length > 0, true);
      const lines = content.split(/\r?\n/);
      assert.strictEqual(lines.length > 1, true);
    }
  });

  test("Test 6: University Master CSV schema matches exact database parser requirements", () => {
    const content = fs.readFileSync(
      path.join(examplesDir, "institutions/university_master_template.csv"),
      "utf-8"
    );
    const [headerLine] = content.split(/\r?\n/);
    const headers = headerLine.split(",");
    assert.strictEqual(headers.includes("institution_code"), true);
    assert.strictEqual(headers.includes("university_name"), true);
    assert.strictEqual(headers.includes("state"), true);
  });

  test("Test 7: Transport CSV strictly enforces Zero-Payment policy", () => {
    const content = fs.readFileSync(
      path.join(examplesDir, "transport/transport_manifest_export_example.csv"),
      "utf-8"
    );
    assert.strictEqual(content.includes("COMPLIMENTARY_UNIVERSITY_SERVICE"), true);
    assert.strictEqual(content.includes("amount_due"), false);
  });

  test("Test 8: Team Contingents CSV reflects 5-athlete max squad size", () => {
    const content = fs.readFileSync(
      path.join(examplesDir, "registration/team_contingents_export_example.csv"),
      "utf-8"
    );
    const rows = content.split(/\r?\n/).slice(1);
    for (const row of rows) {
      if (!row.trim()) continue;
      const cols = row.split(",");
      const memberCount = parseInt(cols[6], 10);
      assert.strictEqual(memberCount <= 5, true);
    }
  });

  console.log("\n------------------------------------------------------------");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("------------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
