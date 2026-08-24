/**
 * Seeder Script for Thesis KPI Definitions
 * Seeds static KPI definitions for TIMETECHNO, LUMAXTECH, CCL, GRAVITA, HSCL into DB.
 */

import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import { pool } from '../db/pool.js';
import { KPI_DEFINITIONS } from '../config/kpi_definitions.config.js';

export async function seedThesisKpis() {
  console.log('--- 🌱 Step: Seeding Thesis KPI Definitions (5 Core Companies) ---');
  let inserted = 0;
  let updated = 0;

  for (const [company, kpis] of Object.entries(KPI_DEFINITIONS)) {
    for (const kpi of kpis) {
      const res = await pool.query(
        `INSERT INTO thesis_kpi_definitions 
          (company, metric_id, metric_name, category, unit, thesis_link, expected_direction, measurement_quality, source_priority, active, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (company, metric_id) DO UPDATE SET
          metric_name = EXCLUDED.metric_name,
          category = EXCLUDED.category,
          unit = EXCLUDED.unit,
          thesis_link = EXCLUDED.thesis_link,
          expected_direction = EXCLUDED.expected_direction,
          measurement_quality = EXCLUDED.measurement_quality,
          source_priority = EXCLUDED.source_priority,
          active = EXCLUDED.active,
          updated_at = NOW()
         RETURNING (xmax = 0) AS is_insert`,
        [
          company,
          kpi.metricId,
          kpi.metricName,
          kpi.category,
          kpi.unit,
          kpi.thesisLink,
          kpi.expectedDirection,
          kpi.measurementQuality || 'B',
          kpi.sourcePriority || 1,
          true
        ]
      );
      if (res.rows[0]?.is_insert) inserted++;
      else updated++;
    }
  }

  console.log(`✅ Seeded Thesis KPI Definitions: ${inserted} inserted, ${updated} updated across 5 companies.\n`);
  return { inserted, updated, total: inserted + updated };
}

if (process.argv[1]?.endsWith('seed-thesis-kpis.js')) {
  seedThesisKpis()
    .then(() => pool.end())
    .catch(err => {
      console.error('❌ Seeding failed:', err);
      pool.end();
      process.exit(1);
    });
}
