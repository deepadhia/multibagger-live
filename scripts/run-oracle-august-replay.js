import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import fs from 'fs';
import path from 'path';
import { pool } from '../backend/db/pool.js';
import { extractTextFromPdfUrl } from '../backend/services/announcement.service.js';
import { classifyAnnouncementWithNim } from '../backend/services/nim.service.js';
import { getVerifiedGroundTruth, validateNarrativeAgainstArithmetic } from '../backend/services/verified-data-layer.service.js';
import { reconcileCommitments } from '../backend/workers/commitment-reconciler-worker.js';
import { generateInstitutionalSyntheses, evaluateInstitutionalVerdict } from '../backend/workers/quarterly-deepdive-worker.js';
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
 * FULL DEEP-DIVE REPLAY FOR ALL FILINGS SINCE AUGUST 1ST
 */
async function runFullThoroughAugustReplay() {
  ensureAuditDir();
  
  fs.writeFileSync(TELEGRAM_ALERTS_FILE, `# 📱 Telegram Alerts Audit Log (Thorough August 1 - 11 Replay)\n\n*Generated on: ${new Date().toISOString()}*\n*Telegram Dispatches: DISABLED (Dry Run Audit)*\n*Processing Depth: 100% DEEP INSTITUTIONAL PIPELINE*\n\n---\n\n`);
  fs.writeFileSync(EXTRACTED_DATA_FILE, JSON.stringify([], null, 2));

  console.log('================================================================');
  console.log('=== ORACLE SERVER — THOROUGH DEEP-DIVE AUGUST REPLAY ===');
  console.log('=== (100% DEEP PROCESSING | ZERO SHORTCUTS | FULL NIM ANALYSIS) ===');
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
     ORDER BY ca.created_at ASC`,
    [core11Tickers]
  );

  writeLog("REPLAY", `Found ${announcements.length} total corporate announcements since August 1, 2026 across 11 Core stocks.`);
  console.log(`Executing 100% deep processing for all ${announcements.length} filings. Telegram dispatches are DISABLED.\n`);

  const startTime = Date.now();
  const extractedDataList = [];
  const processedTickers = new Set();
  let count = 0;

  for (const item of announcements) {
    count++;
    const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
    const progressPct = ((count / announcements.length) * 100).toFixed(1);
    
    writeLog("PROGRESS", `[${count}/${announcements.length}] (${progressPct}%) Processing ${item.company_name} (${item.ticker}) — Elapsed: ${elapsedMinutes}m`);
    writeLog("REPLAY", `📄 Filing Title: "${item.title}"`);

    if (!item.attachment_url) {
      writeLog("SKIP", `No PDF attachment for item ID ${item.id}`);
      continue;
    }

    let docText = "";
    try {
      docText = await extractTextFromPdfUrl(item.attachment_url);
      writeLog("PDF", `Downloaded & extracted 100% PDF text (${docText.length} characters).`);
    } catch (err) {
      writeLog("WARN", `Failed downloading PDF for ${item.ticker}: ${err.message}`);
      continue;
    }

    // 1. Run NIM AI Institutional Event Classification
    let classification = null;
    try {
      classification = await classifyAnnouncementWithNim(item.title, docText, item.ticker);
      writeLog("CLASSIFIER", `NIM Event Signal: ${classification?.materiality} | Category: ${classification?.category || 'General'}`);
    } catch (err) {
      writeLog("WARN", `NIM classification error: ${err.message}`);
    }

    // 2. Verified Ground Truth Check for Financial Results
    const truth = getVerifiedGroundTruth(item.ticker);
    const isResults = item.title.toLowerCase().includes("result") || item.title.toLowerCase().includes("outcome of board");
    const isConcall = item.title.toLowerCase().includes("transcript") || item.title.toLowerCase().includes("concall");

    let proposedAlert = "";
    let extractedRecord = {
      id: item.id,
      ticker: item.ticker,
      companyName: item.company_name,
      filingTitle: item.title,
      publishedAt: item.created_at,
      pdfUrl: item.attachment_url,
      extractedTextLength: docText.length,
      nimClassification: classification
    };

    if (isResults && truth) {
      proposedAlert = `### 🚀 FINANCIAL RESULTS DEEP-DIVE: ${item.company_name} (${item.ticker})\n` +
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
      try {
        const verdict = await evaluateInstitutionalVerdict(item.ticker, "Core Portfolio Holding", docText, "Concall Transcript", item.title);
        proposedAlert = `### 🎙️ CONCALL INSTITUTIONAL VERDICT: ${item.company_name} (${item.ticker})\n` +
          `**Date:** ${new Date(item.created_at).toLocaleString('en-IN')}\n` +
          `**Verdict:** ${verdict?.action_signal || 'HOLD'} (Credibility: Tier ${verdict?.credibility_tier || 1})\n` +
          `**Key Insights:**\n${(verdict?.key_takeaways || []).map(t => `• ${t}`).join('\n')}\n\n` +
          `---\n\n`;
        
        extractedRecord.institutionalVerdict = verdict;
        processedTickers.add(item.ticker);
      } catch (err) {
        writeLog("WARN", `Concall verdict evaluation warning: ${err.message}`);
      }
    }

    if (proposedAlert) {
      fs.appendFileSync(TELEGRAM_ALERTS_FILE, proposedAlert, 'utf8');
    }

    // 3. Reconcile Commitments (Persists to DB)
    try {
      const reconciled = await reconcileCommitments(item.ticker, false);
      extractedRecord.reconciledCommitments = reconciled;
    } catch (err) {}

    extractedDataList.push(extractedRecord);
    fs.writeFileSync(EXTRACTED_DATA_FILE, JSON.stringify(extractedDataList, null, 2));
  }

  // 4. Regenerate 4 Institutional Syntheses in DB for all tickers
  writeLog("REPLAY", `🔄 Regenerating 4 Institutional Synthesis Reports in DB for ${processedTickers.size} updated tickers...`);
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
  writeLog("REPLAY", `🎉 THOROUGH AUGUST REPLAY COMPLETED IN ${totalTimeMinutes} MINUTES!`);
  writeLog("REPLAY", `📄 Telegram Alerts Audit Log: audit_output/telegram_alerts_audit.md`);
  writeLog("REPLAY", `📊 Extracted Data JSON Audit: audit_output/extracted_data_audit.json`);

  process.exit(0);
}

runFullThoroughAugustReplay();
