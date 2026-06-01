/**
 * Unit Tests: getConcallType — Private Meet Exclusion
 * Tests that private analyst/investor meets are correctly filtered out
 * while real earnings concalls still get through.
 *
 * Run: node --env-file=.env.local backend/scratch/test-unit-announcement-logic.js
 */

import { getConcallType } from "../services/announcement.service.js";

let passed = 0;
let failed = 0;

function test(label, actual, expected) {
  const ok = actual === expected;
  console.log((ok ? "✅" : "❌") + "  " + label);
  if (!ok) {
    console.log(`     Expected: ${JSON.stringify(expected)}`);
    console.log(`     Got:      ${JSON.stringify(actual)}`);
    failed++;
  } else {
    passed++;
  }
}

// ─── SHOULD BE NULL (private meets, no alert) ─────────────────────────────────

console.log("\n── Private Meets → should return null (no alert) ──────────────\n");

test(
  "Private: 'Investor/Analyst Call on 29th May' (NO results mention)",
  getConcallType("Intimation of Investor/Analyst Call on 29th May 2025"),
  null  // No earnings signal → not an earnings call
);

test(
  "Private: 'Analyst Meet' with MF/institutional",
  getConcallType("Intimation of Analyst Meet with Mutual Fund and Institutional Investors"),
  null
);

test(
  "Private: 'Investor Meeting' with fund",
  getConcallType("Intimation of Investor Meeting with ABC Mutual Fund"),
  null
);

test(
  "Private: 'One on One meeting' with investor",
  getConcallType("Schedule of one on one meeting with Institutional Investor"),
  null
);

test(
  "Private: Roadshow",
  getConcallType("Investor Roadshow - Conference Call with Goldman Sachs"),
  null
);

test(
  "Private: Analyst meet + conference call keyword but no earnings",
  getConcallType("Conference call with Analyst Meet organized by broker"),
  null
);

test(
  "Private: 'Meeting with fund managers'",
  getConcallType("Meeting with fund managers and institutional investors"),
  null
);

test(
  "Private: Generic investor call no date no results",
  getConcallType("Intimation of investor call with management"),
  null
);

// ─── SHOULD DETECT (real earnings calls) ──────────────────────────────────────

console.log("\n── Real Earnings Calls → should detect correctly ──────────────\n");

test(
  "Real: Earnings Conference Call (explicit)",
  getConcallType("Intimation of Earnings Conference Call for Q4 FY25 Results"),
  "scheduled"
);

test(
  "Real: Standard concall keyword",
  getConcallType("Intimation of Concall for Q4 FY25"),
  "scheduled"
);

test(
  "Real: Investor/Analyst Call WITH Q4 results mention",
  getConcallType("Intimation of Investor/Analyst Call on 29th May 2025 for Q4 FY25 Results"),
  "scheduled"  // Has date + earnings signal → real concall
);

test(
  "Real: Investor call WITH results mention and date",
  getConcallType("Investor Call scheduled on 10th June 2025 to discuss Q4 FY25 Results"),
  "scheduled"
);

test(
  "Real: Intimation of call for Q4 FY25",
  getConcallType("Intimation of call for Q4 FY25"),
  "scheduled"
);

test(
  "Real: Conference call scheduled",
  getConcallType("Schedule of Earnings Conference Call for Q4 FY2025"),
  "scheduled"
);

test(
  "Real: Concall transcript",
  getConcallType("Submission of concall transcript for Q4 FY25 results"),
  "transcript"
);

test(
  "Real: Audio recording of concall",
  getConcallType("Audio recording of Q4 FY25 Earnings Conference Call"),
  "audio"
);

test(
  "Real: Outcome / completed concall",
  getConcallType("Outcome of Earnings Conference Call for Q4 FY25"),
  "done"
);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n────────────────────────────────────────────────────────────────`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log(`  ✅ All tests passed!\n`);
} else {
  console.log(`  ❌ ${failed} test(s) failed — review getConcallType logic.\n`);
  process.exit(1);
}
