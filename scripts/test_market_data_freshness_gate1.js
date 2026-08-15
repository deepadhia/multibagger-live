import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import pg from 'pg';
import { ingestMarketDataSnapshot, getMarketDataSnapshot } from '../backend/services/market-data-layer.service.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runGate1FreshnessTestSuite() {
  console.log("==================================================================");
  console.log("=== 🔬 PHASE 4A: GATE 1 MARKET DATA FRESHNESS TEST SUITE ===");
  console.log("==================================================================\n");

  let passedCount = 0;
  const totalTests = 5;
  const ticker = "HBLENGINE";
  const period = "Q1 FY27";

  try {
    // Clean up test records
    await pool.query(`DELETE FROM market_data_snapshots WHERE ticker = $1`, [ticker]);

    const validFreshSnapshot = {
      ticker,
      period,
      marketDataAsOf: "2026-08-14",
      retrievedAt: new Date().toISOString(),
      marketDataSource: "NSE_OFFICIAL_API",
      sourceDocumentId: "NSE_HBLENGINE_QUOTE_20260814",
      sourceHash: "a1b2c3d4e5f67890123456789abcdef0",
      freshnessStatus: "FRESH",
      sharePrice: 600.00,
      sharesOutstanding: 27.70, // 27.70 Cr shares
      marketCap: 16620.00,      // 600 * 27.70 = 16,620 Cr
      netDebt: 250.00,
      ttmRevenue: 2400.00,
      ttmEbitda: 600.00,
      ttmEbit: 500.00,
      ttmPat: 380.00,
      ttmEps: 13.72,
      peRatio: 43.73,
      evEbitdaRatio: 28.11
    };

    // -------------------------------------------------------------------------
    // TEST 1: Valid FRESH Snapshot -> ALLOWED & Persisted
    // -------------------------------------------------------------------------
    console.log("📌 TEST 1: Valid FRESH Snapshot Ingestion");
    const t1 = await ingestMarketDataSnapshot(validFreshSnapshot, pool);
    const p1 = t1.success && t1.status === "VALUATION_ALLOWED" && t1.persistedRecord !== null;
    console.log(`  ${p1 ? "🟢 PASS" : "🔴 FAIL"} | Status: ${t1.status}, Persisted ID: ${t1.persistedRecord ? t1.persistedRecord.id : 'NONE'}`);
    if (p1) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 2: STALE_WARNING Snapshot -> ALLOWED WITH WARNING
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 2: STALE_WARNING Snapshot Ingestion");
    const staleSnapshot = {
      ...validFreshSnapshot,
      marketDataAsOf: "2026-08-01",
      freshnessStatus: "STALE_WARNING"
    };
    const t2 = await ingestMarketDataSnapshot(staleSnapshot, pool);
    const p2 = t2.success && t2.status === "VALUATION_ALLOWED_WITH_WARNING";
    console.log(`  ${p2 ? "🟢 PASS" : "🔴 FAIL"} | Status: ${t2.status}, Warning: '${t2.warningMessage}'`);
    if (p2) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 3: EXPIRED Snapshot Failure Injection -> BLOCKED (No Valuation Persisted)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 3: EXPIRED Snapshot Failure Injection (Downstream Blocking)");
    const expiredSnapshot = {
      ...validFreshSnapshot,
      marketDataAsOf: "2026-05-01",
      freshnessStatus: "EXPIRED"
    };
    const t3 = await ingestMarketDataSnapshot(expiredSnapshot, pool);
    const getDownstream = await getMarketDataSnapshot(ticker, period, pool);

    // If an expired record is fetched, getMarketDataSnapshot MUST block valuation
    const p3 = !t3.success && t3.errorCode === "MARKET_DATA_EXPIRED" && t3.persistedRecord === null;
    console.log(`  ${p3 ? "🟢 PASS" : "🔴 FAIL"} | Ingestion Status: ${t3.status}, ErrorCode: ${t3.errorCode}`);
    if (p3) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 4: Missing Provenance Failure Injection -> BLOCKED
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 4: Missing Provenance Lineage Failure Injection");
    const missingProvSnapshot = {
      ...validFreshSnapshot,
      marketDataAsOf: "2026-08-14",
      sourceHash: "" // Missing source hash!
    };
    const t4 = await ingestMarketDataSnapshot(missingProvSnapshot, pool);
    const p4 = !t4.success && t4.errorCode === "MISSING_PROVENANCE_LINEAGE";
    console.log(`  ${p4 ? "🟢 PASS" : "🔴 FAIL"} | Ingestion Status: ${t4.status}, ErrorCode: ${t4.errorCode}`);
    if (p4) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 5: Malformed Math Failure Injection -> BLOCKED
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 5: Malformed Calculation Math Failure Injection");
    const malformedMathSnapshot = {
      ...validFreshSnapshot,
      marketDataAsOf: "2026-08-14",
      sharePrice: 600.00,
      sharesOutstanding: 27.70,
      marketCap: 99999.00 // Intentionally wrong! 600 * 27.70 = 16,620, not 99,999
    };
    const t5 = await ingestMarketDataSnapshot(malformedMathSnapshot, pool);
    const p5 = !t5.success && t5.errorCode === "MALFORMED_MARKET_SNAPSHOT";
    console.log(`  ${p5 ? "🟢 PASS" : "🔴 FAIL"} | Ingestion Status: ${t5.status}, ErrorCode: ${t5.errorCode}`);
    if (p5) passedCount++;

  } catch (err) {
    console.error("🔴 Gate 1 Test Suite Error:", err);
  } finally {
    console.log("\n==================================================================");
    if (passedCount === totalTests) {
      console.log(`=== 🟢 GATE 1 MARKET DATA FRESHNESS GATE PASSED: ${passedCount}/${totalTests} TESTS PASSED (100% 🟢) ===`);
    } else {
      console.log(`=== 🔴 GATE 1 MARKET DATA FRESHNESS GATE FAILED: ${passedCount}/${totalTests} TESTS PASSED ===`);
    }
    console.log("==================================================================");
    await pool.end();
  }
}

runGate1FreshnessTestSuite();
