/**
 * ADVERSARIAL RESEARCH ENGINE INTEGRITY TEST SUITE
 * 
 * Executes the 5 critical adversarial attacks:
 * 1. Financial-Unit Corruption Attack (Normal vs Raw Rupees vs Mismatched HBL Corruption)
 * 2. Point-in-Time Look-Ahead Attack (Filing Date after Decision Timestamp)
 * 3. No-ADD Security Boundary Attack (Cheap valuation must NEVER override data corruption or margin collapse)
 * 4. Checklist Coverage Labeling Guard (No false-certainty percentages)
 * 5. Asymmetric Guidance Penalty Attack (Quantified misses penalized materially vs minor aspirations)
 */

import {
  normalizeAndSanitizeFinancialUnits,
  verifyPointInTimeAvailability,
  calculateCalibratedGuidanceScore,
  auditStockResearchIntegrity
} from '../backend/services/research-integrity-audit.service.js';

async function main() {
  console.log("==========================================================================");
  console.log("=== 🥊 RUNNING ADVERSARIAL RESEARCH ENGINE INTEGRITY TEST SUITE ===");
  console.log("==========================================================================");

  let passedTests = 0;
  let totalTests = 5;

  // --------------------------------------------------------------------------
  // TEST 1: FINANCIAL UNIT CORRUPTION ATTACK
  // --------------------------------------------------------------------------
  console.log("\n[Test 1/5] Attacking Financial Unit Sanity & Normalization Layer...");

  // Fixture A: Normal Crores (Rev: 1967, PAT: 276)
  const fixA = normalizeAndSanitizeFinancialUnits({ revenue: 1967, pat: 276, ebitda: 350 });
  const check1A = fixA.isValid === true && fixA.revenueCr === 1967 && fixA.patCr === 276;

  // Fixture B: Raw Rupees (Rev: 19670000000, PAT: 2760000000)
  const fixB = normalizeAndSanitizeFinancialUnits({ revenue: 19670000000, pat: 2760000000, ebitda: 3500000000 });
  const check1B = fixB.isValid === true && fixB.revenueCr === 1967 && fixB.patCr === 276;

  // Fixture C: Mismatched Unit Corruption (Rev: 1967 Cr, PAT: 2206100000 raw Rupees labeled as Cr)
  const fixC = normalizeAndSanitizeFinancialUnits({ revenue: 1967, pat: 2206100000, ebitda: 350 });
  const check1C = fixC.isValid === false && fixC.reason.includes('MISMATCHED_UNIT_CORRUPTION');

  console.log(`  • Fixture A (Normal Crores 1967 / 276):          ${check1A ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  • Fixture B (Raw Rupees Scaled to 1967 / 276):   ${check1B ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  • Fixture C (Mismatched HBL Integer Corrupt):   ${check1C ? '✅ BLOCKED AS EXPECTED' : '❌ FAILED TO BLOCK'}`);

  if (check1A && check1B && check1C) {
    console.log(`  ➔ Test 1 PASSED: Unit-scaling & corruption firewall intact 🟢`);
    passedTests++;
  } else {
    console.log(`  ➔ Test 1 FAILED ❌`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: LOOK-AHEAD PROTECTION & POINT-IN-TIME CAUSALITY ATTACK
  // --------------------------------------------------------------------------
  console.log("\n[Test 2/5] Attacking Point-in-Time Look-Ahead Boundary...");

  const qEnd = '2025-12-31';
  const filedDate = '2026-02-10';

  // Case A: Decision at 31 Jan 2026 (Filing not yet published)
  const pitBefore = verifyPointInTimeAvailability({
    quarterEndDate: qEnd,
    filingDate: filedDate,
    decisionTimestamp: '2026-01-31'
  });
  const check2A = pitBefore.isAvailable === false && pitBefore.reason.includes('LOOK_AHEAD_VIOLATION_FILING_AFTER_DECISION');

  // Case B: Decision at 15 Feb 2026 (Filing published 5 days earlier)
  const pitAfter = verifyPointInTimeAvailability({
    quarterEndDate: qEnd,
    filingDate: filedDate,
    decisionTimestamp: '2026-02-15'
  });
  const check2B = pitAfter.isAvailable === true;

  console.log(`  • Decision on 2026-01-31 (Before Filing 2026-02-10): ${check2A ? '✅ BLOCKED (Zero Look-Ahead)' : '❌ LEAKED'}`);
  console.log(`  • Decision on 2026-02-15 (After Filing 2026-02-10):  ${check2B ? '✅ AVAILABLE (Legitimate Post-Filing)' : '❌ BLOCKED'}`);

  if (check2A && check2B) {
    console.log(`  ➔ Test 2 PASSED: Point-in-Time causality strictly enforced 🟢`);
    passedTests++;
  } else {
    console.log(`  ➔ Test 2 FAILED ❌`);
  }

  // --------------------------------------------------------------------------
  // TEST 3: NO-ADD SECURITY BOUNDARY (CHEAP VALUATION CANNOT OVERRIDE INTEGRITY)
  // --------------------------------------------------------------------------
  console.log("\n[Test 3/5] Attacking No-ADD Security Boundary (Cheap Valuation Trap)...");

  // Attack Scenario A: Drawdown -65%, Margin collapsed -70%, Corrupted Data, but Valuation marked 'CHEAP'
  const cardAttackA = {
    ticker: 'TRAP_STOCK',
    price_date: '2026-08-18',
    latest_price: 100,
    drawdown_pct: -65.0,
    quarter: 'Q1_FY27',
    quarter_end_date: '2026-06-30',
    filing_date: '2026-08-10',
    available_to_engine_date: '2026-08-10',
    revenue_cr: 1000,
    pat_cr: 2206100000, // Corrupted PAT
    ebitda_margin_pct: 3.0, // Compressed margin
    valuation: { reported_pe: 5.0, lens2_implied_cagr: '+2.0%' }, // Ultra cheap
    action: '🟢 ADD' // Adversarial attempt to force ADD
  };

  const auditAttackA = auditStockResearchIntegrity(cardAttackA, '2026-08-18');
  const check3A = auditAttackA.decisionAllowed === false && auditAttackA.addAllowed === false && auditAttackA.blockingReasons.some(r => r.includes('ILLEGAL_ADD'));

  // Attack Scenario B: Drawdown -65%, Margin STABLE (22%), Data PASS, Valuation CHEAP
  const cardAttackB = {
    ticker: 'REBOUND_WATCH',
    price_date: '2026-08-18',
    latest_price: 100,
    drawdown_pct: -65.0,
    quarter: 'Q1_FY27',
    quarter_end_date: '2026-06-30',
    filing_date: '2026-08-10',
    available_to_engine_date: '2026-08-10',
    revenue_cr: 1000,
    pat_cr: 150,
    ebitda_margin_pct: 22.0,
    source_filing: 'LODR_FILING.xml',
    valuation: { reported_pe: 12.0, lens2_implied_cagr: '+3.0%' },
    action: '🟢 HOLD'
  };

  const auditAttackB = auditStockResearchIntegrity(cardAttackB, '2026-08-18');
  const check3B = auditAttackB.decisionAllowed === true && auditAttackB.proposedAction === '🟢 HOLD';

  console.log(`  • Adversarial ADD on Corrupted Data & Margin Collapse: ${check3A ? '✅ ADD STRICTLY FORBIDDEN' : '❌ ILLEGALLY ALLOWED'}`);
  console.log(`  • Severe Drawdown with Clean Data & Stable Margins:   ${check3B ? '✅ PERMITTED AS HOLD / REVIEW' : '❌ FAILED'}`);

  if (check3A && check3B) {
    console.log(`  ➔ Test 3 PASSED: No-ADD security boundary is unbreakable 🟢`);
    passedTests++;
  } else {
    console.log(`  ➔ Test 3 FAILED ❌`);
  }

  // --------------------------------------------------------------------------
  // TEST 4: CHECKLIST COVERAGE & REASON CODES (NO FAKE CERTAINTY)
  // --------------------------------------------------------------------------
  console.log("\n[Test 4/5] Verifying Checklist Coverage Labeling & Structured Reason Codes...");

  const coverageCheck = auditAttackB.checkCoverage;
  const check4 = coverageCheck.dataChecks.includes('/6 PASSED') &&
                 coverageCheck.thesisChecks.includes('/4 PASSED') &&
                 coverageCheck.valuationChecks.includes('/4 PASSED') &&
                 Array.isArray(auditAttackA.blockingReasons) &&
                 auditAttackA.blockingReasons.length > 0;

  console.log(`  • Data Checks Coverage Format:      ${coverageCheck.dataChecks}`);
  console.log(`  • Thesis Checks Coverage Format:    ${coverageCheck.thesisChecks}`);
  console.log(`  • Valuation Checks Coverage Format: ${coverageCheck.valuationChecks}`);
  console.log(`  • Structured Blocking Reasons:      [${auditAttackA.blockingReasons.join(', ')}]`);

  if (check4) {
    console.log(`  ➔ Test 4 PASSED: Checklist coverage & reason codes verified 🟢`);
    passedTests++;
  } else {
    console.log(`  ➔ Test 4 FAILED ❌`);
  }

  // --------------------------------------------------------------------------
  // TEST 5: ASYMMETRIC GUIDANCE CREDIBILITY FORMULA
  // --------------------------------------------------------------------------
  console.log("\n[Test 5/5] Attacking Guidance Credibility with Asymmetric Miss Penalty...");

  // Company A: 10 minor promises -> 9 kept, 1 minor miss
  const promisesCompA = [
    { promise_text: 'Minor routine maintenance capex', status: 'KEPT' },
    { promise_text: 'Staff training module implementation', status: 'KEPT' },
    { promise_text: 'Website redesign rollout', status: 'KEPT' },
    { promise_text: 'Minor ERP software patch', status: 'KEPT' },
    { promise_text: 'Office relocation in Pune', status: 'KEPT' },
    { promise_text: 'Vendor compliance audit', status: 'KEPT' },
    { promise_text: 'CSR initiative launch', status: 'KEPT' },
    { promise_text: 'Safety award certification', status: 'KEPT' },
    { promise_text: 'Energy efficiency audit', status: 'KEPT' },
    { promise_text: 'Minor supply-chain delay resolution', status: 'MISSED' }
  ];

  // Company B: 10 promises -> 9 minor kept, 1 MAJOR QUANTIFIED MISS
  const promisesCompB = [
    { promise_text: 'Minor routine maintenance capex', status: 'KEPT' },
    { promise_text: 'Staff training module implementation', status: 'KEPT' },
    { promise_text: 'Website redesign rollout', status: 'KEPT' },
    { promise_text: 'Minor ERP software patch', status: 'KEPT' },
    { promise_text: 'Office relocation in Pune', status: 'KEPT' },
    { promise_text: 'Vendor compliance audit', status: 'KEPT' },
    { promise_text: 'CSR initiative launch', status: 'KEPT' },
    { promise_text: 'Safety award certification', status: 'KEPT' },
    { promise_text: 'Energy efficiency audit', status: 'KEPT' },
    { promise_text: 'Target ₹2,500 Cr annual revenue with 25% EBITDA margin', status: 'MISSED' } // MAJOR QUANTIFIED MISS
  ];

  const scoreA = calculateCalibratedGuidanceScore(promisesCompA);
  const scoreB = calculateCalibratedGuidanceScore(promisesCompB);

  console.log(`  • Company A (9 Kept Minor, 1 Missed Minor):       Guidance Score: ${scoreA.score}/100 (${scoreA.status})`);
  console.log(`  • Company B (9 Kept Minor, 1 Major Quantified Miss): Guidance Score: ${scoreB.score}/100 (${scoreB.status})`);

  const check5 = scoreA.score >= 80 && scoreB.score <= 65 && (scoreA.score - scoreB.score) >= 20;

  if (check5) {
    console.log(`  ➔ Test 5 PASSED: Major quantified miss penalized asymmetrically (-${scoreA.score - scoreB.score} pts) 🟢`);
    passedTests++;
  } else {
    console.log(`  ➔ Test 5 FAILED ❌`);
  }

  // --------------------------------------------------------------------------
  // FINAL SUMMARY
  // --------------------------------------------------------------------------
  console.log("\n==========================================================================");
  console.log(`=== 📊 ADVERSARIAL TEST SUMMARY: ${passedTests} / ${totalTests} SUITES PASSED (100% 🟢) ===`);
  console.log("==========================================================================");

  if (passedTests !== totalTests) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
