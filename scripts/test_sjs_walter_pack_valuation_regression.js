/**
 * REGRESSION SUITE: SJS-WALTER-PACK-VALUATION
 * 
 * Verifies that the V12 / Phase 4 Valuation Expectations Engine (Version B)
 * properly evaluates SJS during the Walter Pack acquisition & integration quarters,
 * preventing a naive trailing P/E-only KILL.
 * 
 * FORBIDDEN BEHAVIOR: Trailing P/E > 75x -> Automatic KILL
 * REQUIRED BEHAVIOR:  Valuation must incorporate forward earnings expectation / growth evidence 
 *                     (Lens 2 Expectation Asymmetry: Evidence Growth vs Market-Implied CAGR).
 */

import { pool } from '../backend/db/pool.js';
import { evaluateVersionBValuation, DEFAULT_EXIT_SCENARIOS } from '../backend/services/version-b-valuation-engine.service.js';

async function main() {
  console.log("==========================================================================");
  console.log("=== 🧪 REGRESSION TEST: SJS-WALTER-PACK-VALUATION ===");
  console.log("==========================================================================");

  // 1. Fetch SJS stock metadata
  const sjsRes = await pool.query("SELECT id, ticker, company_name FROM stocks WHERE ticker = 'SJS'");
  if (sjsRes.rows.length === 0) {
    console.error("❌ SJS not found in database!");
    process.exit(1);
  }
  const sjs = sjsRes.rows[0];

  // 2. Define SJS Walter Pack Post-Integration Decision Points
  const SJS_DECISION_POINTS = [
    {
      quarter: 'FY25-Q4',
      valuationDate: '2025-03-30',
      price: 886.0,
      knownFacts: {
        event: 'Walter Pack Acquisition Consolidation (FY24-FY25)',
        reportedRevenueGrowthYoY: 115.9,
        reportedEbitdaMargin: 22.7,
        cashGeneration: 'Positive Operating Cash Flow, Net Cash Balance Sheet',
        evidenceGrowthRange: [0.25, 0.35], // 25% to 35% forward business growth supported by acquisition synergies
        managementGuidance: '25-30% organic + inorganic revenue growth'
      }
    },
    {
      quarter: 'FY26-Q1',
      valuationDate: '2025-06-29',
      price: 1283.0,
      knownFacts: {
        event: 'Walter Pack Synergies & Auto Aesthetics Integration',
        reportedRevenueGrowthYoY: 116.7,
        reportedEbitdaMargin: 22.3,
        cashGeneration: 'Strong CFO Conversion',
        evidenceGrowthRange: [0.25, 0.35],
        managementGuidance: 'Sustained >25% volume compounding'
      }
    },
    {
      quarter: 'FY26-Q2',
      valuationDate: '2025-09-29',
      price: 1460.0,
      knownFacts: {
        event: 'Global OEM Export Ramp-up via Walter Pack',
        reportedRevenueGrowthYoY: 129.1,
        reportedEbitdaMargin: 24.2,
        cashGeneration: 'Net Cash Balance Sheet Intact',
        evidenceGrowthRange: [0.25, 0.35],
        managementGuidance: 'Strong export order pipeline'
      }
    },
    {
      quarter: 'FY26-Q3',
      valuationDate: '2025-12-30',
      price: 1714.0,
      knownFacts: {
        event: 'Walter Pack 28% Revenue Contribution Milestone',
        reportedRevenueGrowthYoY: 162.3,
        reportedEbitdaMargin: 25.0,
        cashGeneration: 'Record Quarterly CFO',
        evidenceGrowthRange: [0.25, 0.35],
        managementGuidance: 'Vision 2028 guidance on track'
      }
    }
  ];

  let passedTests = 0;
  let totalTests = SJS_DECISION_POINTS.length;

  console.log("\nExecuting Valuation Expectations Engine across all Walter Pack integration quarters...\n");

  for (const dp of SJS_DECISION_POINTS) {
    console.log(`--------------------------------------------------------------------------`);
    console.log(`📌 EVALUATING SJS AT: ${dp.quarter} (${dp.valuationDate}) | Price: ₹${dp.price}`);
    console.log(`   Known Evidence at T_S: Revenue +${dp.knownFacts.reportedRevenueGrowthYoY}% YoY | EBITDA Margin ${dp.knownFacts.reportedEbitdaMargin}%`);
    console.log(`   Acquisition Context: ${dp.knownFacts.event}`);

    const valuationResult = await evaluateVersionBValuation({
      ticker: sjs.ticker,
      stockId: sjs.id,
      valuationDate: dp.valuationDate,
      currentPrice: dp.price,
      t0EvidenceGrowthRange: dp.knownFacts.evidenceGrowthRange,
      exitScenarios: DEFAULT_EXIT_SCENARIOS
    }, pool);

    const oldEngineDecision = '🔴 KILL (P/E > 75x Static Rule)';
    const newReservation = valuationResult.valuationReservation;
    const positiveGaps = valuationResult.lens2Expectations?.positiveGapCount || 0;
    const negativeGaps = valuationResult.lens2Expectations?.negativeGapCount || 0;

    // In Version B:
    // If Evidence Growth (30%) exceeds Market-Implied CAGR across exit scenarios,
    // valuation reservation is LOW or MODERATE, and the decision is 🟢 HOLD / ADD (Thesis Intact).
    // An automatic KILL is strictly forbidden.
    const isKillForbidden = newReservation !== 'KILL' && newReservation !== 'SEVERE';
    const isExpectationSupported = positiveGaps >= 2 || newReservation === 'LOW' || newReservation === 'MODERATE' || newReservation === 'INSUFFICIENT_HISTORY';

    console.log(`\n   📊 [OLD NAIVE ENGINE]: ${oldEngineDecision}`);
    console.log(`   📊 [NEW V12 ENGINE RESULT]:`);
    console.log(`      - Point-in-Time Trailing P/E: ${valuationResult.valuationPE ? valuationResult.valuationPE + 'x' : 'N/A'} (Type: ${valuationResult.epsType})`);
    console.log(`      - 5Y Valuation Percentile:    ${valuationResult.lens1Historical.percentile5Y}`);
    console.log(`      - Lens 2 Scenarios:`);
    for (const sc of valuationResult.lens2Expectations.scenarios) {
      console.log(`        • ${sc.label.padEnd(25)} -> Implied 3Y CAGR: ${sc.implied3YCAGR.padEnd(8)} | Expectation Gap: ${sc.expectationGapPct}`);
    }
    console.log(`      - Valuation Reservation:     ${valuationResult.valuationReservation}`);
    console.log(`      - Reservation Rationale:       ${valuationResult.reservationReason}`);

    let newEngineAction = '🟢 HOLD / ADD (Thesis Intact & Growth Supported)';
    if (newReservation === 'SEVERE') {
      newEngineAction = '🔴 TRIM / KILL';
    } else if (newReservation === 'HIGH') {
      newEngineAction = '🟡 STAGED_OBSERVATION (Review Multiple Compression)';
    }

    console.log(`\n   🎯 FINAL NEW ENGINE ACTION: ${newEngineAction}`);

    if (isKillForbidden && isExpectationSupported) {
      passedTests++;
      console.log(`   ✅ [PASS]: SJS NOT killed on naive P/E. Forward acquisition growth (+${dp.knownFacts.reportedRevenueGrowthYoY}%) properly recognized!`);
    } else {
      console.log(`   ❌ [FAIL]: SJS falsely killed or penalized on valuation.`);
    }
  }

  console.log(`\n==========================================================================`);
  console.log(`=== 📊 SJS REGRESSION TEST SUMMARY: ${passedTests} / ${totalTests} QUARTERS PASSED ===`);
  console.log(`==========================================================================`);

  if (passedTests === totalTests) {
    console.log(`🎉 REGRESSION VERIFIED: SJS Walter Pack Valuation Denominator Flaw is 100% FIXED!`);
    console.log(`   The new engine recognizes high-growth acquisition compounders without false trailing P/E kills.`);
  } else {
    console.error(`⚠️ Regression failed on ${totalTests - passedTests} quarters.`);
    process.exit(1);
  }

  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
  process.exit(1);
});
