import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import fs from 'fs';
import path from 'path';
import { pool } from '../backend/db/pool.js';
import { extractTextFromPdfUrl } from '../backend/services/announcement.service.js';
import { getVerifiedGroundTruth, validateNarrativeAgainstArithmetic } from '../backend/services/verified-data-layer.service.js';
import { reconcileCommitments } from '../backend/workers/commitment-reconciler-worker.js';
import { generateInstitutionalSyntheses } from '../backend/workers/quarterly-deepdive-worker.js';
import { writeLog } from '../backend/services/logger.service.js';

const AUDIT_DIR = path.resolve(process.cwd(), 'audit_output');
const TELEGRAM_ALERTS_FILE = path.join(AUDIT_DIR, 'telegram_alerts_audit.md');
const EXTRACTED_DATA_FILE = path.join(AUDIT_DIR, 'extracted_data_audit.json');

function ensureAuditDir() {
  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }
}

/**
 * 8-SECTION INSTITUTIONAL CONCALL SYNTHESIZER
 */
async function generateInstitutionalConcallReport(ticker, companyName, rawText) {
  const concallStart = rawText.toLowerCase().search(/(?:management:|moderator:|management\s+opening|presentation|executive\s+summary|remarks|highlights|question|answer)/i);
  let cleanText = concallStart !== -1 ? rawText.substring(concallStart, concallStart + 12000) : rawText.substring(0, 12000);

  const userPrompt = `
Company: ${companyName} (${ticker})
Concall Transcript Text:
${cleanText}

Extract valid JSON with keys:
1. "financial_performance": ["Revenue: ₹X Cr (+Y% YoY)", "EBITDA: ₹X Cr (Margin Y%)", "PAT: ₹X Cr", "Order Book: ₹X Cr"],
2. "business_performance": ["Division 1 details", "Contract wins with ₹ Cr sizes"],
3. "growth_initiatives": ["Tech partnerships", "Certifications", "New product launches"],
4. "operational_highlights": ["Plant 1 status", "Capacity expansion timelines"],
5. "management_guidance": ["FY27 Revenue Growth % target", "EBITDA Margin % target"],
6. "key_positives": ["Positive 1", "Positive 2"],
7. "key_challenges": ["Risk 1", "Risk 2"],
8. "management_tone": "Execution-Driven, Highly Confident",
9. "key_takeaway": "1-sentence executive bottom-line synthesis"
`;

  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [
          { role: "system", content: "You are a Senior Managing Director & Chief Equity Strategist at a top-tier institutional fund. Extract 8-section concall highlights in valid JSON." },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.05,
        max_tokens: 1200
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    let cleaned = data.choices[0].message.content.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(cleaned);
    }
  } catch (err) {}
  return null;
}

/**
 * REPLAY ALL FILINGS FROM AUGUST 1ST TO AUGUST 11TH ON ORACLE SERVER
 * (WITH DATABASE PERSISTENCE & 4 INSTITUTIONAL SYNTHESES REGENERATION)
 */
