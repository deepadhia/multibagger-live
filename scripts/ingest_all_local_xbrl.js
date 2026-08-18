import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import fs from 'fs';
import path from 'path';
import { pool } from '../backend/db/pool.js';
import { parseXbrlFile } from '../backend/services/xbrl/index.js';

const DATA_DIR = path.resolve(process.cwd(), 'data_node');

function findXmlFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findXmlFiles(fullPath));
    } else if (item.toLowerCase().endsWith('.xml')) {
      results.push(fullPath);
    }
  }
  return results;
}

export async function ingestAllLocalXbrl() {
  console.log("==========================================================================");
  console.log("=== 📥 INGESTING ALL LOCAL XBRL XML FILINGS INTO DATABASE ===");
  console.log("==========================================================================\n");

  const stocksRes = await pool.query(`SELECT id, ticker, company_name FROM stocks ORDER BY ticker ASC`);
  const stocks = stocksRes.rows;

  let totalInsertedOrUpdated = 0;

  for (const stock of stocks) {
    const symbolDir = path.join(DATA_DIR, stock.ticker);
    if (!fs.existsSync(symbolDir)) {
      console.log(`- ${stock.ticker}: No data_node folder found.`);
      continue;
    }

    const xmlFiles = findXmlFiles(symbolDir);
    if (xmlFiles.length === 0) {
      console.log(`- ${stock.ticker}: No XML files found.`);
      continue;
    }

    console.log(`\n📂 Processing ${stock.ticker} (${xmlFiles.length} XML files found)...`);

    for (const xmlPath of xmlFiles) {
      try {
        const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
        const parseResult = await parseXbrlFile(xmlContent);

        if (!parseResult.success || !parseResult.data || !parseResult.data.metrics) {
          console.log(`  ⚠️ Failed to parse: ${path.basename(xmlPath)}`);
          continue;
        }

        const { metrics, quarterDates, cfo_period_type } = parseResult.data;

        for (const [qLabel, m] of Object.entries(metrics)) {
          const periodEnd = quarterDates[qLabel] || null;
          let fyYear = null;
          if (qLabel.startsWith('FY')) {
            const parts = qLabel.split('-');
            fyYear = parseInt(parts[0].replace('FY', ''), 10);
            if (fyYear < 2000) fyYear += 2000;
          }

          // Insert or Update into xbrl_metrics_quarterly
          const query = `
            INSERT INTO xbrl_metrics_quarterly (
              stock_id, ticker, quarter, fy_year, period_end_date,
              revenue_from_ops, other_income, total_income, total_expenses,
              staff_cost, raw_material_cost, other_expenses,
              ebitda, ebitda_margin_pct, finance_cost, depreciation,
              exceptional_items, pbt, tax_expense, pat, pat_margin_pct,
              eps_basic, eps_diluted, paid_up_capital, debt_equity_ratio,
              receivables, inventory, borrowings, cash_and_bank,
              cfo, capex, trade_payables, source, confidence,
              source_preferred, cfo_period_type, xml_confidence_score,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9,
              $10, $11, $12,
              $13, $14, $15, $16,
              $17, $18, $19, $20, $21,
              $22, $23, $24, $25,
              $26, $27, $28, $29,
              $30, $31, $32, $33, $34,
              $35, $36, $37,
              NOW(), NOW()
            )
            ON CONFLICT (stock_id, quarter) DO UPDATE SET
              period_end_date = COALESCE(EXCLUDED.period_end_date, xbrl_metrics_quarterly.period_end_date),
              revenue_from_ops = COALESCE(EXCLUDED.revenue_from_ops, xbrl_metrics_quarterly.revenue_from_ops),
              other_income = COALESCE(EXCLUDED.other_income, xbrl_metrics_quarterly.other_income),
              total_income = COALESCE(EXCLUDED.total_income, xbrl_metrics_quarterly.total_income),
              total_expenses = COALESCE(EXCLUDED.total_expenses, xbrl_metrics_quarterly.total_expenses),
              staff_cost = COALESCE(EXCLUDED.staff_cost, xbrl_metrics_quarterly.staff_cost),
              raw_material_cost = COALESCE(EXCLUDED.raw_material_cost, xbrl_metrics_quarterly.raw_material_cost),
              other_expenses = COALESCE(EXCLUDED.other_expenses, xbrl_metrics_quarterly.other_expenses),
              ebitda = COALESCE(EXCLUDED.ebitda, xbrl_metrics_quarterly.ebitda),
              ebitda_margin_pct = COALESCE(EXCLUDED.ebitda_margin_pct, xbrl_metrics_quarterly.ebitda_margin_pct),
              finance_cost = COALESCE(EXCLUDED.finance_cost, xbrl_metrics_quarterly.finance_cost),
              depreciation = COALESCE(EXCLUDED.depreciation, xbrl_metrics_quarterly.depreciation),
              exceptional_items = COALESCE(EXCLUDED.exceptional_items, xbrl_metrics_quarterly.exceptional_items),
              pbt = COALESCE(EXCLUDED.pbt, xbrl_metrics_quarterly.pbt),
              tax_expense = COALESCE(EXCLUDED.tax_expense, xbrl_metrics_quarterly.tax_expense),
              pat = COALESCE(EXCLUDED.pat, xbrl_metrics_quarterly.pat),
              pat_margin_pct = COALESCE(EXCLUDED.pat_margin_pct, xbrl_metrics_quarterly.pat_margin_pct),
              eps_basic = COALESCE(EXCLUDED.eps_basic, xbrl_metrics_quarterly.eps_basic),
              eps_diluted = COALESCE(EXCLUDED.eps_diluted, xbrl_metrics_quarterly.eps_diluted),
              paid_up_capital = COALESCE(EXCLUDED.paid_up_capital, xbrl_metrics_quarterly.paid_up_capital),
              debt_equity_ratio = COALESCE(EXCLUDED.debt_equity_ratio, xbrl_metrics_quarterly.debt_equity_ratio),
              receivables = COALESCE(EXCLUDED.receivables, xbrl_metrics_quarterly.receivables),
              inventory = COALESCE(EXCLUDED.inventory, xbrl_metrics_quarterly.inventory),
              borrowings = COALESCE(EXCLUDED.borrowings, xbrl_metrics_quarterly.borrowings),
              cash_and_bank = COALESCE(EXCLUDED.cash_and_bank, xbrl_metrics_quarterly.cash_and_bank),
              cfo = COALESCE(EXCLUDED.cfo, xbrl_metrics_quarterly.cfo),
              capex = COALESCE(EXCLUDED.capex, xbrl_metrics_quarterly.capex),
              trade_payables = COALESCE(EXCLUDED.trade_payables, xbrl_metrics_quarterly.trade_payables),
              cfo_period_type = COALESCE(EXCLUDED.cfo_period_type, xbrl_metrics_quarterly.cfo_period_type),
              xml_confidence_score = 95,
              updated_at = NOW()
          `;

          const ebitdaMargin = (m.ebitda && m.revenue_from_ops) 
            ? Math.round((m.ebitda / m.revenue_from_ops) * 10000) / 100 
            : null;
          const patMargin = (m.pat && m.revenue_from_ops) 
            ? Math.round((m.pat / m.revenue_from_ops) * 10000) / 100 
            : null;

          const values = [
            stock.id, stock.ticker, qLabel, fyYear, periodEnd,
            m.revenue_from_ops || null, m.other_income || null, m.total_income || null, m.total_expenses || null,
            m.staff_cost || null, m.raw_material_cost || null, m.other_expenses || null,
            m.ebitda || null, ebitdaMargin, m.finance_cost || null, m.depreciation || null,
            m.exceptional_items || null, m.pbt || null, m.tax_expense || null, m.pat || null, patMargin,
            m.eps_basic || null, m.eps_diluted || null, m.paid_up_capital || null, m.debt_equity_ratio || null,
            m.receivables || null, m.inventory || null, m.borrowings || null, m.cash_and_bank || null,
            m.cfo || null, m.capex || null, m.trade_payables || null, 'xml_local', 'high',
            'xml', cfo_period_type || null, 95
          ];

          await pool.query(query, values);
          totalInsertedOrUpdated++;
          console.log(`  ✅ Ingested ${stock.ticker} [${qLabel}] (Period: ${periodEnd || 'N/A'}, Rev: ${m.revenue_from_ops ? '₹' + (m.revenue_from_ops/1e7).toFixed(1) + ' Cr' : 'N/A'}, PAT: ${m.pat ? '₹' + (m.pat/1e7).toFixed(1) + ' Cr' : 'N/A'})`);
        }
      } catch (err) {
        console.error(`  ❌ Error processing ${xmlPath}:`, err.message);
      }
    }
  }

  console.log(`\n🎉 Ingestion complete. Total quarterly metric records upserted: ${totalInsertedOrUpdated}`);
  await pool.end();
}

ingestAllLocalXbrl().catch(console.error);
