import fs from 'node:fs';
import { pool } from "../db/pool.js";

async function run() {
  const filePath = process.argv[2];
  let sql = `
    ALTER TABLE quarterly_snapshots
      ADD COLUMN IF NOT EXISTS thesis_score     INTEGER,
      ADD COLUMN IF NOT EXISTS conviction_score INTEGER,
      ADD COLUMN IF NOT EXISTS valuation_score  INTEGER,
      ADD COLUMN IF NOT EXISTS final_action     TEXT,
      ADD COLUMN IF NOT EXISTS position_size    TEXT;
  `;

  if (filePath) {
    console.log(`Reading SQL from: ${filePath}`);
    sql = fs.readFileSync(filePath, 'utf-8');
  }

  const client = await pool.connect();
  try {
    console.log("Running migration...");
    await client.query(sql);
    console.log("✓ Migration complete.");
  } catch (err) {
    console.error("✗ Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
