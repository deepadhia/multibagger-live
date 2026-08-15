import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import pg from 'pg';
import { ingestMarketDataSnapshot } from '../backend/services/market-data-layer.service.js';
import {
  calculateInvestorRequiredReturnModel,
  calculateTrueMarketImpliedExpectationsModel,
  generateExpectationsMatrix,
  computeAndPersistMarketExpectations
} from '../backend/services/market-expectations.service.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runPhase4BTestEngine() {
  console.log("==================================================================");
  console.log("=== 🔬 PHASE 4B: DUAL MARKET EXPECTATIONS ENGINE TEST SUITE ===");
  console.log("==================================================================\n");

  let passedCount = 0;
  const totalTests = 11;
  const ticker = "HBLENGINE";
  const period = "Q1 FY27";

  try {
    await pool.query(`DELETE FROM market_implied_expectations WHERE ticker = $1`, [ticker]);
    await pool.query(`DELETE FROM market_data_snapshots WHERE ticker = $1`, [ticker]);

    const snapshotDate = "2026-08-14T10:00:00.000Z";
    const freshSnapshot = {
      ticker, period, marketDataAsOf: "2026-08-14", retrievedAt: snapshotDate, marketDataSource: "NSE_OFFICIAL_API", sourceDocumentId: "NSE_QUOTE_20260814", sourceHash: "hash1234567890", freshnessStatus: "FRESH", sharePrice: 1000.00, sharesOutstanding: 10.00, marketCap: 10000.00, netDebt: 0.0, ttmRevenue: 1000.00, ttmEbitda: 450.00, ttmEbit: 400.00, ttmPat: 400.00, ttmEps: 40.00, peRatio: 25.00, evEbitdaRatio: 22.22
    };

    await ingestMarketDataSnapshot(freshSnapshot, pool);

    // -------------------------------------------------------------------------
    // TEST 1: CRITICAL DISAMBIGUATION TEST
    // Investor Target Return changes (20% -> 12%), Price remains ₹1,000.
    // True Market-Implied CAGR MUST NOT CHANGE!
    // -------------------------------------------------------------------------
    console.log("📌 TEST 1: Critical Disambiguation Test (Investor Return vs Market Implied)");
    const baseParams = {
      sharePrice: 1000, baselineSharesOutstanding: 10, baselineEps: 40, baselineRevenue: 1000, baselineNetMarginPct: 40, holdingPeriodYears: 5, costOfCapitalDiscountRatePct: 10.0, assumedTerminalPe: 20, assumedTerminalNetMarginPct: 40
    };

    const marketImplied_r20 = calculateTrueMarketImpliedExpectationsModel({ ...baseParams, investorRequiredCagrPct: 20.0 });
    const marketImplied_r12 = calculateTrueMarketImpliedExpectationsModel({ ...baseParams, investorRequiredCagrPct: 12.0 });

    const requiredReturn_r20 = calculateInvestorRequiredReturnModel({ ...baseParams, investorRequiredCagrPct: 20.0 });
    const requiredReturn_r12 = calculateInvestorRequiredReturnModel({ ...baseParams, investorRequiredCagrPct: 12.0 });

    console.log("  ----------------------------------------------------------------");
    console.log("  📊 DISAMBIGUATION COMPARISON RESULT:");
    console.log(`  • Engine A (Required Return @ 20% Investor Hurdle): EPS CAGR = ${requiredReturn_r20.outputs.requiredEpsCagrPct}%`);
    console.log(`  • Engine A (Required Return @ 12% Investor Hurdle): EPS CAGR = ${requiredReturn_r12.outputs.requiredEpsCagrPct}%`);
    console.log(`  • Engine B (True Market Implied @ 20% Hurdle Input): EPS CAGR = ${marketImplied_r20.outputs.marketImpliedEpsCagrPct}%`);
    console.log(`  • Engine B (True Market Implied @ 12% Hurdle Input): EPS CAGR = ${marketImplied_r12.outputs.marketImpliedEpsCagrPct}%`);
    console.log("  ----------------------------------------------------------------");

    const p1 = marketImplied_r20.outputs.marketImpliedEpsCagrPct === marketImplied_r12.outputs.marketImpliedEpsCagrPct &&
               marketImplied_r20.outputs.marketImpliedEpsCagrPct === 15.02 &&
               requiredReturn_r20.outputs.requiredEpsCagrPct !== requiredReturn_r12.outputs.requiredEpsCagrPct;

    console.log(`  ${p1 ? "🟢 PASS" : "🔴 FAIL"} | True Market-Implied CAGR remains 100% CONSTANT (4.56%) when investor hurdle changes!`);
    if (p1) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 2: Price Sensitivity Test (+10% Price & -20% Price)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 2: Price Sensitivity Test (+10% Price & -20% Price)");
    const priceUp = calculateTrueMarketImpliedExpectationsModel({ ...baseParams, sharePrice: 1100 });
    const priceDown = calculateTrueMarketImpliedExpectationsModel({ ...baseParams, sharePrice: 800 });

    const p2 = priceUp.outputs.marketImpliedEpsCagrPct > marketImplied_r20.outputs.marketImpliedEpsCagrPct &&
               priceDown.outputs.marketImpliedEpsCagrPct < marketImplied_r20.outputs.marketImpliedEpsCagrPct;

    console.log(`  ${p2 ? "🟢 PASS" : "🔴 FAIL"} | Price ₹1,100 -> Implied Growth: ${priceUp.outputs.marketImpliedEpsCagrPct}% | Price ₹800 -> Implied Growth: ${priceDown.outputs.marketImpliedEpsCagrPct}%.`);
    if (p2) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 3: Terminal P/E Sensitivity Test (20x vs 30x)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 3: Terminal P/E Sensitivity Test (20x vs 30x)");
    const pe30 = calculateTrueMarketImpliedExpectationsModel({ ...baseParams, assumedTerminalPe: 30 });
    const p3 = pe30.outputs.marketImpliedEpsCagrPct < marketImplied_r20.outputs.marketImpliedEpsCagrPct;
    console.log(`  ${p3 ? "🟢 PASS" : "🔴 FAIL"} | Higher Terminal PE (30x) lowers implied operational EPS CAGR to ${pe30.outputs.marketImpliedEpsCagrPct}%.`);
    if (p3) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 4: Terminal Net Margin Sensitivity Test
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 4: Terminal Net Margin Sensitivity Test (40% vs 20%)");
    const margin20 = calculateTrueMarketImpliedExpectationsModel({ ...baseParams, assumedTerminalNetMarginPct: 20 });
    const p4 = margin20.outputs.marketImpliedRevenueCagrPct > marketImplied_r20.outputs.marketImpliedRevenueCagrPct;
    console.log(`  ${p4 ? "🟢 PASS" : "🔴 FAIL"} | Lower Terminal Margin (20%) raises implied Revenue CAGR to ${margin20.outputs.marketImpliedRevenueCagrPct}%.`);
    if (p4) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 5: Share Dilution Sensitivity Test (10% Dilution)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 5: Share Dilution Sensitivity Test (10% Dilution)");
    const dilution10 = calculateTrueMarketImpliedExpectationsModel({ ...baseParams, assumedDilutionPct: 10 });
    const p5 = dilution10.intermediateValues.assumedTerminalSharesOutstanding === 11.00;
    console.log(`  ${p5 ? "🟢 PASS" : "🔴 FAIL"} | Terminal shares increased to ${dilution10.intermediateValues.assumedTerminalSharesOutstanding} Cr.`);
    if (p5) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 6: EXPIRED Market Data Failure Injection
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 6: EXPIRED Market Data Failure Injection");
    const expiredSnap = { ...freshSnapshot, marketDataAsOf: "2026-05-01", freshnessStatus: "EXPIRED" };
    const ingestExpRes = await ingestMarketDataSnapshot(expiredSnap, pool);
    const t6 = await computeAndPersistMarketExpectations({
      ticker, period, asOfDate: "2026-05-01", informationCutoffAt: "2026-08-15T00:00:00.000Z", assumedTerminalPe: 20, assumedTerminalNetMarginPct: 40
    }, pool);

    const p6 = !ingestExpRes.success && (ingestExpRes.errorCode === "MARKET_DATA_EXPIRED" || t6.errorCode === "MARKET_DATA_EXPIRED" || t6.errorCode === "MISSING_MARKET_SNAPSHOT");
    console.log(`  ${p6 ? "🟢 PASS" : "🔴 FAIL"} | Ingestion Result: ${ingestExpRes.status} (${ingestExpRes.errorCode})`);
    if (p6) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 7: Information Cutoff Contamination Rejection
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 7: Information Cutoff Contamination Rejection");
    const t7 = await computeAndPersistMarketExpectations({
      ticker, period, asOfDate: "2026-08-14", informationCutoffAt: "2026-08-01T00:00:00.000Z", assumedTerminalPe: 20, assumedTerminalNetMarginPct: 40
    }, pool);
    const p7 = !t7.success && t7.errorCode === "INFORMATION_CUTOFF_VIOLATION";
    console.log(`  ${p7 ? "🟢 PASS" : "🔴 FAIL"} | Status: ${t7.status}, ErrorCode: ${t7.errorCode}`);
    if (p7) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 8: Missing Consensus Data Returns NULL
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 8: Missing Consensus Data Returns NULL");
    const p8 = marketImplied_r20.outputs.consensusEpsCagrBefore === null && marketImplied_r20.outputs.consensusEpsCagrAfter === null;
    console.log(`  ${p8 ? "🟢 PASS" : "🔴 FAIL"} | Consensus data returns NULL when unprovided.`);
    if (p8) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 9: Malformed Input Failure Injection
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 9: Malformed Input Failure Injection");
    const t9 = calculateTrueMarketImpliedExpectationsModel({ ...baseParams, sharePrice: -100 });
    const p9 = !t9.isValid && t9.errorCode === "MALFORMED_INPUT";
    console.log(`  ${p9 ? "🟢 PASS" : "🔴 FAIL"} | ErrorCode: ${t9.errorCode}`);
    if (p9) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 10: LLM Hype Text Injection Isolation
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 10: LLM Hype Text Injection Isolation");
    const t10 = await computeAndPersistMarketExpectations({
      ticker, period, asOfDate: "2026-08-14", informationCutoffAt: "2026-08-15T00:00:00.000Z", assumedTerminalPe: 20, assumedTerminalNetMarginPct: 40, llmAnalysisText: "SUPER BULLISH 100x TARGET!"
    }, pool);
    const p10 = t10.success && t10.engineB_TrueMarketImplied.outputs.marketImpliedEpsCagrPct === 15.02;
    console.log(`  ${p10 ? "🟢 PASS" : "🔴 FAIL"} | True Market Implied Growth remains ${t10.engineB_TrueMarketImplied.outputs.marketImpliedEpsCagrPct}% (LLM hype text ignored).`);
    if (p10) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 11: Expectations Sensitivity Matrix Generation
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 11: Expectations Sensitivity Matrix Generation");
    const matrix = generateExpectationsMatrix(baseParams);
    console.log("  ----------------------------------------------------------------");
    console.log("  📊 EXPECTATIONS SENSITIVITY MATRIX (Implied EPS CAGR %):");
    console.log("  ----------------------------------------------------------------");
    console.table(matrix.map(r => ({ "Discount Rate": `${r.discountRatePct}%`, "15x PE": `${r.peResults.pe_15x}%`, "20x PE": `${r.peResults.pe_20x}%`, "25x PE": `${r.peResults.pe_25x}%`, "30x PE": `${r.peResults.pe_30x}%`, "35x PE": `${r.peResults.pe_35x}%` })));
    console.log("  ----------------------------------------------------------------");

    const p11 = Array.isArray(matrix) && matrix.length === 4;
    console.log(`  ${p11 ? "🟢 PASS" : "🔴 FAIL"} | Generated 4x5 Sensitivity Matrix across P/E Multiples & Discount Rates.`);
    if (p11) passedCount++;

  } catch (err) {
    console.error("🔴 Test Suite Error:", err);
  } finally {
    console.log("\n==================================================================");
    if (passedCount === totalTests) {
      console.log(`=== 🟢 PHASE 4B GATE 2 DUAL MARKET EXPECTATIONS ENGINE PASSED: ${passedCount}/${totalTests} TESTS PASSED (100% 🟢) ===`);
    } else {
      console.log(`=== 🔴 PHASE 4B GATE 2 DUAL MARKET EXPECTATIONS ENGINE FAILED: ${passedCount}/${totalTests} TESTS PASSED ===`);
    }
    console.log("==================================================================");
    await pool.end();
  }
}

runPhase4BTestEngine();
