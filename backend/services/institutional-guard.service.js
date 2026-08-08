/**
 * Post-Processing Institutional Guard Layer
 * 
 * Enforces hard-coded financial rules, mandatory YoY precedence, segment red flag floor,
 * action signal calibration, and multi-stage regulatory status rules over LLM outputs.
 */

/**
 * Validates and refines LLM analysis using deterministic financial guardrails.
 * @param {object} llmOutput Extracted LLM JSON output
 * @param {object} financialData Deterministic financial metrics from validator
 * @param {string} title Filing title
 * @param {string} ticker Stock ticker
 * @returns {object} Validated institutional output
 */
export function applyInstitutionalGuard(llmOutput = {}, financialData = null, title = "", ticker = "") {
  if (!llmOutput || typeof llmOutput !== "object") {
    return llmOutput;
  }

  const guarded = { ...llmOutput };
  const titleLower = (title || "").toLowerCase();

  // 1. Multi-Stage Regulatory Commitment Guard (Rule 2 in AGENTS.md)
  if (guarded.commitments && Array.isArray(guarded.commitments)) {
    guarded.commitments = guarded.commitments.map(comm => {
      const stmtLower = (comm.statement || "").toLowerCase();
      const metricLower = (comm.metric || "").toLowerCase();
      const isOperationalOrFinancialTarget = 
        stmtLower.includes("capacity") ||
        stmtLower.includes("mw ") ||
        stmtLower.includes("mw;") ||
        stmtLower.includes("mtpa") ||
        stmtLower.includes("revenue") ||
        stmtLower.includes("margin") ||
        stmtLower.includes("product mix") ||
        stmtLower.includes("ebitda") ||
        metricLower.includes("capacity") ||
        metricLower.includes("capex") ||
        metricLower.includes("operational");

      const isStrictRegulatoryApproval = 
        (stmtLower.includes("scheme of arrangement") || 
         stmtLower.includes("nclt") || 
         stmtLower.includes("sebi approval") || 
         stmtLower.includes("amalgamation") || 
         stmtLower.includes("demerger") ||
         stmtLower.includes("regulatory approval") ||
         metricLower.includes("regulatory") ||
         metricLower.includes("demerger") ||
         metricLower.includes("nclt")) &&
        !isOperationalOrFinancialTarget;

      const isInitialBoardApproval = 
        titleLower.includes("outcome of board meeting") || 
        titleLower.includes("board meeting outcome") ||
        titleLower.includes("intimation under reg");

      const isFinalClearance = 
        titleLower.includes("court order") || 
        titleLower.includes("nclt order") || 
        titleLower.includes("sebi clearance") || 
        titleLower.includes("listing intimation") || 
        titleLower.includes("effective date");

      if (isStrictRegulatoryApproval && isInitialBoardApproval && !isFinalClearance) {
        return {
          ...comm,
          status: "Pending",
          blockers_and_risks: comm.blockers_and_risks || "Initial Board Approval granted; awaiting statutory shareholder/creditor approval and final NCLT sanction order."
        };
      }

      // Early Execution Guard: Mark 'Achieved Ahead of Schedule' if operational/financial target is met ahead of timeline
      const timelineLower = (comm.timeline || "").toLowerCase();
      const statusLower = (comm.status || "").toLowerCase();
      const isEarlyText = 
        stmtLower.includes("ahead of schedule") || 
        stmtLower.includes("ahead of timeline") || 
        stmtLower.includes("early commissioning") || 
        stmtLower.includes("achieved early") ||
        stmtLower.includes("ahead of target");
      
      const isFutureTargetYear = timelineLower.includes("fy28") || timelineLower.includes("fy29") || timelineLower.includes("fy30") || timelineLower.includes("fy27");

      if ((statusLower === "achieved" || statusLower.includes("achieved")) && (isEarlyText || isFutureTargetYear)) {
        return {
          ...comm,
          status: "Achieved Ahead of Schedule",
          credibility_impact: "high_positive",
          blockers_and_risks: comm.blockers_and_risks || "Target delivered ahead of original management guidance timeline."
        };
      }

      return comm;
    });
  }

  // 2. Financial Guardrails & YoY Precedence Guard (if deterministic financial data exists)
  if (financialData && financialData.isFinancialResult) {
    let summaryText = guarded.summary || guarded.verdict_summary || "";

    // A. Mandatory Financial Highlights & EBITDA Injection across ALL verdicts
    guarded.financial_highlights = {
      revenue: financialData.revenue !== null ? `₹${financialData.revenue} Cr` : "N/A",
      revenue_yoy: financialData.revenueYoYGrowthPct !== null ? `${financialData.revenueYoYGrowthPct >= 0 ? '+' : ''}${financialData.revenueYoYGrowthPct}%` : "N/A",
      ebitda: financialData.ebitda !== null ? `₹${financialData.ebitda} Cr` : "N/A",
      ebitda_margin: financialData.ebitdaMarginPct !== null ? `${financialData.ebitdaMarginPct}%` : "N/A",
      ebitda_margin_delta: financialData.ebitdaMarginBpsDelta !== null ? `${financialData.ebitdaMarginBpsDelta >= 0 ? '+' : ''}${financialData.ebitdaMarginBpsDelta} bps YoY` : "N/A",
      pat_consolidated: financialData.patAttributable !== null ? `₹${financialData.patAttributable} Cr` : "N/A",
      pat_yoy: financialData.patYoYGrowthPct !== null ? `${financialData.patYoYGrowthPct >= 0 ? '+' : ''}${financialData.patYoYGrowthPct}%` : "N/A"
    };

    if (financialData.ebitda !== null && financialData.ebitdaMarginPct !== null) {
      const ebitdaStr = `EBITDA: ₹${financialData.ebitda} Cr (Margin: ${financialData.ebitdaMarginPct}%${financialData.ebitdaMarginBpsDelta !== null ? `, ${financialData.ebitdaMarginBpsDelta >= 0 ? '+' : ''}${financialData.ebitdaMarginBpsDelta} bps YoY` : ''})`;
      if (!summaryText.includes("EBITDA")) {
        summaryText = `${summaryText} ${ebitdaStr}.`.trim();
      }
      if (guarded.key_drivers && Array.isArray(guarded.key_drivers)) {
        if (!guarded.key_drivers.some(d => d.includes("EBITDA"))) {
          guarded.key_drivers.unshift(`EBITDA: ₹${financialData.ebitda} Cr (${financialData.ebitdaMarginPct}% margin${financialData.ebitdaMarginBpsDelta !== null ? `, ${financialData.ebitdaMarginBpsDelta >= 0 ? '+' : ''}${financialData.ebitdaMarginBpsDelta} bps YoY` : ''})`);
        }
      }
    }

    // B. Mandatory YoY Precedence: Overrule QoQ sequential framing if YoY PAT/Margin contracts
    if (financialData.isYoYDecline || financialData.isMarginErosion) {
      let yoyDeclineHeader = "🔴 YoY Earnings Contraction:";
      if (financialData.patYoYGrowthPct !== null && financialData.patYoYGrowthPct < -5) {
        yoyDeclineHeader += ` Consolidated PAT declined ${financialData.patYoYGrowthPct}% YoY (₹${financialData.patAttributable} Cr).`;
      }
      if (financialData.isMarginErosion && financialData.ebitdaMarginBpsDelta !== null) {
        yoyDeclineHeader += ` EBITDA Margin contracted ${financialData.ebitdaMarginBpsDelta} bps YoY to ${financialData.ebitdaMarginPct}%.`;
      }

      // Prepend YoY decline header so it cannot be buried
      if (!summaryText.toLowerCase().includes("yoy earnings contraction") && !summaryText.toLowerCase().includes("declined")) {
        summaryText = `${yoyDeclineHeader} ${summaryText}`.trim();
      }

      // Force impact/verdict to NEGATIVE or NEUTRAL
      if (guarded.impact) guarded.impact = "NEGATIVE";
    }

    // C. Segment Red Flag Scanner & Injection
    if (financialData.segmentRedFlags && financialData.segmentRedFlags.length > 0) {
      for (const flag of financialData.segmentRedFlags) {
        const flagMsg = `🔴 SEGMENT RED FLAG: ${flag.segment} segment result declined ${flag.yoyDeclinePct}% YoY (₹${flag.currentValue} Cr vs ₹${flag.prevValue} Cr).`;
        if (!summaryText.includes(flag.segment)) {
          summaryText = `${summaryText} ${flagMsg}`.trim();
        }
        if (guarded.key_drivers && Array.isArray(guarded.key_drivers)) {
          guarded.key_drivers.unshift(`SEGMENT RED FLAG: ${flag.segment} EBIT down ${flag.yoyDeclinePct}% YoY`);
        }
      }
    }

    // Generic Unverified QoQ Claim Stripper (strips any arbitrary LLM QoQ percentage claim)
    const stripErroneousQoQ = (txt) => {
      if (typeof txt !== "string") return txt;
      return txt
        .replace(/\b\d{1,3}(?:\.\d+)?%\s*qoq(?:\s*revenue|\s*growth|\s*recovery|\s*pat|\s*margin)?\b/gi, "")
        .replace(/\b\d{1,3}(?:\.\d+)?%\s*qoq\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    };

    summaryText = stripErroneousQoQ(summaryText);
    if (guarded.key_drivers && Array.isArray(guarded.key_drivers)) {
      guarded.key_drivers = guarded.key_drivers
        .map(d => stripErroneousQoQ(d))
        .filter(d => d.length > 5);
    }

    // Update summary in output
    if (guarded.summary) guarded.summary = summaryText;
    if (guarded.verdict_summary) guarded.verdict_summary = summaryText;

    // D. Action Signal Calibration & Conviction Hard-Cap (1-10 Scale)
    let rawSignal = guarded.action_signal || guarded.final_action || "HOLD";
    let rawScore = guarded.conviction_score || guarded.confidence_score || 5;

    let conv = Math.round(Number(rawScore));
    if (isNaN(conv)) conv = 5;
    if (conv > 10) conv = Math.min(10, Math.round(conv / 10)); // Converts 95 -> 10, 90 -> 9, 85 -> 9, 80 -> 8
    rawScore = Math.max(1, Math.min(10, conv));

    if (financialData.isYoYDecline || financialData.isMarginErosion) {
      // Hard-cap signal on YoY contraction: Cannot be BUY or ADD
      rawSignal = "HOLD";
      rawScore = Math.min(rawScore, 5);
    } else if (
      financialData.patYoYGrowthPct !== null && financialData.patYoYGrowthPct >= 10 &&
      financialData.revenueYoYGrowthPct !== null && financialData.revenueYoYGrowthPct >= 5 &&
      !financialData.isMarginErosion
    ) {
      // Clean beat with double-digit growth: Set to ADD or STRONG BUY
      rawSignal = rawScore >= 9 ? "STRONG BUY" : "ADD";
      rawScore = Math.min(10, Math.max(rawScore, 8));
    }

    // Stacked-Condition Conviction Calibration Ceiling Rule:
    // 1. Moderate Revenue Growth (< 15% YoY) -> ceiling 8/10
    // 2. Pending Demerger / NCLT Regulatory Approval -> ceiling 7/10
    // 3. Both conditions true -> ceiling 7/10 ADD
    const isModerateRevenueGrowth = financialData.revenueYoYGrowthPct !== null && financialData.revenueYoYGrowthPct < 15.0;
    const hasPendingRegulatoryCommitments = guarded.commitments && guarded.commitments.some(c => 
      c.status === "Pending" && 
      ((c.statement || "").toLowerCase().includes("demerger") || (c.metric || "").toLowerCase().includes("demerger") || (c.statement || "").toLowerCase().includes("nclt"))
    );

    if (!financialData.isYoYDecline) {
      if (isModerateRevenueGrowth && hasPendingRegulatoryCommitments) {
        rawScore = Math.min(rawScore, 7); // Stacked constraint: 7/10
        rawSignal = "ADD";
      } else if (hasPendingRegulatoryCommitments) {
        rawScore = Math.min(rawScore, 7); // Regulatory binary risk: 7/10
        rawSignal = "ADD";
      } else if (isModerateRevenueGrowth) {
        rawScore = Math.min(rawScore, 8); // Moderate growth constraint: 8/10
        if (rawSignal === "STRONG BUY") rawSignal = "ADD";
      }
    }

    // Standardize Action Signal Vocabulary (STRONG BUY / ADD / HOLD / TRIM / EXIT)
    const standardizeSignal = (sig, score) => {
      const s = (sig || "").toString().trim().toUpperCase();
      if (s === "BUILD POSITION" || s === "ACCUMULATE" || s === "BUY" || s === "STRONG BUY" || s === "ADD") {
        return score >= 9 ? "STRONG BUY" : "ADD";
      }
      if (s === "REDUCE" || s === "SELL" || s === "TRIM") {
        return "TRIM";
      }
      if (s === "EXIT") {
        return "EXIT";
      }
      return "HOLD";
    };

    rawSignal = standardizeSignal(rawSignal, rawScore);

    if (guarded.action_signal) guarded.action_signal = rawSignal;
    if (guarded.final_action) guarded.final_action = rawSignal;
    if (guarded.conviction_score) guarded.conviction_score = rawScore;
    if (guarded.confidence_score) guarded.confidence_score = rawScore;
  } else {
    // Ensure conviction score is 1-10 even if financialData is missing
    let rawScore = guarded.conviction_score || guarded.confidence_score || 5;
    let conv = Math.round(Number(rawScore));
    if (isNaN(conv)) conv = 5;
    if (conv > 10) conv = Math.min(10, Math.round(conv / 10));
    guarded.conviction_score = Math.max(1, Math.min(10, conv));
    guarded.confidence_score = guarded.conviction_score;

    if (guarded.action_signal) {
      guarded.action_signal = guarded.action_signal === "BUILD POSITION" ? "ADD" : guarded.action_signal;
    }
  }

  return guarded;
}
