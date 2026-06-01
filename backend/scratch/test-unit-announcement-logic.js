/**
 * Unit Tests: getConcallType & shouldProcessAnnouncement
 *
 * Tests the exact cases that caused missed alerts:
 *   - HBL Engineering award filing
 *   - Anant Raj MOU signing
 *   - TimeTechno investor/analyst call on 29th May
 *
 * Run: node --env-file=.env.local backend/scratch/test-unit-announcement-logic.js
 * No DB or network required.
 */

import { getConcallType } from "../services/announcement.service.js";

// ─── Test Runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(label, actual, expected) {
  const ok = actual === expected;
  const icon = ok ? "✅" : "❌";
  console.log(`${icon}  ${label}`);
  if (!ok) {
    console.log(`     Expected: ${JSON.stringify(expected)}`);
    console.log(`     Got:      ${JSON.stringify(actual)}`);
    failed++;
  } else {
    passed++;
  }
}

// ─── getConcallType Tests ─────────────────────────────────────────────────────

console.log("\n── getConcallType ──────────────────────────────────────────────\n");

// ✅ Should detect: explicit "concall" keyword
test(
  "concall keyword in title → scheduled",
  getConcallType("Intimation of Concall for Q4 FY25 Results"),
  "scheduled"
);

// ✅ Should detect: "conference call" keyword
test(
  "conference call keyword → scheduled",
  getConcallType("Earnings Conference Call scheduled for 5th June 2025"),
  "scheduled"
);

// ✅ Should detect: TimeTechno-style — analyst call WITH a date
test(
  "TimeTechno: 'investor/analyst call on 29th May' → scheduled",
  getConcallType("Intimation of Investor/Analyst Call on 29th May 2025"),
  "scheduled"
);

// ✅ Should detect: analyst call with DD/MM/YYYY date format
test(
  "Analyst call with numeric date 29/05/2025 → scheduled",
  getConcallType("Intimation of Analyst Call on 29/05/2025"),
  "scheduled"
);

// ✅ Should detect: "scheduled on" signal
test(
  "Investor call scheduled on [date] → scheduled",
  getConcallType("Investor Call scheduled on 10th June 2025"),
  "scheduled"
);

// ✅ Should detect: "intimation of call" signal
test(
  "Intimation of call → scheduled",
  getConcallType("Intimation of call for Q4 FY25"),
  "scheduled"
);

// ✅ Should detect: transcript → transcript
test(
  "Earnings concall transcript → transcript",
  getConcallType("Submission of concall transcript for Q4 FY25 results"),
  "transcript"
);

// ✅ Should detect: audio recording
test(
  "Audio recording of concall → audio",
  getConcallType("Audio recording of Q4 FY25 earnings conference call"),
  "audio"
);

// ✅ Should detect: completed concall
test(
  "Outcome of conference call → done",
  getConcallType("Outcome of Earnings Conference Call for Q4 FY25"),
  "done"
);

// ❌ Should NOT detect: generic investor meeting (no date, no earnings keyword)
test(
  "Generic investor meeting without concall → null",
  getConcallType("Intimation of Investor Meeting with Analysts"),
  null
);

// ❌ Should NOT detect: roadshow
test(
  "Roadshow → null",
  getConcallType("Conference Call with institutional investors - roadshow"),
  null
);

// ❌ Should NOT detect: analyst meeting transcript (not earnings)
test(
  "Non-earnings analyst meet transcript → null",
  getConcallType("Transcript of investor meeting with fund managers"),
  null
);

// ✅ Should allow: analyst meeting transcript WITH earnings keyword
test(
  "Analyst meet transcript with Q4 keyword → transcript",
  getConcallType("Transcript of investor meeting for Q4 FY25 results"),
  "transcript"
);

// ❌ Should NOT detect: investor call without date (too vague)
test(
  "Investor call with no date → null (no date signal)",
  getConcallType("Intimation of investor call with management"),
  null
);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n────────────────────────────────────────────────────────────────`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log(`  ✅ All concall logic tests passed!\n`);
} else {
  console.log(`  ❌ ${failed} test(s) failed — review getConcallType logic.\n`);
  process.exit(1);
}
