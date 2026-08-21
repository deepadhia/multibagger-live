import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import { pool } from '../backend/db/pool.js';

async function checkSchema() {
  const tables = ['stocks', 'prices', 'xbrl_filings', 'xbrl_metrics_quarterly', 'corporate_announcements', 'management_commitments'];
  for (const t of tables) {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [t]);
    console.log(`=== TABLE: ${t} ===`);
    console.table(res.rows);
  }
  await pool.end();
}

checkSchema().catch(console.error);
