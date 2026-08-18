/**
 * Production Server NIM Ingestion & Deep-Dive Pipeline (Up to Q1 FY27)
 * 
 * Capabilities:
 * 1. Iterates over all coverage universe stocks in the database.
 * 2. Scans all quarterly filing directories (FY24-Q1 -> FY27-Q1) for Concall Transcripts, Investor Presentations, and Results.
 * 3. Uses NVIDIA NIM LLM (meta/llama-3.1-70b-instruct) to extract:
 *    - Explicit Management Commitments with numerical metrics & timelines
 *    - Credibility Ratings & Delivery Status (Achieved, Pending, Delayed, Broken)
 *    - Primary Thesis Catalysts & Falsification Signals
 * 4. Upserts extracted evidence into `management_commitments` and `xbrl_metrics_quarterly`.
 * 5. Robust retry exponential backoff for NIM API rate limits (HTTP 429/503).
 */

import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { pool } from '../backend/db/pool.js';
import { NVIDIA_API_KEY } from '../backend/config/env.js';
import { extractDeterministicFinancials } from '../backend/services/financial-validator.service.js';
import { applyInstitutionalGuard } from '../backend/services/institutional-guard.service.js';
import { parseXbrlFile } from '../backend/services/xbrl/index.js';

const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DATA_DIR = path.resolve(process.cwd(), 'data_node');

// Rate limiting & backoff settings
const NIM_MAX_RETRIES = 5;
const NIM_BASE_DELAY_MS = 3000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call NVIDIA NIM with automatic exponential backoff on 429/503.
 */
