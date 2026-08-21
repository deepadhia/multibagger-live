#!/usr/bin/env node
/**
 * Server-Side Data Reconciliation & Dynamic Repair Runner
 * 
 * Usage:
 *   node scripts/reconcile_and_repair_universe_data.js [--dry-run | --apply] [--ticker=SYMBOL] [--all]
 * 
 * Options:
 *   --dry-run       Audit and report all data gaps and anomalies without modifying DB (Default).
 *   --apply         Execute dynamic repairs, link foreign keys, fix filing dates, deduplicate prices.
 *   --ticker=SYMBOL Reconcile only a specific ticker (e.g. --ticker=ANANTRAJ).
 *   --all           Scan every active stock in the database rather than just the 20 focus stocks.
 */

import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import { pool } from '../backend/db/pool.js';
import { reconcileUniverse, UNIVERSE_20 } from '../backend/services/universe-data-reconciliation.service.js';

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const isAll = args.includes('--all');
  const tickerArg = args.find(a => a.startsWith('--ticker='));
  const targetTicker = tickerArg ? tickerArg.split('=')[1].toUpperCase() : null;

  console.log("==========================================================================");
  console.log("=== 🏥 MULTIBAGGER LIVE SERVER DATA RECONCILIATION & REPAIR ENGINE ===");
  console.log("==========================================================================");
  console.log(`Execution Mode:  ${isApply ? '🟢 LIVE REPAIR (--apply)' : '🟡 DRY-RUN PREVIEW (--dry-run)'}`);
  
  let targetTickers = UNIVERSE_20;

  if (targetTicker) {
    targetTickers = [targetTicker];
    console.log(`Target Stock:    ${targetTicker}`);
  } else if (isAll) {
    const allRes = await pool.query(`SELECT ticker FROM stocks ORDER BY ticker`);
    targetTickers = allRes.rows.map(r => r.ticker);
    console.log(`Target Universe: ALL STOCKS (${targetTickers.length} tickers)`);
  } else {
    console.log(`Target Universe: 20 FOCUS COMPANIES (${targetTickers.length} tickers)`);
  }

  try {
    const summary = await reconcileUniverse({
      apply: isApply,
      tickers: targetTickers
    });

    console.log("\n==========================================================================");
    console.log(`=== 🏁 RECONCILIATION COMPLETE: ${summary.totalAnomalies} Anomalies Detected | ${summary.totalRepairs} Repairs Executed ===`);
    console.log(`Detailed Report: ${summary.reportPath}`);
    console.log("==========================================================================");

    if (!isApply && summary.totalAnomalies > 0) {
      console.log("\n💡 TIP: Run with `--apply` to automatically execute the repairs shown above:");
      console.log("   node scripts/reconcile_and_repair_universe_data.js --apply\n");
    }
  } catch (err) {
    console.error("\n❌ RECONCILIATION FAILED:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
