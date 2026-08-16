import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import pg from 'pg';
import { resolvePointInTimeTTMEPS, evaluateVersionBValuation } from '../backend/services/version-b-valuation-engine.service.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const EXPECTED_AUDITED_TARGETS = [
  { ticker: "GRAVITA", t0Date: "2024-08-14", price: 1944.95, expectedPE: 56.1, expectedEps: 34.65 },
  { ticker: "LUMAXTECH", t0Date: "2024-08-14", price: 520.70, expectedPE: 27.3, expectedEps: 19.10 },
  { ticker: "ASTRAMICRO", t0Date: "2024-08-14", price: 830.25, expectedPE: 65.1, expectedEps: 12.75 },
  { ticker: "SJS", t0Date: "2024-08-14", price: 976.15, expectedPE: 35.7, expectedEps: 27.33 },
  { ticker: "INOXINDIA", t0Date: "2024-08-14", price: 1181.90, expectedPE: 54.7, expectedEps: 21.59 },
  { ticker: "SHAKTIPUMP", t0Date: "2024-08-14", price: 745.85, expectedPE: 63.3, expectedEps: 11.79 },
  { ticker: "ANANTRAJ", t0Date: "2024-08-14", price: 519.25, expectedPE: 68.1, expectedEps: 7.63 },
  { ticker: "TIMETECHNO", t0Date: "2024-08-14", price: 191.18, expectedPE: 28.0, expectedEps: 6.84 }
];

async function runRegressionSuite() {
  console.log("=========================================================================================");
  console.log("=== 🔬 P/E DENOMINATOR REGRESSION TEST SUITE                                          ===");
  console.log("=========================================================================================\n");

  let allPassed = true;

  console.log("📌 1. REPRODUCING KNOWN AUDITED P/E TARGETS ACROSS CORE CASE STUDIES...");
  const tableRows = [];

  for (const t of EXPECTED_AUDITED_TARGETS) {
    const { rows: stocks } = await pool.query("SELECT id FROM stocks WHERE ticker = $1", [t.ticker]);
    const stockId = stocks[0]?.id;

    const pitRes = await resolvePointInTimeTTMEPS(stockId, t.t0Date, pool);
    const calculatedPE = parseFloat((t.price / pitRes.eps).toFixed(1));
    const passed = Math.abs(calculatedPE - t.expectedPE) <= 0.2;

    if (!passed) allPassed = false;

    tableRows.push({
      ticker: t.ticker,
      t0Date: t.t0Date,
      price: `₹${t.price}`,
      resolvedEPS: `₹${pitRes.eps}`,
      expectedEPS: `₹${t.expectedEps}`,
      calculatedPE: `${calculatedPE}x`,
      expectedPE: `${t.expectedPE}x`,
      status: passed ? "PASS 🟢" : "FAIL 🔴"
    });
  }

  console.table(tableRows);

  console.log("\n📌 2. POINT-IN-TIME TEMPORAL ISOLATION REGRESSION TEST...");
  // Test Gravita at April 15, 2024 (BEFORE FY24 publication on May 30, 2024)
  const { rows: gravitaStocks } = await pool.query("SELECT id FROM stocks WHERE ticker = 'GRAVITA'");
  const gravitaStockId = gravitaStocks[0]?.id;

  const prePublicationRes = await resolvePointInTimeTTMEPS(gravitaStockId, "2024-04-15", pool);
  const postPublicationRes = await resolvePointInTimeTTMEPS(gravitaStockId, "2024-08-14", pool);

  console.log(`  • Pre-Publication Date (2024-04-15): Resolved EPS = ₹${prePublicationRes.eps} (Source: ${prePublicationRes.source})`);
  console.log(`  • Post-Publication Date (2024-08-14): Resolved EPS = ₹${postPublicationRes.eps} (Source: ${postPublicationRes.source})`);

  const pitStrictPass = (prePublicationRes.eps === 29.13 && postPublicationRes.eps === 34.65);
  if (!pitStrictPass) allPassed = false;
  console.log(`  • Anti-Lookahead Temporal Separation Test: ${pitStrictPass ? "PASS 🟢" : "FAIL 🔴"}\n`);

  await pool.end();

  if (!allPassed) {
    console.error("❌ REGRESSION SUITE FAILED");
    process.exit(1);
  } else {
    console.log("==================================================================");
    console.log("=== 🟢 ALL P/E DENOMINATOR REGRESSION TESTS PASSED            ===");
    console.log("==================================================================");
    process.exit(0);
  }
}

runRegressionSuite().catch(console.error);
