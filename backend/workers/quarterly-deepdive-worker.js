/**
 * Quarterly Deep-Dive Worker
 * Processes queued quarterly filings (pending_stage1 and pending_stage2),
 * executes multi-prompt institutional deep-dives, updates management credibility ledger,
 * and emits actionable ADD / HOLD / TRIM Telegram alerts.
 */

import { pool } from "../db/pool.js";
import { extractTextFromPdfUrl } from "../services/announcement.service.js";
import { sendTelegramMessage } from "../services/telegram.service.js";
import { NVIDIA_API_KEY } from "../config/env.js";
import { extractDeterministicFinancials } from "../services/financial-validator.service.js";
import { applyInstitutionalGuard } from "../services/institutional-guard.service.js";

const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

/**
 * Truncates text safely to 22,000 characters to prevent 504 gateway timeouts.
 */
function capContext(text = "", maxChars = 14000) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  
  // Preserve start (opening statement) and end (Q&A/guidance)
  const half = Math.floor(maxChars / 2);
  const start = text.substring(0, half);
  const end = text.substring(text.length - half);
  return `${start}\n\n[... TRUNCATED MIDDLE CONTENT FOR NIM RATE LIMIT SAFETY ...]\n\n${end}`;
}

/**
 * Formats a filing date into standard Indian Fiscal Quarter (e.g. Q4 FY24, Q1 FY25).
 */
export function getIndianFiscalQuarter(dateInput) {
  if (!dateInput) return "Latest";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "Latest";

  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  let quarter = "";
  let fy = year;

  if (month >= 4 && month <= 6) {
    quarter = "Q4";
    fy = year;
  } else if (month >= 7 && month <= 9) {
    quarter = "Q1";
    fy = year + 1;
  } else if (month >= 10 && month <= 12) {
    quarter = "Q2";
    fy = year + 1;
  } else {
    quarter = "Q3";
    fy = year;
  }

  const fyShort = (fy % 100).toString().padStart(2, "0");
  return `${quarter} FY${fyShort}`;
}

/**
 * Checks if a guidance statement is procedural noise (SEBI compliance / investor meet boilerplate).
 */
export function isProceduralNoise(statement = "", metric = "") {
  const stmtLower = (statement || "").toLowerCase();
  const metricLower = (metric || "").toLowerCase();

  if (
    metricLower === "transparency" ||
    metricLower === "upsi disclosure" ||
    metricLower === "meeting schedule" ||
    metricLower === "general" ||
    metricLower === "disclosure transparency" ||
    metricLower.includes("dividend")
  ) {
    return true;
  }

  if (
    stmtLower.includes("upsi") ||
    stmtLower.includes("unpublished price sensitive") ||
    stmtLower.includes("investor presentation on the company") ||
    stmtLower.includes("trading window") ||
    stmtLower.includes("closure of trading") ||
    stmtLower.includes("analyst meeting") ||
    stmtLower.includes("institutional investor meeting") ||
    stmtLower.includes("no specific commitments") ||
    stmtLower.includes("schedule of analyst") ||
    stmtLower.includes("declaration of un-audited") ||
    stmtLower.includes("approved un-audited") ||
    stmtLower.includes("standalone financial results") ||
    stmtLower.includes("un-audited financial results") ||
    stmtLower.includes("compliant in disclosing") ||
    stmtLower.includes("dividend payout") ||
    stmtLower.includes("declaration of dividend")
  ) {
    return true;
  }

  return false;
}

/**
 * Executes a single NIM prompt with retry backoff.
 */
