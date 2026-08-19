/**
 * Database Quality Purge Script: Remove Unmeasured Noise Commitments
 * 
 * Safely removes low-value marketing fluff, generic slide headings, and unmeasurable rows
 * where target_value is null/Not specified/N/A from `management_commitments`.
 */

import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import { pool } from '../backend/db/pool.js';

async function purgeNoise() {
  console.log("==========================================================================");
  console.log("=== 🧹 AUDITING & PURGING UNMEASURED NOISE FROM MANAGEMENT COMMITMENTS ===");
  console.log("==========================================================================");

  const beforeRes = await pool.query(`SELECT count(*)::int as total FROM management_commitments`);
  console.log(`Total commitments in DB before cleanup: ${beforeRes.rows[0].total}`);

  const deleteQuery = `
    DELETE FROM management_commitments
    WHERE 
      LENGTH(statement) < 25
      OR target_value IS NULL
      OR LOWER(target_value) IN ('null', 'n/a', 'not specified', 'none', 'unknown', '')
      OR LOWER(statement) IN ('our growth drivers', 'growth drivers', 'vision', 'overview', 'market size', 'disclaimer', 'ems', 'demand')
      OR LOWER(metric) IN ('our growth drivers', 'vision', 'none', 'overview', 'demand')
    RETURNING id, ticker, metric, statement;
  `;

  const delRes = await pool.query(deleteQuery);
  console.log(`🗑️ Successfully purged ${delRes.rowCount} noise rows from database.`);

  const afterRes = await pool.query(`SELECT count(*)::int as total FROM management_commitments`);
  console.log(`✨ Total verified, falsifiable commitments remaining in DB: ${afterRes.rows[0].total}`);

  await pool.end();
}

// Only execute if called directly
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  purgeNoise().catch(err => {
    console.error("Purge error:", err);
    process.exit(1);
  });
}