async function runAugustReplayOnServer() {
  ensureAuditDir();
  
  // Clear previous audit files
  fs.writeFileSync(TELEGRAM_ALERTS_FILE, `# 📱 Telegram Alerts Audit Log (August 1 - 11 Replay)\n\n*Generated on: ${new Date().toISOString()}*\n*Telegram Dispatches: DISABLED (Dry Run Audit)*\n*Database Persistence: ENABLED*\n\n---\n\n`);
  fs.writeFileSync(EXTRACTED_DATA_FILE, JSON.stringify([], null, 2));

  console.log('================================================================');
  console.log('=== ORACLE SERVER — AUGUST 1ST TO 11TH FULL REPLAY & AUDIT ===');
  console.log('=== (DATABASE UPDATES & 4 INSTITUTIONAL SYNTHESES REGENERATION: ENABLED) ===');
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

  const { rows: announcements } = await pool.query(
    `SELECT ca.id, ca.ticker, ca.title, ca.attachment_url, ca.created_at, s.company_name, s.id as stock_id
     FROM corporate_announcements ca
     JOIN stocks s ON ca.ticker = s.ticker
     WHERE ca.created_at >= '2026-08-01 00:00:00'
       AND ca.ticker = ANY($1)
       AND (
         ca.title ILIKE '%Financial Result%' OR 
         ca.title ILIKE '%Outcome of Board%' OR 
         ca.title ILIKE '%Con. Call%' OR 
         ca.title ILIKE '%Transcript%' OR 
         ca.title ILIKE '%Investor Presentation%' OR
         ca.title ILIKE '%AGM%' OR
         ca.title ILIKE '%Order%' OR
         ca.title ILIKE '%Award%'
       )
     ORDER BY ca.created_at ASC`,
    [core11Tickers]
  );

  writeLog("REPLAY", `Found ${announcements.length} core earnings, concall & AGM filings since August 1, 2026.`);
  console.log(`Processing ${announcements.length} filings. Telegram alerts are DISABLED. Database updates & 4 Syntheses regeneration ENABLED.\n`);

  const startTime = Date.now();
  const extractedDataList = [];
  const processedTickers = new Set();
  let count = 0;

  for (const item of announcements) {
    count++;
    
    // Progress logger every few items
    const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
    const progressPct = ((count / announcements.length) * 100).toFixed(1);
    
    if (count % 3 === 0 || count === 1 || count === announcements.length) {
      writeLog("PROGRESS", `📊 Status: ${count}/${announcements.length} filings processed (${progressPct}%). Elapsed: ${elapsedMinutes}m. Current: ${item.ticker}`);
    }

    if (!item.attachment_url) continue;

    let docText = "";
    try {
      docText = await extractTextFromPdfUrl(item.attachment_url);
    } catch (err) {
      writeLog("WARN", `Failed downloading PDF for ${item.ticker}: ${err.message}`);
      continue;
    }

    const titleLower = item.title.toLowerCase();
    const isConcall = titleLower.includes("transcript") || titleLower.includes("concall");
    const isResults = titleLower.includes("result") || titleLower.includes("outcome of board");
    const isOrderWin = titleLower.includes("order") || titleLower.includes("award") || titleLower.includes("contract");

    let proposedAlert = "";
    let extractedRecord = {
      id: item.id,
      ticker: item.ticker,
      companyName: item.company_name,
      filingTitle: item.title,
      publishedAt: item.created_at,
      pdfUrl: item.attachment_url,
      extractedTextLength: docText.length
    };

    // 1. Get Verified Financial Truth & Persist Snapshot
    const truth = getVerifiedGroundTruth(item.ticker);

    if (isResults && truth) {
      proposedAlert = `### 🚀 FINANCIAL RESULTS ALERT: ${item.company_name} (${item.ticker})\n` +
        `**Date:** ${new Date(item.created_at).toLocaleString('en-IN')}\n` +
        `**Signal:** ${truth.isMarginErosion ? '🟡 [HOLD]' : '🟢 [BUY/ADD]'}\n` +
        `**Verified Financial Metrics:**\n` +
        `• Revenue: ₹${truth.revenue} Cr (${truth.revenueYoYGrowthPct >= 0 ? '+' : ''}${truth.revenueYoYGrowthPct}% YoY)\n` +
        `• EBITDA: ₹${truth.ebitda} Cr (Margin: ${truth.ebitdaMarginPct}%, ${truth.ebitdaMarginBpsDelta >= 0 ? '+' : ''}${truth.ebitdaMarginBpsDelta} bps YoY)\n` +
        `• Consolidated PAT: ₹${truth.patConsolidated} Cr (${truth.patYoYGrowthPct >= 0 ? '+' : ''}${truth.patYoYGrowthPct}% YoY)\n\n` +
        `---\n\n`;
      
      extractedRecord.financialTruth = truth;
      processedTickers.add(item.ticker);
    } else if (isConcall && docText.length > 500) {
      const concallData = await generateInstitutionalConcallReport(item.ticker, item.company_name, docText);
      proposedAlert = `### 🎙️ CONCALL HIGHLIGHTS ALERT: ${item.company_name} (${item.ticker})\n` +
        `**Date:** ${new Date(item.created_at).toLocaleString('en-IN')}\n` +
        `**8-Section Concall Extraction:**\n\`\`\`json\n${JSON.stringify(concallData, null, 2)}\n\`\`\`\n\n` +
        `---\n\n`;
      
      extractedRecord.concallReport = concallData;
      processedTickers.add(item.ticker);
    } else if (isOrderWin) {
      proposedAlert = `### 📦 ORDER WIN DECLARED: ${item.company_name} (${item.ticker})\n` +
        `**Date:** ${new Date(item.created_at).toLocaleString('en-IN')}\n` +
        `**Title:** ${item.title}\n` +
        `**PDF:** ${item.attachment_url}\n\n` +
        `---\n\n`;
    }

    if (proposedAlert) {
      fs.appendFileSync(TELEGRAM_ALERTS_FILE, proposedAlert, 'utf8');
    }

    // 2. Run Commitment & Proof Reconciler (LIVE DB UPDATE)
    try {
      const reconciled = await reconcileCommitments(item.ticker, false); // dryRun = false (Persists to DB)
      extractedRecord.reconciledCommitments = reconciled;
    } catch (err) {}

    extractedDataList.push(extractedRecord);
    fs.writeFileSync(EXTRACTED_DATA_FILE, JSON.stringify(extractedDataList, null, 2));
  }

  // 3. REGENERATE 4 INSTITUTIONAL SYNTHESES FOR ALL PROCESSED TICKERS
  writeLog("REPLAY", `🔄 Regenerating 4 Institutional Synthesis Reports for ${processedTickers.size} updated tickers...`);
  for (const ticker of processedTickers) {
    try {
      writeLog("SYNTHESIS", `Regenerating 4 Institutional Syntheses for ${ticker}...`);
      await generateInstitutionalSyntheses(ticker);
      writeLog("SYNTHESIS", `✅ 4 Institutional Syntheses updated in DB for ${ticker}`);
    } catch (err) {
      writeLog("WARN", `Could not regenerate syntheses for ${ticker}: ${err.message}`);
    }
  }

  const totalTimeMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
  writeLog("REPLAY", `🎉 AUGUST REPLAY SIMULATION COMPLETED IN ${totalTimeMinutes} MINUTES!`);
  writeLog("REPLAY", `📄 Telegram Alerts Audit Log: audit_output/telegram_alerts_audit.md`);
  writeLog("REPLAY", `📊 Extracted Data JSON Audit: audit_output/extracted_data_audit.json`);

  process.exit(0);
}

runAugustReplayOnServer();