async function runNimPrompt(systemPrompt, userPrompt, temperature = 0.05) {
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY not configured.");
  }

  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 2000;
  const MODELS = [
    "meta/llama-3.1-70b-instruct",
    "meta/llama-3.3-70b-instruct"
  ];
  let lastErr;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180s timeout for heavy multi-prompt synthesis
    const currentModel = MODELS[(attempt - 1) % MODELS.length];

    try {
      const response = await fetch(NIM_BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: currentModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature,
          max_tokens: 2048
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`NIM API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
      console.warn(`[WORKER NIM] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        const isRateLimited = err.message && (
          err.message.includes("429") || 
          err.message.includes("503") || 
          err.message.includes("Rate") || 
          err.message.includes("ResourceExhausted") ||
          err.message.includes("Unavailable")
        );
        const delay = isRateLimited ? 12000 * attempt : BASE_DELAY_MS * attempt;
        if (isRateLimited) {
          console.log(`[NIM BACKOFF] HTTP 429/503 encountered. Backing off for ${delay / 1000}s before retry...`);
        }
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastErr;
}

/**
 * Formulates Institutional Action Verdict (ADD / HOLD / TRIM + Credibility Tier).
 */
export async function evaluateInstitutionalVerdict(ticker, thesis, text, stage, title = "") {
  const systemPrompt = `You are a Chief Investment Officer at an institutional long-only fund evaluating Indian growth equities.
Be extremely decisive, objective, and evidence-driven. Zero fluff allowed.`;

  let dbPromptDirective = "";
  try {
    const { rows } = await pool.query(
      `SELECT template FROM prompt_templates WHERE name IN ('strategic_accountability', 'strategic_evolution') LIMIT 1`
    );
    if (rows.length > 0 && rows[0].template) {
      dbPromptDirective = `\n\nInstitutional Accountability Prompt Directive:\n${rows[0].template}`;
    }
  } catch (err) {
    console.warn("[WORKER] Could not fetch DB prompt template, using default rules.");
  }

  // Split long concalls into 10,000-character overlapping chunks to audit 100% of Q&A (including middle sections)
  const CHUNK_SIZE = 10000;
  const OVERLAP = 1000;
  let textChunks = [];

  if (!text || text.length <= CHUNK_SIZE) {
    textChunks = [text || ""];
  } else {
    let offset = 0;
    while (offset < text.length && textChunks.length < 5) {
      textChunks.push(text.substring(offset, offset + CHUNK_SIZE));
      offset += (CHUNK_SIZE - OVERLAP);
    }
  }

  // Execute chunk evaluations concurrently in parallel via Promise.all
  const chunkResults = await Promise.all(
    textChunks.map(async (chunkText, idx) => {
      const userPrompt = `
Ticker: ${ticker}
Stage: ${stage === 'pending_stage1' ? 'Stage 1 (Earnings Results + PPT)' : 'Stage 2 (Concall Transcript Re-assessment)'}
Transcript Part: ${idx + 1} of ${textChunks.length}
Investment Thesis Context:
${thesis || "Growth investing, clean balance sheet, high ROCE."}

Filing Content (Part ${idx + 1}):
${chunkText}

── Tasks ──
1. Evaluate Management Credibility (Tier 1: High Track Record / Promises Kept | Tier 2: Neutral / Unproven | Tier 3: High Risk / Overpromises).
2. Determine Institutional Action Signal: ADD, HOLD, or TRIM.
3. List 3 concrete reasons supporting this signal.
4. Extract 1-2 core management commitments with target timelines.
5. EXPLICITLY DETECT GUIDANCE DELAYS: If a past commitment (e.g., plant commissioning, margin target, receivable reduction) was pushed back by 1-2 quarters in this concall/PPT, mark status as "Delayed", update the timeline, and extract the EXACT reason management gave into blockers_and_risks.

── Institutional Financial & Thesis Rules ──
1. MANDATORY YOY PRECEDENCE: YoY comparison (e.g. Q1 FY27 vs Q1 FY26) is MANDATORY and MUST take precedence over QoQ sequential comparisons. If PAT contracts YoY (> -10%) or EBITDA margin contracts YoY (> -200 bps), the summary MUST lead with this YoY contraction as the headline financial result. NEVER bury a YoY profit or margin decline behind a QoQ sequential recovery framing.
2. PAT PRECISION: Always extract Consolidated Net Profit (PAT) attributable to Owners of the Company. NEVER use intermediate pre-tax, pre-associate, or standalone line items when consolidated tables are present.
3. MANDATORY EBITDA & MARGINS: Always extract/calculate EBITDA (PBT + Finance Costs + Depreciation) and EBITDA Margin % (EBITDA / Revenue * 100). Include EBITDA YoY % growth and EBITDA Margin bps expansion/contraction.
4. SEGMENT RED FLAG DETECTION: Extract all segment-wise results (Revenue & EBIT) and explicitly highlight any segment experiencing a YoY revenue/EBIT decline > 20% as a Segment Red Flag (e.g. Segment A EBIT declining > 20% YoY). NEVER claim 'no red flags' when a major segment collapses YoY.
5. MULTI-VERTICAL THESIS RESPECT: NEVER claim a company has single-segment operations or lacks growth catalysts when the investment thesis or filing explicitly details multiple verticals (e.g. Real Estate + Data Centers + Ashok Cloud).
6. ANTI-HALLUCINATION: NEVER report future quarter numbers (e.g. Q2 FY27) as actual achieved performance. Label any forward figure as 'Management Target/Guidance', never actuals.
7. ACTION SIGNAL RECALIBRATION:
   - If PAT contracts > 15% YoY or EBITDA Margin contracts > 300 bps YoY, Action Signal MUST NOT be BUY/ADD. Evaluate as HOLD (Conviction 5/10) or TRIM (Conviction 4/10).
   - If Revenue, EBITDA (+20%+ YoY, 29% margin), and PAT (+18%+ YoY) show a clean beat alongside live structural catalysts (demerger/capex), evaluate Action Signal as ADD (Conviction 8-9/10).
${dbPromptDirective}

Return ONLY a valid JSON object:
{
  "credibility_tier": "Tier 1" | "Tier 2" | "Tier 3",
  "action_signal": "ADD" | "HOLD" | "TRIM",
  "conviction_score": 1 to 10,
  "verdict_summary": "2-3 sentence executive summary explaining the ADD/HOLD/TRIM rating.",
  "key_drivers": ["Driver 1", "Driver 2", "Driver 3"],
  "commitments": [
    {
      "statement": "Commitment text",
      "metric": "Metric name (e.g. EBITDA Margin, Plant Commissioning, Receivables Days)",
      "target_value": "Target figure",
      "timeline": "Target quarter/year (e.g. Q3 FY26)",
      "status": "Pending" | "Achieved" | "Partially Achieved" | "Missed",
      "status_rule": "CRITICAL: For multi-stage regulatory processes (e.g. Demergers, NCLT approvals, QIP allotments, Plant Commissioning), initial Board approval MUST be marked status 'Pending' (In Progress). Mark 'Achieved' ONLY when final operational completion or regulatory clearance is explicitly documented in the evidence.",
      "blockers_and_risks": "If Delayed or Missed, specify the exact reason given by management in concall (e.g. 'Equipment lead time & customs clearance delay by 2 quarters')",
      "credibility_impact": "positive" | "neutral" | "negative"
    }
  ]
}
`;
      try {
        const resText = await runNimPrompt(systemPrompt, userPrompt, 0.05);
        if (!resText || typeof resText !== "string") return null;

        let cleaned = resText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
          .replace(/,\s*([\}\]])/g, "$1")
          .trim();
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }

        try {
          return JSON.parse(cleaned);
        } catch (e1) {
          try {
            const sanitised = cleaned
              .replace(/:\s*"([^"]*?)"(?=\s*[,\}])/g, (m, val) => `: "${val.replace(/[\r\n]/g, ' ').replace(/"/g, "'")}"`)
              .replace(/[\r\n\t]/g, " ");
            return JSON.parse(sanitised);
          } catch (e2) {
            const signalMatch = cleaned.match(/"action_signal"\s*:\s*"(BUY|ADD|HOLD|TRIM|EXIT)"/i);
            const scoreMatch = cleaned.match(/"conviction_score"\s*:\s*(\d{1,2})/);
            const credMatch = cleaned.match(/"credibility_tier"\s*:\s*"(Tier\s*[123])"/i);
            const summaryMatch = cleaned.match(/"verdict_summary"\s*:\s*"([^"]+)"/i);
            
            if (signalMatch || summaryMatch) {
              return {
                action_signal: signalMatch ? signalMatch[1].toUpperCase() : "ADD",
                conviction_score: scoreMatch ? parseInt(scoreMatch[1], 10) : 7,
                credibility_tier: credMatch ? credMatch[1] : "Tier 1",
                verdict_summary: summaryMatch ? summaryMatch[1] : "Filing evaluated cleanly.",
                key_drivers: [],
                commitments: []
              };
            }
            console.warn("[WORKER CHUNK WARN] Complete JSON repair fallback triggered:", e2.message);
            return null;
          }
        }
      } catch (err) {
        console.warn(`[WORKER CHUNK WARN] Part ${idx + 1} extraction failed:`, err.message);
      }
      return null;
    })
  );

  // Merge and deduplicate commitments & drivers from ALL parallel chunks
  const validResults = chunkResults.filter(Boolean);
  if (validResults.length === 0) {
    return {
      credibility_tier: "Tier 2",
      action_signal: "HOLD",
      conviction_score: 5,
      verdict_summary: "Deep-dive completed; maintaining neutral hold signal.",
      key_drivers: ["Results under evaluation"],
      commitments: []
    };
  }

  const mergedVerdict = {
    credibility_tier: validResults[0].credibility_tier || "Tier 2",
    action_signal: validResults[0].action_signal || "HOLD",
    conviction_score: validResults[0].conviction_score || 5,
    verdict_summary: validResults[0].verdict_summary || "",
    key_drivers: [],
    commitments: []
  };

  const seenStatements = new Set();
  const seenDrivers = new Set();

  for (const res of validResults) {
    if (res.key_drivers) {
      for (const d of res.key_drivers) {
        if (d && !seenDrivers.has(d.toLowerCase())) {
          seenDrivers.add(d.toLowerCase());
          mergedVerdict.key_drivers.push(d);
        }
      }
    }
    if (res.commitments) {
      for (const c of res.commitments) {
        const sKey = (c.statement || "").toLowerCase().trim();
        if (sKey && !seenStatements.has(sKey)) {
          seenStatements.add(sKey);
          mergedVerdict.commitments.push(c);
        }
      }
    }
  }

  const finData = extractDeterministicFinancials(text);
  return applyInstitutionalGuard(mergedVerdict, finData, title, ticker);
}

