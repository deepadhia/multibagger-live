/**
 * DB validation — run before testing SJS/QPOWER/ELECON.
 * node --env-file=../.env.local scripts/validate-db.js
 */

import { pool } from "../db/pool.js";

const CHECKS = [
  {
    label: "Check 1: Null leakage (thesis_score OR final_action IS NULL)",
    expect: "0 rows",
    sql: `SELECT COUNT(*)::int AS count FROM quarterly_snapshots WHERE thesis_score IS NULL OR final_action IS NULL`,
    pass: (rows) => rows[0].count === 0,
    detail: (rows) => rows[0].count > 0 ? `⚠️  ${rows[0].count} rows with missing data` : null,
  },
  {
    label: "Check 2: Logic integrity (CUT POSITION with thesis_score ≥ 80)",
    expect: "0 rows",
    sql: `SELECT stocks.ticker, quarterly_snapshots.quarter, quarterly_snapshots.thesis_score, quarterly_snapshots.final_action FROM quarterly_snapshots
          JOIN stocks ON stocks.id = quarterly_snapshots.stock_id
          WHERE quarterly_snapshots.final_action = 'CUT POSITION' AND quarterly_snapshots.thesis_score >= 80`,
    pass: (rows) => rows.length === 0,
    detail: (rows) => rows.length > 0
      ? rows.map(r => `  → ${r.ticker} ${r.quarter}: thesis=${r.thesis_score} action=${r.final_action}`).join("\n")
      : null,
  },
  {
    label: "Check 3: Over-sizing (position_size='full' but conviction<75 or valuation<60)",
    expect: "0 rows",
    sql: `SELECT stocks.ticker, quarterly_snapshots.quarter, quarterly_snapshots.position_size, quarterly_snapshots.conviction_score, quarterly_snapshots.valuation_score FROM quarterly_snapshots
          JOIN stocks ON stocks.id = quarterly_snapshots.stock_id
          WHERE quarterly_snapshots.position_size = 'full' AND (quarterly_snapshots.conviction_score < 75 OR quarterly_snapshots.valuation_score < 60)`,
    pass: (rows) => rows.length === 0,
    detail: (rows) => rows.length > 0
      ? rows.map(r => `  → ${r.ticker} ${r.quarter}: position=${r.position_size} conviction=${r.conviction_score} valuation=${r.valuation_score}`).join("\n")
      : null,
  },
];

// Bonus stats
const STATS_SQL = `
  SELECT
    COUNT(*)                                         AS total_snapshots,
    COUNT(thesis_score)                              AS with_thesis_score,
    COUNT(conviction_score)                          AS with_conviction,
    COUNT(valuation_score)                           AS with_valuation,
    COUNT(final_action)                              AS with_action,
    COUNT(position_size)                             AS with_size,
    COUNT(*) FILTER (WHERE position_size = 'full')   AS full_size,
    COUNT(*) FILTER (WHERE position_size = 'half')   AS half_size,
    COUNT(*) FILTER (WHERE position_size = 'starter')AS starter_size,
    COUNT(*) FILTER (WHERE position_size = 'none')   AS none_size,
    COUNT(*) FILTER (WHERE final_action LIKE '%BUILD%') AS build_actions,
    COUNT(*) FILTER (WHERE final_action LIKE '%ADD%')   AS add_actions,
    COUNT(*) FILTER (WHERE final_action LIKE '%WAIT%')  AS wait_actions,
    COUNT(*) FILTER (WHERE final_action LIKE '%CUT%')   AS cut_actions,
    ROUND(AVG(thesis_score))                         AS avg_thesis,
    ROUND(AVG(conviction_score))                     AS avg_conviction,
    ROUND(AVG(valuation_score))                      AS avg_valuation
  FROM quarterly_snapshots
`;

async function run() {
  const client = await pool.connect();
  console.log("\n══════════════════════════════════════════════");
  console.log("  DB VALIDATION — V9+ Schema Sanity Checks");
  console.log("══════════════════════════════════════════════\n");

  try {
    let allPass = true;

    for (const check of CHECKS) {
      const { rows } = await client.query(check.sql);
      const passed = check.pass(rows);
      const icon = passed ? "✅" : "❌";
      console.log(`${icon}  ${check.label}`);
      console.log(`    Expected: ${check.expect}`);
      if (!passed) {
        allPass = false;
        const detail = check.detail(rows);
        if (detail) console.log(detail);
      }
      console.log();
    }

    // Stats
    const { rows: stats } = await client.query(STATS_SQL);
    const s = stats[0];
    console.log("══════════════════════════════════════════════");
    console.log("  SNAPSHOT STATS");
    console.log("══════════════════════════════════════════════");
    console.log(`  Total snapshots   : ${s.total_snapshots}`);
    console.log(`  With thesis_score : ${s.with_thesis_score}  (avg: ${s.avg_thesis})`);
    console.log(`  With conviction   : ${s.with_conviction}  (avg: ${s.avg_conviction})`);
    console.log(`  With valuation    : ${s.with_valuation}  (avg: ${s.avg_valuation})`);
    console.log(`  With final_action : ${s.with_action}`);
    console.log(`  With position_size: ${s.with_size}`);
    console.log();
    console.log("  Position sizing breakdown:");
    console.log(`    full    : ${s.full_size}`);
    console.log(`    half    : ${s.half_size}`);
    console.log(`    starter : ${s.starter_size}`);
    console.log(`    none    : ${s.none_size}`);
    console.log();
    console.log("  Action breakdown:");
    console.log(`    BUILD   : ${s.build_actions}`);
    console.log(`    ADD     : ${s.add_actions}`);
    console.log(`    WAIT    : ${s.wait_actions}`);
    console.log(`    CUT     : ${s.cut_actions}`);
    console.log();
    console.log("══════════════════════════════════════════════");
    console.log(allPass ? "  ✅  ALL CHECKS PASSED — DB is clean" : "  ❌  SOME CHECKS FAILED — review above");
    console.log("══════════════════════════════════════════════\n");

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Validation failed:", err.message);
  process.exit(1);
});
