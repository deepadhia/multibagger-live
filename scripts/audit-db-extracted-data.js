import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import { pool } from '../backend/db/pool.js';

async function auditDatabaseExtraction() {
  console.log('\n================================================================');
  console.log('=== DATABASE EXTRACTION ACCURACY & INTEGRITY AUDIT ===');
  console.log('================================================================\n');

  const core11Tickers = [
    'INOXINDIA',
    'ANANTRAJ',
    'SJS',
    'SKIPPER',
    'LUMAXTECH',
    'HBLENGINE',
    'QPOWER',
    'SHAKTIPUMP',
    'TIMETECHNO',
    'CCL',
    'GRAVITA'
  ];

  const auditReport = [];

  for (const ticker of core11Tickers) {
    // 1. Get Stock Info
    const { rows: stockRows } = await pool.query(
      "SELECT id, company_name FROM stocks WHERE ticker = $1",
      [ticker]
    );
    if (stockRows.length === 0) continue;
    const stock = stockRows[0];

    // 2. Check Quarterly Snapshots
    const { rows: snapshots } = await pool.query(
      "SELECT quarter, metrics FROM quarterly_snapshots WHERE stock_id = $1 ORDER BY quarter DESC LIMIT 1",
      [stock.id]
    );

    // 3. Check Commitments & Proof
    const { rows: comms } = await pool.query(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'Achieved' THEN 1 END) as achieved,
         COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending
       FROM management_commitments WHERE ticker = $1`,
      [ticker]
    );

    // 4. Check Announcements
    const { rows: anns } = await pool.query(
      `SELECT COUNT(*) as total_anns FROM corporate_announcements WHERE ticker = $1 AND created_at >= '2026-08-01'`,
      [ticker]
    );

    // 5. Check Syntheses
    const { rows: syntheses } = await pool.query(
      "SELECT COUNT(*) as syntheses_count FROM stock_syntheses WHERE ticker = $1",
      [ticker]
    );

    const latestMetrics = snapshots[0]?.metrics || {};
    const sales = latestMetrics.sales?.value ?? latestMetrics.revenue?.value ?? 'N/A';
    const pat = latestMetrics.pat?.value ?? latestMetrics.net_profit?.value ?? 'N/A';
    const opm = latestMetrics.opm?.value ?? latestMetrics.ebitda_margin?.value ?? 'N/A';

    auditReport.push({
      Ticker: ticker,
      'Company Name': stock.company_name,
      'Latest Quarter': snapshots[0]?.quarter || 'N/A',
      'Q1 Revenue': sales !== 'N/A' ? `₹${sales} Cr` : 'N/A',
      'Q1 PAT': pat !== 'N/A' ? `₹${pat} Cr` : 'N/A',
      'Q1 OPM %': opm !== 'N/A' ? `${opm}%` : 'N/A',
      'Commitments (Achieved/Total)': `${comms[0]?.achieved || 0} / ${comms[0]?.total || 0}`,
      'Aug Filings': anns[0]?.total_anns || 0,
      '4 Syntheses Saved': `${syntheses[0]?.syntheses_count || 0}/4`
    });
  }

  console.table(auditReport);
  console.log('\n================================================================');
  console.log('✅ Audit Completed cleanly. Check values above for accuracy.');
  console.log('================================================================\n');

  process.exit(0);
}

auditDatabaseExtraction();
