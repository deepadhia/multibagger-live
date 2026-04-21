/**
 * Applies the valuation columns migration directly using the backend DATABASE_URL.
 * Run from project root:
 *   node backend/scripts/run-migration.js
 */

import { pool } from "../db/pool.js";

const SQL = `
ALTER TABLE quarterly_snapshots
  ADD COLUMN IF NOT EXISTS thesis_score     INTEGER,
  ADD COLUMN IF NOT EXISTS conviction_score INTEGER,
  ADD COLUMN IF NOT EXISTS valuation_score  INTEGER,
  ADD COLUMN IF NOT EXISTS final_action     TEXT,
  ADD COLUMN IF NOT EXISTS position_size    TEXT;
`;

async function run() {
  const client = await pool.connect();
  try {
    console.log("Running migration: adding valuation columns to quarterly_snapshots...");
    await client.query(SQL);
    console.log("✓ Migration complete. Columns added (or already existed — IF NOT EXISTS is safe).");
  } catch (err) {
    console.error("✗ Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