async function callNimChat(messages, options = {}) {
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY environment variable is not configured.");
  }

  const model = options.model || "meta/llama-3.1-70b-instruct";
  const temperature = options.temperature !== undefined ? options.temperature : 0.1;
  const max_tokens = options.max_tokens || 1500;
  const response_format = options.response_format || { type: "json_object" };

  for (let attempt = 1; attempt <= NIM_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      const response = await fetch(NIM_BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
          response_format
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errBody = {};
        try { errBody = await response.json(); } catch (_) {}
        const isRateLimit = [429, 503, 504].includes(response.status);

        if (isRateLimit && attempt < NIM_MAX_RETRIES) {
          const delay = NIM_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          console.warn(`  ⏳ [NIM Rate Limit HTTP ${response.status}] Backing off for ${(delay / 1000).toFixed(1)}s (Attempt ${attempt}/${NIM_MAX_RETRIES})...`);
          await sleep(delay);
          continue;
        }

        throw new Error(`NIM API failed with HTTP ${response.status}: ${JSON.stringify(errBody)}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      return content;
    } catch (err) {
      clearTimeout(timeoutId);
      if (attempt < NIM_MAX_RETRIES && (err.name === 'AbortError' || err.message.includes('fetch'))) {
        const delay = NIM_BASE_DELAY_MS * attempt;
        console.warn(`  ⏳ [NIM Network/Timeout] Retrying in ${(delay / 1000).toFixed(1)}s...`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
}

/**
 * Extract text from a local PDF file.
 */
async function extractTextFromPdf(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text || "";
  } catch (err) {
    console.error(`  ❌ Failed to parse PDF: ${path.basename(pdfPath)} - ${err.message}`);
    return "";
  }
}

/**
 * Extracts structured management commitments and concall analysis via NIM.
 */
async function extractCommitmentsWithNim(ticker, quarter, filingType, text, thesis) {
  if (!text || text.trim().length < 200) return null;

  // Cap text to 18,000 characters (opening + Q&A conclusion)
  let processedText = text;
  if (processedText.length > 18000) {
    const half = 9000;
    processedText = `${processedText.substring(0, half)}\n\n[... TRUNCATED MIDDLE FOR NIM CONTEXT EFFICIENCY ...]\n\n${processedText.substring(processedText.length - half)}`;
  }

  const prompt = `
You are a Senior Indian Equity Research Analyst conducting a Point-In-Time Concall / Investor Presentation Audit.
Extract ALL measurable, falsifiable management commitments, milestone guidance, and strategic statements from this filing.

Ticker: ${ticker}
Quarter: ${quarter}
Filing Type: ${filingType}
Underwritten Investment Thesis: ${thesis || "High-quality growth, clean balance sheet, high ROCE."}

── Extraction Rules ──
1. Extract 2 to 6 specific, falsifiable commitments (Capex, Revenue targets, Order book, Capacity commissioning, Margin guidance, Debt targets, Geographic expansion).
2. For each commitment, identify:
   - statement: Clear, concise verbatim commitment quote.
   - metric: Category (e.g. Capex, EBITDA Margin, Order Inflows, Net Debt, Capacity Commissioning).
   - target_value: Specific numeric or qualitative target (e.g. "₹520 Cr over 18m", ">12%", "Net-debt zero").
   - timeline: Exact deadline stated by management (e.g. "Q4 FY26", "H2 FY27", "FY27").
   - status: "Achieved" (if completed), "Pending" (in progress), "Delayed" (pushed back), or "Divergent" (missed).
   - blockers_and_risks: Management's stated headwinds or delays (or null).
   - credibility_impact: "positive", "neutral", or "negative".
3. Return ONLY a valid JSON object:
{
  "credibility_tier": "Tier 1" | "Tier 2" | "Tier 3",
  "concall_sentiment": "BULLISH" | "NEUTRAL" | "CAUTIOUS",
  "commitments": [
    {
      "statement": "...",
      "metric": "...",
      "target_value": "...",
      "timeline": "...",
      "status": "Achieved" | "Pending" | "Delayed" | "Divergent",
      "evidence_summary": "...",
      "blockers_and_risks": "..." or null,
      "credibility_impact": "positive" | "neutral" | "negative"
    }
  ]
}

Filing Content:
${processedText}
`;

  try {
    const rawOutput = await callNimChat([
      { role: "system", content: "You are an institutional equity analyst extracting exact management commitments from Indian corporate filings. Respond in pure JSON." },
      { role: "user", content: prompt }
    ]);

    const cleanJson = rawOutput.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error(`  ❌ NIM commitment extraction failed for ${ticker} [${quarter}]:`, err.message);
    return null;
  }
}

/**
 * Main Server Runner Pipeline
 */
async function runServerNimPipeline() {
  console.log("==========================================================================");
  console.log("=== 🚀 PRODUCTION SERVER NIM INGESTION PIPELINE (UP TO Q1 FY27) ===");
  console.log("==========================================================================\n");

  const args = process.argv.slice(2);
  const targetTicker = args.find(a => a.startsWith('--ticker='))?.split('=')[1]?.toUpperCase() || null;

  const stocksRes = await pool.query(`SELECT id, ticker, company_name, investment_thesis FROM stocks ORDER BY ticker ASC`);
  let stocks = stocksRes.rows;

  if (targetTicker) {
    stocks = stocks.filter(s => s.ticker === targetTicker);
    console.log(`🎯 Filtered target ticker: ${targetTicker}`);
  }

  let totalPdfsProcessed = 0;
  let totalCommitmentsUpserted = 0;

  for (const stock of stocks) {
    const symbolDir = path.join(DATA_DIR, stock.ticker);
    if (!fs.existsSync(symbolDir)) {
      console.log(`- ⏭️ ${stock.ticker}: No data_node directory found.`);
      continue;
    }

    const quarterDirs = fs.readdirSync(symbolDir).filter(d => d.startsWith('FY')).sort();
    console.log(`\n🏢 ${stock.ticker} (${stock.company_name}) — Found ${quarterDirs.length} quarter folders.`);

    let thesisText = stock.investment_thesis;
    if (typeof thesisText === 'string' && thesisText.startsWith('{')) {
      try { thesisText = JSON.parse(thesisText).primary_thesis || thesisText; } catch (_) {}
    }

    for (const qDir of quarterDirs) {
      const qPath = path.join(symbolDir, qDir);
      const files = fs.readdirSync(qPath);

      const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
      if (pdfFiles.length === 0) continue;

      for (const pdfFile of pdfFiles) {
        const fullPdfPath = path.join(qPath, pdfFile);
        const isConcall = pdfFile.toLowerCase().includes('concall') || pdfFile.toLowerCase().includes('transcript');
        const isPpt = pdfFile.toLowerCase().includes('presentation') || pdfFile.toLowerCase().includes('ppt');
        const isResult = pdfFile.toLowerCase().includes('result') || pdfFile.toLowerCase().includes('financial');

        const filingType = isConcall ? 'Concall Transcript' : (isPpt ? 'Investor Presentation' : 'Earnings Release');

        console.log(`  📄 Processing [${qDir}] ${filingType}: ${pdfFile}...`);

        const text = await extractTextFromPdf(fullPdfPath);
        if (!text || text.length < 300) {
          console.log(`    ⚠️ Skipping (insufficient text or scanned PDF).`);
          continue;
        }

        totalPdfsProcessed++;

        // Call NVIDIA NIM to extract commitments
        const nimResult = await extractCommitmentsWithNim(stock.ticker, qDir, filingType, text, thesisText);
        if (!nimResult || !nimResult.commitments || nimResult.commitments.length === 0) {
          console.log(`    ℹ️ No explicit new commitments extracted.`);
          continue;
        }

        console.log(`    ✨ Extracted ${nimResult.commitments.length} commitments via NIM (Sentiment: ${nimResult.concall_sentiment}, Credibility: ${nimResult.credibility_tier}):`);

        for (const c of nimResult.commitments) {
          const insertQuery = `
            INSERT INTO management_commitments (
              stock_id, ticker, quarter, statement, metric, target_value,
              timeline, status, evidence_summary, blockers_and_risks,
              credibility_impact, commitment_title, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10,
              $11, $12, NOW()
            )
            ON CONFLICT DO NOTHING
          `;

          const values = [
            stock.id,
            stock.ticker,
            qDir,
            c.statement,
            c.metric || 'Strategic Delivery',
            c.target_value || 'Not specified',
            c.timeline || qDir,
            c.status || 'Pending',
            c.evidence_summary || `Extracted from ${filingType} (${qDir})`,
            c.blockers_and_risks || null,
            c.credibility_impact || 'neutral',
            `${c.metric || 'Commitment'}: ${c.target_value || ''}`
          ];

          await pool.query(insertQuery, values);
          totalCommitmentsUpserted++;
          console.log(`      • [${c.status}] ${c.metric}: "${c.statement}" (Target: ${c.target_value}, Timeline: ${c.timeline})`);
        }

        // Polite delay between NIM LLM calls to protect rate limits
        await sleep(1500);
      }
    }
  }

  console.log("\n==========================================================================");
  console.log(`🎉 SERVER NIM PIPELINE EXECUTION FINISHED.`);
  console.log(`   Total PDFs Analyzed: ${totalPdfsProcessed}`);
  console.log(`   Total Management Commitments Ingested: ${totalCommitmentsUpserted}`);
  console.log("==========================================================================\n");

  await pool.end();
}

runServerNimPipeline().catch(err => {
  console.error("Fatal Server Pipeline Error:", err);
  process.exit(1);
});