/**
 * Main worker loop function.
 * @param {Object} options - Worker options
 * @param {boolean} [options.suppressTelegram=false] - Whether to skip Telegram alerts (useful during bulk backfills)
 */
export async function processPendingDeepDives(options = {}) {
  const { suppressTelegram = false, tickers = null, batchSize = 4, allowHistorical = false } = options;
  console.log(`[WORKER] Polling for pending quarterly deep-dives (parallel batch size: ${batchSize})...`);
  
  let queryText = `SELECT ca.id, ca.stock_id, ca.ticker, ca.title, ca.attachment_url, ca.filing_date, ca.deep_dive_status,
            s.investment_thesis, s.company_name
     FROM corporate_announcements ca
     JOIN stocks s ON s.id = ca.stock_id
     WHERE ca.deep_dive_status IN ('pending_stage1', 'pending_stage2')
       AND s.category = 'Core'`;

  if (!allowHistorical && !suppressTelegram) {
    queryText += ` AND ca.created_at >= NOW() - INTERVAL '30 days'`;
  }
  
  const queryParams = [];
  if (tickers && tickers.length > 0) {
    queryParams.push(tickers);
    queryText += ` AND ca.ticker = ANY($1)`;
  }
  queryText += ` ORDER BY ca.filing_date ASC, ca.created_at ASC LIMIT ${batchSize}`;

  const { rows: pendingList } = await pool.query(queryText, queryParams);

  if (pendingList.length === 0) {
    console.log("[WORKER] No pending quarterly deep-dives in queue.");
    return { processed: 0 };
  }

  console.log(`[WORKER] Found ${pendingList.length} filings. Executing concurrent batch...`);

  // Execute the batch concurrently with a small stagger delay
  const results = await Promise.all(pendingList.map(async (item, idx) => {
    if (idx > 0) await new Promise(r => setTimeout(r, idx * 250));
    try {
      console.log(`[WORKER PARALLEL] Processing ${item.ticker} (${item.deep_dive_status}) - Filing Date: ${item.filing_date || 'N/A'}...`);
      
      let docText = "";
      if (item.attachment_url) {
        docText = await extractTextFromPdfUrl(item.attachment_url);
      }
      if (!docText || docText.length < 50) {
        docText = item.title;
      }

      // ── FAST CONTENT PRE-FILTER: Instant 1ms skip for routine cover letters ──
      const textLower = (docText + " " + item.title).toLowerCase();
      const isRoutineNotice =
        docText.length < 450 ||
        textLower.includes("trading window") ||
        textLower.includes("loss of share certificate") ||
        textLower.includes("dematerialisation") ||
        textLower.includes("newspaper publication") ||
        textLower.includes("audio recording") ||
        textLower.includes("intimation of schedule of analyst") ||
        textLower.includes("closure of trading") ||
        textLower.includes("investor meet");

      const isCoreEarningsDoc =
        textLower.includes("transcript") ||
        textLower.includes("concall") ||
        textLower.includes("presentation") ||
        textLower.includes("financial result") ||
        textLower.includes("outcome of board meeting") ||
        textLower.includes("investor presentation") ||
        textLower.includes("result release");

      const isHighValueOperationalDoc =
        textLower.includes("commission") ||
        textLower.includes("commercial production") ||
        textLower.includes("commercial operation") ||
        textLower.includes("plant") ||
        textLower.includes("facility") ||
        textLower.includes("factory") ||
        textLower.includes("unit") ||
        textLower.includes("order") ||
        textLower.includes("award") ||
        textLower.includes("contract") ||
        textLower.includes("expansion") ||
        textLower.includes("acquisition") ||
        textLower.includes("joint venture");

      if (isRoutineNotice && !isCoreEarningsDoc && !isHighValueOperationalDoc) {
        console.log(`[WORKER FAST-SKIP] Marked procedural filing as not_required: ${item.title}`);
        await pool.query("UPDATE corporate_announcements SET deep_dive_status = 'not_required' WHERE id = $1", [item.id]);
        return { success: true, skipped: true };
      }

      const cappedText = capContext(docText);

      // Evaluate Institutional Verdict via NVIDIA NIM LLM
      const verdict = await evaluateInstitutionalVerdict(
        item.ticker,
        item.investment_thesis,
        cappedText,
        item.deep_dive_status,
        item.title
      );

      // Save commitments into management_commitments table with deduplication & noise filtering
      if (verdict.commitments && verdict.commitments.length > 0) {
        for (const comm of verdict.commitments) {
          const statementText = comm.statement || "Management guidance";
          const metricText = comm.metric || "Operational";

          // Skip procedural compliance boilerplate
          if (isProceduralNoise(statementText, metricText)) {
            continue;
          }

          const quarter = getIndianFiscalQuarter(item.filing_date);

          // Deduplication check
          const { rows: existing } = await pool.query(
            `SELECT id FROM management_commitments WHERE stock_id = $1 AND quarter = $2 AND statement = $3`,
            [item.stock_id, quarter, statementText]
          );

          let normalizedStatus = "Pending";
          const sLower = (comm.status || "").toLowerCase();
          if (sLower.includes("achieved") && !sLower.includes("partially")) normalizedStatus = "Achieved";
          else if (sLower.includes("partially")) normalizedStatus = "Partially Achieved";
          else if (sLower.includes("missed") || sLower.includes("broken")) normalizedStatus = "Missed";

          if (existing.length === 0) {
            await pool.query(
              `INSERT INTO management_commitments 
                (stock_id, ticker, quarter, statement, metric, target_value, timeline, status, evidence_summary, credibility_impact, blockers_and_risks)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                item.stock_id,
                item.ticker,
                quarter,
                statementText,
                metricText,
                comm.target_value || "As stated",
                comm.timeline || "Medium Term",
                normalizedStatus,
                verdict.verdict_summary,
                comm.credibility_impact || (verdict.credibility_tier === "Tier 1" ? "positive" : (verdict.credibility_tier === "Tier 3" ? "negative" : "neutral")),
                comm.blockers_and_risks || null
              ]
            ).catch(err => console.warn(`[WORKER] Commitment save warning for ${item.ticker}:`, err.message));
          }
        }
      }

      // Mark deep_dive_status = 'completed' & save full institutional verdict JSON
      await pool.query(
        `UPDATE corporate_announcements 
         SET deep_dive_status = 'completed',
             event_analysis = COALESCE(event_analysis, '{}'::jsonb) || $2::jsonb
         WHERE id = $1`,
        [item.id, JSON.stringify({ institutional_verdict: verdict })]
      );

      // Automatically reconcile stock guidance statuses & regenerate 4 Institutional Syntheses
      await reconcileStockCommitments(item.ticker);
      await generateInstitutionalSyntheses(item.ticker).catch(err => console.warn(`[WORKER] Synthesis update warning for ${item.ticker}:`, err.message));

      // Send Action Telegram Alert (unless suppressed for bulk backfill or generic fallback)
      const isGenericFallback = 
        !verdict.verdict_summary ||
        verdict.verdict_summary.includes("Results under evaluation") ||
        verdict.verdict_summary.includes("Deep-dive completed; maintaining neutral hold signal") ||
        verdict.verdict_summary.includes("Filing evaluated cleanly.");

      if (!suppressTelegram && !isGenericFallback) {
        const signalEmoji = verdict.action_signal === "ADD" 
          ? "🟢 [BUY/ADD]" 
          : (verdict.action_signal === "TRIM" ? "🔴 [TRIM/SELL]" : (verdict.action_signal === "EXIT" ? "🔴 [EXIT]" : "🟡 [HOLD]"));
        const stageName = item.deep_dive_status === "pending_stage1" ? "Stage 1: Earnings & PPT" : "Stage 2: Concall Transcript";

        let finText = "";
        if (verdict.financial_highlights) {
          const fh = verdict.financial_highlights;
          const parts = [];
          if (fh.revenue && fh.revenue !== "N/A") parts.push(`• *Revenue:* ${fh.revenue}`);
          if (fh.ebitda && fh.ebitda !== "N/A") parts.push(`• *EBITDA:* ${fh.ebitda} (Margin: ${fh.ebitda_margin || 'N/A'}, ${fh.ebitda_margin_delta || 'N/A'})`);
          if (fh.pat_consolidated && fh.pat_consolidated !== "N/A") parts.push(`• *Consolidated PAT:* ${fh.pat_consolidated}`);
          if (fh.exceptional_gain_post_tax) parts.push(`• ⚠️ *Exceptional Gain:* ${fh.exceptional_gain_post_tax}`);
          if (fh.normalised_pat) parts.push(`• *Normalised PAT:* ${fh.normalised_pat}`);
          if (parts.length > 0) {
            finText = `\n*Financial Highlights & Growth Metrics:*\n${parts.join('\n')}\n`;
          }
        }

        // Format Commitment Reconciliation & Concall Checklist Sections
        let commText = "";
        if (verdict.commitments && Array.isArray(verdict.commitments) && verdict.commitments.length > 0) {
          const achieved = verdict.commitments.filter(c => (c.status || "").toLowerCase().includes("achieved"));
          const missed = verdict.commitments.filter(c => (c.status || "").toLowerCase().includes("missed"));
          
          const commParts = [];
          if (achieved.length > 0) {
            commParts.push(`*✅ Fulfilled Commitments:*`);
            achieved.forEach(c => commParts.push(`• ${c.statement} (${c.status === "Achieved Ahead of Schedule" ? "⭐ Achieved Ahead of Schedule" : "Achieved"})`));
          }
          if (missed.length > 0) {
            commParts.push(`*🔴 Missed Commitments:*`);
            missed.forEach(c => commParts.push(`• ${c.statement} (Missed: ${c.blockers_and_risks || 'Target not met'})`));
          }
          if (commParts.length > 0) {
            commText = `\n${commParts.join('\n')}\n`;
          }
        }

        let concallText = "";
        if (item.deep_dive_status === "pending_stage2" || item.title.toLowerCase().includes("transcript") || item.title.toLowerCase().includes("concall")) {
          console.log(`[WORKER] Generating rich segment-by-segment concall highlights for ${item.ticker}...`);
          const ch = await generateStructuredConcallHighlights(item.ticker, item.company_name, docText);
          if (ch && ch.segment_highlights && ch.segment_highlights.length > 0) {
            verdict.concall_highlights = ch;
          }
        }

        if (verdict.concall_highlights) {
          const ch = verdict.concall_highlights;
          const finSec = (ch.financial_performance || ch.performance_overview || []).length > 0
            ? `\n*📊 Financial Performance & Order Book:*\n${(ch.financial_performance || ch.performance_overview).map(p => `• ${p}`).join('\n')}\n`
            : "";
          const bizSec = (ch.business_performance || ch.segment_highlights || []).length > 0
            ? `\n*📦 Business Performance & Contract Wins:*\n${(ch.business_performance || ch.segment_highlights).map(b => `• ${b}`).join('\n')}\n`
            : "";
          const growthSec = (ch.growth_initiatives || ch.strategic_growth_drivers || []).length > 0
            ? `\n*🚀 Growth Initiatives & Tech Catalysts:*\n${(ch.growth_initiatives || ch.strategic_growth_drivers).map(g => `• ${g}`).join('\n')}\n`
            : "";
          const opsSec = (ch.operational_highlights || []).length > 0
            ? `\n*🏭 Operational Highlights & Plant Status:*\n${ch.operational_highlights.map(o => `• ${o}`).join('\n')}\n`
            : "";
          const guidSec = (ch.management_guidance || []).length > 0
            ? `\n*📈 Management Guidance & Outlook:*\n${ch.management_guidance.map(g => `• ${g}`).join('\n')}\n`
            : "";
          const posSec = (ch.key_positives || []).length > 0
            ? `\n*✅ Key Positives:*\n${ch.key_positives.map(p => `• ${p}`).join('\n')}\n`
            : "";
          const chalSec = (ch.key_challenges || ch.key_risks || []).length > 0
            ? `\n*⚠️ Key Challenges & Risks:*\n${(ch.key_challenges || ch.key_risks).map(c => `• ${c}`).join('\n')}\n`
            : "";
          const toneSec = ch.management_tone
            ? `\n*🗣️ Management Tone:* ${ch.management_tone}\n`
            : "";
          const takeawaySec = ch.key_takeaway
            ? `\n*🔑 Key Takeaway:*\n${ch.key_takeaway}\n`
            : "";

          const alertMsg = `
🎙️ *${item.company_name.toUpperCase()} (${item.ticker}) | CONCALL HIGHLIGHTS*

*Action Signal:* ${signalEmoji} (Conviction: ${verdict.conviction_score}/10)
*Management Credibility:* ${verdict.credibility_tier}
${finSec}${bizSec}${growthSec}${opsSec}${guidSec}${commText}${posSec}${chalSec}${toneSec}${takeawaySec}
_Analysis generated by Institutional Engine_
`.trim();

          await sendTelegramMessage(alertMsg);
        } else {
          const validDrivers = (verdict.key_drivers || []).filter(d => d && d !== "Results under evaluation");
          const driversText = validDrivers.length > 0 
            ? `\n*Key Thesis Drivers:*\n${validDrivers.map(d => `• ${d}`).join('\n')}\n`
            : "";

          const concallPoints = verdict.dodged_questions || verdict.concall_verification_points || verdict.concall_checklist;
          if (concallPoints && Array.isArray(concallPoints) && concallPoints.length > 0) {
            concallText = `\n*🎙️ Concall Verification Points (What to check in Q&A):*\n${concallPoints.map(p => `• ${p}`).join('\n')}\n`;
          }

          const alertMsg = `
📊 *INSTITUTIONAL QUARTERLY VERDICT*
*Stock:* ${item.company_name} (${item.ticker})
*Review Stage:* ${stageName}

*Action Signal:* ${signalEmoji} (Conviction: ${verdict.conviction_score}/10)
*Management Credibility:* ${verdict.credibility_tier}
${finText}${commText}
*Verdict Summary:*
${verdict.verdict_summary}
${driversText}${concallText}
_Analysis generated by Institutional Engine_
`.trim();

          await sendTelegramMessage(alertMsg);
        }
      }

      console.log(`[WORKER PARALLEL] Completed deep-dive for ${item.ticker} (ID: ${item.id})`);
      return true;

    } catch (err) {
      console.error(`[WORKER ERROR] Deep-dive failed for ${item.ticker} (ID: ${item.id}):`, err.message);
      await pool.query(
        "UPDATE corporate_announcements SET deep_dive_status = 'failed' WHERE id = $1",
        [item.id]
      );
      return false;
    }
  }));

  // Rate limit pause between batches
  await new Promise(r => setTimeout(r, 2000));

  const processedCount = results.filter(Boolean).length;
  return { processed: processedCount };
}

// Run directly if invoked from CLI
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  processPendingDeepDives().then(res => {
    console.log(`[WORKER] Finished processing ${res.processed} deep-dives.`);
    process.exit(0);
  }).catch(err => {
    console.error("[WORKER FATAL]", err);
    process.exit(1);
  });
}

/**
 * Automatically reconciles past pending commitments for a stock dynamically against reported financials & corporate actions.
 */
export async function reconcileStockCommitments(ticker) {
  if (!ticker) return;

  try {
    // 1. Fetch pending commitments for this ticker
    const { rows: pendingComms } = await pool.query(
      "SELECT id, statement, metric, target_value, timeline FROM management_commitments WHERE ticker = $1 AND status = 'Pending'",
      [ticker]
    );

    if (pendingComms.length === 0) return;

    // 2. Fetch latest filing text & financials
    const { rows: annRows } = await pool.query(
      `SELECT title, attachment_url, event_analysis 
       FROM corporate_announcements 
       WHERE ticker = $1 AND event_analysis IS NOT NULL 
       ORDER BY filing_date DESC LIMIT 1`,
      [ticker]
    );

    if (annRows.length === 0) return;

    const latestAnn = annRows[0];
    const verdict = latestAnn.event_analysis?.institutional_verdict;
    if (!verdict) return;

    // 3. Process each commitment dynamically using deterministic guard & extracted highlights
    for (const comm of pendingComms) {
      const stmtLower = (comm.statement || "").toLowerCase();
      const metricLower = (comm.metric || "").toLowerCase();

      // Check if financial highlights or verdict key drivers evidence fulfillment
      const driversText = (verdict.key_drivers || []).join(" ").toLowerCase();
      const summaryText = (verdict.verdict_summary || "").toLowerCase();
      const fullContextText = `${driversText} ${summaryText}`;

      // Exclude regulatory approvals from auto-achieved
      const isRegulatoryAction = 
        stmtLower.includes("scheme of arrangement") || 
        stmtLower.includes("nclt") || 
        stmtLower.includes("sebi approval") || 
        stmtLower.includes("demerger") ||
        metricLower.includes("regulatory");

      if (!isRegulatoryAction) {
        // Dynamic operational/financial target matching
        if (
          (stmtLower.includes("margin") && verdict.financial_highlights?.ebitda_margin) ||
          (stmtLower.includes("revenue") && verdict.financial_highlights?.revenue) ||
          (stmtLower.includes("capacity") && (fullContextText.includes("capacity") || fullContextText.includes("commissioned")))
        ) {
          await pool.query(
            `UPDATE management_commitments 
             SET status = 'Achieved',
                 credibility_impact = 'positive',
                 evidence_summary = $1
             WHERE id = $2`,
            [`Validated dynamically by ${latestAnn.title}: ${(verdict.verdict_summary || "").substring(0, 150)}...`, comm.id]
          );
        }
      }
    }
  } catch (err) {
    console.warn(`[WORKER] Guidance reconciliation warning for ${ticker}:`, err.message);
  }
}

/**
 * Generates and persists the 4 Institutional Synthesis Reports for a stock using NVIDIA NIM LLM.
 */
export async function generateInstitutionalSyntheses(ticker) {
  if (!ticker) return;

  console.log(`[SYNTHESIS] Generating 4 Institutional Synthesis Reports for ${ticker}...`);

  try {
    const { rows: stockRows } = await pool.query(
      "SELECT id, company_name, ticker, investment_thesis, key_thesis_metrics FROM stocks WHERE ticker = $1",
      [ticker]
    );
    if (stockRows.length === 0) return;
    const stock = stockRows[0];

    const { rows: comms } = await pool.query(
      `SELECT statement, metric, target_value, timeline, status, credibility_impact, blockers_and_risks 
       FROM management_commitments WHERE ticker = $1 ORDER BY created_at DESC`,
      [ticker]
    );

    const { rows: snapshots } = await pool.query(
      `SELECT quarter, thesis_status, thesis_momentum, confidence_score, final_action, summary, metrics, red_flags, dodged_questions
       FROM quarterly_snapshots
       WHERE stock_id = $1
       ORDER BY quarter DESC`,
      [stock.id]
    );

    const { rows: interQuarterEvents } = await pool.query(
      `SELECT event_date, event_type, title, value_in_cr, counterparty, description, bse_filing_url
       FROM interquarter_events
       WHERE stock_id = $1
       ORDER BY event_date DESC`,
      [stock.id]
    );

    const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;
    const latestQuarterLabel = latestSnapshot ? latestSnapshot.quarter : 'N/A';

    const formattedInterQuarterEvents = interQuarterEvents.map(e => 
      `• [${e.event_date}] ${e.event_type}: ${e.title} ${e.value_in_cr ? `(Value: ₹${e.value_in_cr} Cr)` : ''} - ${e.description} [Ref: ${e.bse_filing_url || 'SEBI_LODR_FILING'}]`
    ).join('\n');

    const formattedMetricsHistory = snapshots.map((s, idx) => {
      const m = s.metrics || {};
      const rev = m.revenue_growth ? `Revenue Growth: ${m.revenue_growth.value} [Evidence: ${m.revenue_growth.evidence}]` : 'Revenue Growth: N/A';
      const pat = m.pat_growth ? `PAT Growth: ${m.pat_growth.value} [Evidence: ${m.pat_growth.evidence}]` : 'PAT Growth: N/A';
      const opm = m.opm ? `EBITDA Margin: ${m.opm.value} [Evidence: ${m.opm.evidence}]` : 'EBITDA Margin: N/A';
      const primary = m.primary_thesis_metric ? `Primary Thesis Metric (${m.primary_thesis_metric.metric_name || 'Key Metric'}): ${m.primary_thesis_metric.value} [Evidence: ${m.primary_thesis_metric.evidence}]` : '';

      return `### Quarter: ${s.quarter}${idx === 0 ? ' 🔥 [LATEST CURRENT GROUND TRUTH PERIOD]' : ' (Historical Period)'}
- Thesis Signal: ${s.thesis_status} | Momentum: ${s.thesis_momentum} | Conviction Score: ${s.confidence_score}/100 | Action: ${s.final_action}
- Verified Financial & Thesis Metrics:
  • ${rev}
  • ${pat}
  • ${opm}
  ${primary ? `• ${primary}` : ''}
- Quarterly Executive Summary: ${s.summary || 'N/A'}`;
    }).join('\n\n');

    const metricsPlaceholderContent = [
      `Key Thesis Definition: ${stock.key_thesis_metrics || 'Financial & Operational Performance'}`,
      `🔥 CURRENT LATEST GROUND TRUTH PERIOD FOR ${stock.ticker}: ${latestQuarterLabel}`,
      `⚡ VERIFIED SEBI REG 30 INTER-QUARTER DISCLOSURES & AGM DISCLOSURES:`,
      formattedInterQuarterEvents || 'No inter-quarter SEBI Reg 30 disclosures pending.',
      `\nMulti-Quarter Verified Financial & Operational Metrics Timeline:`,
      formattedMetricsHistory || 'No quarterly snapshot metrics recorded yet.'
    ].join('\n\n');

    const { rows: promptTemplates } = await pool.query(
      "SELECT name, title, template FROM prompt_templates ORDER BY name"
    );

    const totalComms = comms.length;
    const achieved = comms.filter(c => (c.status || '').toLowerCase() === 'achieved').length;
    const missed = comms.filter(c => (c.status || '').toLowerCase() === 'missed').length;
    const partial = comms.filter(c => (c.status || '').toLowerCase().includes('partially')).length;
    const pending = comms.filter(c => (c.status || '').toLowerCase() === 'pending').length;
    const achievedPct = totalComms > 0 ? ((achieved / totalComms) * 100).toFixed(1) : '0.0';
    const missedPct = totalComms > 0 ? ((missed / totalComms) * 100).toFixed(1) : '0.0';
    const partialPct = totalComms > 0 ? ((partial / totalComms) * 100).toFixed(1) : '0.0';
    const pendingPct = totalComms > 0 ? ((pending / totalComms) * 100).toFixed(1) : '0.0';

    const commScorecard = `### Management Commitment Execution Scorecard (Empirical Database Totals):
- Total Tracked Commitments: ${totalComms}
- 🟢 Achieved / Fulfilled: ${achieved} (${achievedPct}%)
- 🔴 Missed / Broken / Dropped Guidance: ${missed} (${missedPct}%)
- 🟡 Partially Achieved: ${partial} (${partialPct}%)
- ⏳ Pending / In-Progress: ${pending} (${pendingPct}%)`;

    const commitmentsSummary = comms.map(c => 
      `• [Title: ${c.commitment_title || 'N/A'}] Statement: ${c.statement} | Metric: ${c.metric} | Target: ${c.target_value} | Timeline: ${c.timeline} | Status: ${c.status} | Impact: ${c.credibility_impact}${c.blockers_and_risks ? ` | Blockers: ${c.blockers_and_risks}` : ''}`
    ).join('\n');

    // Fetch existing synthesis timestamps for ticker
    const { rows: existingSyntheses } = await pool.query(
      "SELECT prompt_name, updated_at FROM stock_syntheses WHERE ticker = $1",
      [ticker]
    );
    const existingMap = new Map(existingSyntheses.map(s => [s.prompt_name, new Date(s.updated_at).getTime()]));
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    const nowMs = Date.now();

    for (const p of promptTemplates) {
      // If this prompt was updated in the last 6 hours, skip to save time & avoid timeouts
      const lastUpdated = existingMap.get(p.name);
      if (lastUpdated && (nowMs - lastUpdated < SIX_HOURS_MS)) {
        console.log(`[SYNTHESIS SKIP] Report '${p.title}' for ${ticker} updated recently (${Math.round((nowMs - lastUpdated)/60000)}m ago). Skipping.`);
        continue;
      }

      try {
        console.log(`[SYNTHESIS RUN] Generating report '${p.title}' for ${ticker}...`);
        let promptText = p.template
          .replace(/{{company_metrics}}/g, metricsPlaceholderContent)
          .replace(/{{company_name}}/g, stock.company_name)
          .replace(/{{ticker}}/g, stock.ticker);

        const fullPrompt = `${promptText}

Company: ${stock.company_name} (${stock.ticker})
Investment Thesis: ${stock.investment_thesis || 'Growth & Operating Leverage'}

🔥 LATEST GROUND TRUTH QUARTER: ${latestQuarterLabel} (Always treat metrics from this latest quarter as current ground truth!)

Multi-Quarter Financial & Operational Snapshots History:
${formattedMetricsHistory || 'No quarterly snapshot history available.'}

${commScorecard}

Compiled Multi-Quarter Management Commitments & Status Tracker:
${commitmentsSummary || 'No explicit commitments tracked yet.'}

── CRITICAL FACTUALITY RULES ──
1. ALWAYS TIMESTAMP METRICS: Every revenue, margin, PAT, or capacity metric cited MUST include its explicit period tag (e.g. [Q1 FY27] or [Q3 FY26]). Do not cite a past quarter's number as if it is current.
2. ZERO NUMERICAL HALLUCINATION: Do NOT state specific monetary targets (e.g. specific capex or retail revenue targets) unless explicitly present in the provided evidence above. If a number is not explicitly quoted, mark it as [UNVERIFIED] or omit the specific figure.
3. ACCURATE GUIDANCE VS ACTUALS: Evaluate guidance vs actuals strictly against the evidence provided. Do not label a performance beat as a miss or vice versa.
4. MANAGEMENT CREDIBILITY SCORE: Base credibility strictly on verified commitment fulfillment vs broken guidance ratios.

Provide a comprehensive, professional institutional equity research analysis following the exact section structure defined above. Include the exact commitment totals and breakdown percentages from the scorecard above.`;

        const reportContent = await runNimPrompt(
          "You are a Senior Managing Director & Chief Equity Strategist at a top-tier institutional fund. You provide 100% evidence-anchored, zero-hallucination institutional equity research reports.",
          fullPrompt
        );

        if (reportContent && reportContent.length > 50) {
          await pool.query(
            `INSERT INTO stock_syntheses (stock_id, ticker, prompt_name, prompt_title, report_content, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (stock_id, prompt_name) 
             DO UPDATE SET report_content = EXCLUDED.report_content, prompt_title = EXCLUDED.prompt_title, updated_at = NOW()`,
            [stock.id, ticker, p.name, p.title, reportContent]
          );
          console.log(`[SYNTHESIS SUCCESS] Saved report '${p.title}' for ${ticker}`);
        }
      } catch (err) {
        console.error(`[SYNTHESIS WARNING] Deferred report '${p.title}' for ${ticker} to next run:`, err.message);
        // Continue to next prompt or defer cleanly to subsequent run
      }
    }
  } catch (err) {
    console.error(`[SYNTHESIS ERROR] Failed synthesis for ${ticker}:`, err.message);
  }
}

/**
 * Generates structured, segment-by-segment institutional concall highlights for Telegram.
 */
export async function generateStructuredConcallHighlights(ticker, companyName, docText) {
  if (!docText || docText.length < 300) return null;

  // Clean boilerplate cover letters
  let cleanText = docText;
  const concallStart = docText.toLowerCase().search(/(?:management:|moderator:|management\s+opening|presentation|executive\s+summary|q&a|question\s+and\s+answer|remarks|highlights)/i);
  if (concallStart !== -1 && concallStart < 5000) {
    cleanText = docText.substring(concallStart);
  }
  cleanText = capContext(cleanText, 8000);

  const systemPrompt = `You are a Senior Managing Director & Chief Equity Strategist at a top-tier institutional research firm. Extract a comprehensive, highly quantitative, 8-section concall highlight report from the earnings conference call transcript. Include exact monetary values, deal sizes, margin guidance %, and operational milestone timelines.`;
  const userPrompt = `
Company: ${companyName} (${ticker})
Concall Transcript Content:
${cleanText}

Extract the following structured sections:
1. "financial_performance": List bullet points covering Total Income/Revenue (YoY %), EBITDA (YoY % & Margin %), PAT (YoY %), Order Book total, Export Order Book, Funds/Cash availability, and Quarterly Order Inflows.
2. "business_performance": List contract wins, division details, specific customer orders (e.g. Aerospace orders, Semiconductor fab orders, LNG stations, CERN/ITER France, OEM contracts). Include exact monetary order sizes where available.
3. "growth_initiatives": List new certifications, technology partnerships (e.g. Wayout Sweden), new product categories, prototype developments, and skill centers.
4. "operational_highlights": List plant commissioning status (e.g. Savli, Kandla, Chakan), facility expansions, dealer network growth, and execution timelines.
5. "management_guidance": List explicit full-year guidance for Revenue Growth %, EBITDA Margin %, Order Inflows, Capex guidance, and execution outlook.
6. "key_positives": List 4-5 major positive execution catalysts.
7. "key_challenges": List 3-4 operational risks (logistics, freight costs, shipment delays, commodity inflation).
8. "management_tone": State tone in 2-3 words (e.g. "Highly Confident, Execution-Driven").
9. "key_takeaway": Provide a 1-sentence institutional bottom line synthesis.

Return ONLY a valid JSON object:
{
  "financial_performance": ["Revenue: ₹X Cr (+Y% YoY)", "EBITDA: ₹X Cr (+Y% YoY, Margin Z%)"],
  "business_performance": ["Aerospace orders: details & figures", "Semiconductor Dholera: details"],
  "growth_initiatives": ["Initiative 1", "Initiative 2"],
  "operational_highlights": ["Plant 1 status", "Timeline 2"],
  "management_guidance": ["FY27 Revenue Growth: X-Y%", "EBITDA Margin: A-B%"],
  "key_positives": ["Positive 1", "Positive 2"],
  "key_challenges": ["Challenge 1", "Challenge 2"],
  "management_tone": "Highly Confident, Execution-Driven",
  "key_takeaway": "1-sentence executive takeaway"
}
`;

  try {
    const resText = await runNimPrompt(systemPrompt, userPrompt, 0.05);
    if (!resText) return null;
    let cleaned = resText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(cleaned);
    }
  } catch (err) {
    console.warn(`[CONCALL HIGHLIGHTS WARN] Failed for ${ticker}:`, err.message);
  }
  return null;
}

