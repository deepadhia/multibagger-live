import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

import pg from 'pg';
import { generateInstitutionalSyntheses } from '../backend/workers/quarterly-deepdive-worker.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const ALL_11_TICKERS = [
  "INOXINDIA",
  "ANANTRAJ",
  "SJS",
  "TIMETECHNO",
  "SKIPPER",
  "GRAVITA",
  "CCL",
  "LUMAXTECH",
  "HBLENGINE",
  "QPOWER",
  "SHAKTIPUMP"
];

async function runAll11FactLockedSyntheses() {
  console.log("================================================================");
  console.log("=== 🔄 REGENERATING 100% FACT-LOCKED SYNTHESES FOR ALL 11 STOCKS ===");
  console.log("================================================================\n");

  for (const ticker of ALL_11_TICKERS) {
    console.log(`\n[SYNTHESIS REPLAY] Regenerating 4 Fact-Locked Syntheses for ${ticker}...`);
    try {
      await generateInstitutionalSyntheses(ticker, pool);
      console.log(`[SYNTHESIS SUCCESS] Completed Fact-Locked synthesis generation for ${ticker}`);
    } catch (err) {
      console.error(`[SYNTHESIS ERROR] Failed for ${ticker}:`, err.message);
    }
  }

  console.log("\n================================================================");
  console.log("=== ✅ FACT-LOCKED REGENERATION COMPLETE FOR ALL 11 STOCKS ===");
  console.log("================================================================");

  await pool.end();
}

runAll11FactLockedSyntheses();
