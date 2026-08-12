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
 * UNIVERSAL DOCUMENT HIGHLIGHTS EXTRACTOR (Concalls, Investor Presentations, AGM Transcripts)
 */
async function extractDocumentHighlightsJson(ticker, companyName, rawText, docType = "Concall") {
  let cleanText = rawText.substring(0, 14000);

  const systemRole = `You are a Senior Managing Director & Chief Equity Strategist at an institutional fund. Extract structured, highly quantitative document highlights in valid JSON.

CRITICAL UNIT NORMALIZATION RULE (FOR ALL STOCKS):
Check document header for unit indicators: '(₹ in Lakhs)', '(₹ in Millions)', '(₹ in Mn)', or '(₹ in Crores)'.
ALWAYS CONVERT ALL MONETARY FIGURES INTO STANDARDIZED INR CRORES (₹ Cr):
- 10 Million = 1 Crore (Divide Mn by 10)
- 100 Lakhs = 1 Crore (Divide Lakhs by 100)
- Always format monetary figures as ₹ Cr (e.g. 'Revenue: ₹1,693.8 Cr', 'Order Book: ₹9,217 Cr'). NEVER output raw unscaled Millions or Lakhs as Crores.`;

  let userPrompt = "";
  if (docType === "Presentation") {
    userPrompt = `
Company: ${companyName} (${ticker})
Document Type: Investor Presentation PDF Text
${cleanText}

Extract valid JSON with keys:
1. "presentation_highlights": ["Highlight 1 with figures", "Highlight 2"],
2. "capacity_and_capex": ["Plant status", "Expansion timelines"],
3. "product_mix_and_exports": ["Value-added mix %", "Export share %"],
4. "order_book_and_clients": ["Order book size in ₹ Cr", "New client wins"],
5. "stock_price_drivers": ["Free Cash Flow (FCF) in ₹ Cr", "Debtor / Working Capital Days", "Net Debt / Net Cash in ₹ Cr"],
6. "guidance_and_outlook": ["FY27 Revenue/Margin target %"],
7. "key_takeaway": "1-sentence executive summary of the investor presentation"
`;
  } else if (docType === "AGM") {
    userPrompt = `
Company: ${companyName} (${ticker})
Document Type: AGM Speech / AGM Proceedings / AGM Transcript PDF Text
${cleanText}

Extract valid JSON with keys:
1. "chairman_speech_highlights": ["Key strategic point 1", "Strategic point 2"],
2. "capex_and_expansion_plans": ["Upcoming plant commissioning", "Capex budget in ₹ Cr"],
3. "long_term_vision": ["5-Year CAGR target %", "Revenue target for FY28/FY30"],
4. "dividend_and_shareholder_returns": ["Dividend per share", "Buyback / Rights updates"],
5. "voting_and_governance": ["Key resolutions passed", "Re-appointment approvals"],
6. "stock_price_drivers": ["Free Cash Flow (FCF)", "Debtor Days", "Demerger / Listing timeline"],
7. "key_takeaway": "1-sentence executive bottom-line of AGM proceedings"
`;
  } else {
    // Concall Transcript
    userPrompt = `
Company: ${companyName} (${ticker})
Document Type: Concall Transcript Text
${cleanText}

Extract valid JSON with keys:
1. "financial_performance": ["Revenue: ₹X Cr (+Y% YoY)", "EBITDA: ₹X Cr (Margin Y%)", "PAT: ₹X Cr"],
2. "business_performance": ["Division 1 details", "Contract wins with ₹ Cr sizes"],
3. "growth_initiatives": ["Tech partnerships", "Certifications", "New product launches"],
4. "operational_highlights": ["Plant 1 status", "Capacity expansion timelines"],
5. "stock_price_drivers": ["Free Cash Flow (FCF) in ₹ Cr", "Debtor / Working Capital Days", "Net Debt / Net Cash Status"],
6. "management_guidance": ["FY27 Revenue Growth % target", "EBITDA Margin % target"],
7. "key_positives": ["Positive 1", "Positive 2"],
8. "key_challenges": ["Risk 1", "Risk 2"],
9. "key_takeaway": "1-sentence executive bottom-line synthesis"
`;
  }

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
          { role: "system", content: systemRole },
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
 */
async function runFullThoroughAugustReplay() {
  ensureAuditDir();
  
  fs.writeFileSync(TELEGRAM_ALERTS_FILE, `# 📱 Telegram Alerts Audit Log (August 1 - 11 Complete Replay)\n\n*Generated on: ${new Date().toISOString()}*\n*Telegram Dispatches: DISABLED (Dry Run Audit)*\n*Scope: Results, Concalls, Investor Presentations, AGM Transcripts & Order Wins*\n\n---\n\n`);
  fs.writeFileSync(EXTRACTED_DATA_FILE, JSON.stringify([], null, 2));

  console.log('================================================================');
  console.log('=== ORACLE SERVER — AUGUST 1ST TO 11TH DEEP DOCUMENT REPLAY ===');
  console.log('=== (RESULTS, CONCALLS, INVESTOR PRESENTATIONS & AGM TRANSCRIPTS) ===');
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
  console.log(`Auditing ${announcements.length} filings with full AI Document Extraction. Outputs written to audit_output/\n`);

  const startTime = Date.now();
  const extractedDataList = [];
  const processedTickers = new Set();
  let count = 0;

  for (const item of announcements) {
    count++;
    const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
    const progressPct = ((count / announcements.length) * 100).toFixed(1);
    
    writeLog("PROGRESS", `[${count}/${announcements.length}] (${progressPct}%) Processing ${item.company_name} (${item.ticker}) — "${item.title.substring(0, 45)}..."`);

    if (!item.attachment_url) continue;

    let docText = "";
    try {
      docText = await extractTextFromPdfUrl(item.attachment_url);
    } catch (err) {
      writeLog("WARN", `Failed downloading PDF for ${item.ticker}: ${err.message}`);
      continue;
    }

    const titleLower = item.title.toLowerCase();
    const isResults = titleLower.includes("result") || titleLower.includes("outcome of board");
    const isConcall = titleLower.includes("transcript") || titleLower.includes("concall");
    const isPresentation = titleLower.includes("presentation") || titleLower.includes("investor presentation") || titleLower.includes("earning presentation");
    const isAgm = titleLower.includes("agm") || titleLower.includes("annual general meeting") || titleLower.includes("chairman speech");
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

    // 1. Financial Results Processing
    const truth = getVerifiedGroundTruth(item.ticker);
    if (isResults && truth) {
      const signalEmoji = truth.isMarginErosion ? '🟡 [HOLD]' : '🟢 [BUY/ADD]';
      const reportedPatStr = truth.reportedPat ? `\n• Reported PAT: ₹${truth.reportedPat} Cr (Includes ₹${truth.exceptionalGain} Cr Exceptional Item)` : '';
      const orderBookStr = truth.orderBookTotal ? `\n• Order Backlog: ₹${truth.orderBookTotal} Cr (Export Backlog: ₹${truth.exportOrderBook} Cr)` : '';
      
      proposedAlert = `### 🚀 FINANCIAL RESULTS DEEP-DIVE: ${item.company_name} (${item.ticker})\n` +
        `**Date:** ${new Date(item.created_at).toLocaleString('en-IN')}\n` +
        `**Signal:** ${signalEmoji}\n` +
        `**Verified Financial & Balance Sheet Metrics:**\n` +
        `• Revenue: ₹${truth.revenue} Cr (${truth.revenueYoYGrowthPct >= 0 ? '+' : ''}${truth.revenueYoYGrowthPct}% YoY)\n` +
        `• EBITDA: ₹${truth.ebitda} Cr (Margin: ${truth.ebitdaMarginPct}%, ${truth.ebitdaMarginBpsDelta >= 0 ? '+' : ''}${truth.ebitdaMarginBpsDelta} bps YoY)\n` +
        `• Core PAT: ₹${truth.patConsolidated} Cr (${truth.patYoYGrowthPct >= 0 ? '+' : ''}${truth.patYoYGrowthPct}% YoY)` +
        reportedPatStr +
        orderBookStr + `\n---\n\n`;
      
      extractedRecord.financialTruth = truth;
      processedTickers.add(item.ticker);
    } 
    // 2. Concall Highlights Processing
    else if (isConcall && docText.length > 500) {
      const concallReport = await extractDocumentHighlightsJson(item.ticker, item.company_name, docText, "Concall");
      if (concallReport) {
        proposedAlert = `### 🎙️ 8-SECTION CONCALL HIGHLIGHTS: ${item.company_name} (${item.ticker})\n` +
          `**Date:** ${new Date(item.created_at).toLocaleString('en-IN')}\n` +
          `**Key Takeaway:** ${concallReport.key_takeaway || 'N/A'}\n\n` +
          `**📊 Performance & Guidance Summary:**\n` +
          (concallReport.financial_performance || []).map(p => `• ${p}`).join('\n') + `\n\n` +
          `**🚀 Growth Initiatives & Execution:**\n` +
          (concallReport.growth_initiatives || []).map(g => `• ${g}`).join('\n') + `\n\n` +
          `**🎯 Management Guidance Targets:**\n` +
          (concallReport.management_guidance || []).map(m => `• ${m}`).join('\n') + `\n\n` +
          `---\n\n`;
        
        extractedRecord.concallReport = concallReport;
        processedTickers.add(item.ticker);
      }
    }
    // 3. Investor Presentation Highlights Processing
    else if (isPresentation && docText.length > 500) {
      const presReport = await extractDocumentHighlightsJson(item.ticker, item.company_name, docText, "Presentation");
      if (presReport) {
        proposedAlert = `### 📊 INVESTOR PRESENTATION HIGHLIGHTS: ${item.company_name} (${item.ticker})\n` +
          `**Date:** ${new Date(item.created_at).toLocaleString('en-IN')}\n` +
          `**Key Takeaway:** ${presReport.key_takeaway || 'N/A'}\n\n` +
          `**🚀 Key Presentation Highlights:**\n` +
          (presReport.presentation_highlights || []).map(h => `• ${h}`).join('\n') + `\n\n` +
          `**🏭 Capacity & Expansion Timelines:**\n` +
          (presReport.capacity_and_capex || []).map(c => `• ${c}`).join('\n') + `\n\n` +
          `**📦 Order Book & Client Wins:**\n` +
          (presReport.order_book_and_clients || []).map(o => `• ${o}`).join('\n') + `\n\n` +
          `---\n\n`;
        
        extractedRecord.presentationReport = presReport;
        processedTickers.add(item.ticker);
      }
    }
    // 4. AGM Highlights Processing
    else if (isAgm && docText.length > 500) {
      const agmReport = await extractDocumentHighlightsJson(item.ticker, item.company_name, docText, "AGM");
      if (agmReport) {
        proposedAlert = `### 🏛️ AGM SPEECH & PROCEEDINGS HIGHLIGHTS: ${item.company_name} (${item.ticker})\n` +
          `**Date:** ${new Date(item.created_at).toLocaleString('en-IN')}\n` +
          `**Key Takeaway:** ${agmReport.key_takeaway || 'N/A'}\n\n` +
          `**🎙️ Chairman's Vision & Strategy:**\n` +
          (agmReport.chairman_speech_highlights || []).map(c => `• ${c}`).join('\n') + `\n\n` +
          `**🔮 5-Year CAGR Vision & Long-Term Targets:**\n` +
          (agmReport.long_term_vision || []).map(v => `• ${v}`).join('\n') + `\n\n` +
          `**💰 Dividend & Shareholder Returns:**\n` +
          (agmReport.dividend_and_shareholder_returns || []).map(d => `• ${d}`).join('\n') + `\n\n` +
          `---\n\n`;
        
        extractedRecord.agmReport = agmReport;
        processedTickers.add(item.ticker);
      }
    }
    // 5. Order Win / Catalyst Alert Formatting
    else if (isOrderWin) {
      proposedAlert = `### 📦 ORDER WIN DECLARED: ${item.company_name} (${item.ticker})\n` +
        `**Date:** ${new Date(item.created_at).toLocaleString('en-IN')}\n` +
        `**Title:** ${item.title}\n` +
        `**Attachment:** [View PDF Document](${item.attachment_url})\n\n` +
        `---\n\n`;
    }

    if (proposedAlert) {
      fs.appendFileSync(TELEGRAM_ALERTS_FILE, proposedAlert, 'utf8');
    }

    // Reconcile Commitments (Persists to DB)
    try {
      const reconciled = await reconcileCommitments(item.ticker, false);
      extractedRecord.reconciledCommitments = reconciled;
    } catch (err) {}

    extractedDataList.push(extractedRecord);
    fs.writeFileSync(EXTRACTED_DATA_FILE, JSON.stringify(extractedDataList, null, 2));
  }

  // Regenerate 4 Institutional Syntheses in DB for all tickers
  writeLog("REPLAY", `🔄 Regenerating 4 Institutional Synthesis Reports in DB for ${processedTickers.size} updated tickers...`);
  for (const ticker of processedTickers) {
    try {
      writeLog("SYNTHESIS", `Regenerating 4 Institutional Syntheses for ${ticker}...`);
      await generateInstitutionalSyntheses(ticker, true); // force = true (Bypasses 6-hour cache check)
      writeLog("SYNTHESIS", `✅ 4 Institutional Syntheses updated in DB for ${ticker}`);
    } catch (err) {
      writeLog("WARN", `Could not regenerate syntheses for ${ticker}: ${err.message}`);
    }
  }

  const totalTimeMinutes = ((Date.now() - startTime) / 60000).toFixed(1);
  writeLog("REPLAY", `🎉 AUGUST DOCUMENT DEEP REPLAY COMPLETED IN ${totalTimeMinutes} MINUTES!`);
  writeLog("REPLAY", `📄 Telegram Alerts Audit Log: audit_output/telegram_alerts_audit.md`);
  writeLog("REPLAY", `📊 Extracted Data JSON Audit: audit_output/extracted_data_audit.json`);

  process.exit(0);
}

runFullThoroughAugustReplay();
