import { pool } from "../db/pool.js";

/**
 * Diagnostic tool to verify the completeness of XBRL extraction in the database.
 * Useful for checking if new XBRL XMLs have been successfully parsed into Working Capital metrics.
 */
async function checkExtraction() {
  const { rows } = await pool.query(`
    SELECT 
      ticker, 
      COUNT(*) as total_quarters,
      COUNT(trade_payables) as payables_extracted,
      COUNT(working_capital_days) as wc_days_computed
    FROM xbrl_metrics_quarterly
    GROUP BY ticker
    ORDER BY payables_extracted DESC
  `);
  
  console.log("XBRL Extraction Summary by Ticker:");
  console.table(rows);
  
  process.exit(0);
}

checkExtraction();
