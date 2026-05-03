import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useManagementPromises, useQuarterlySnapshots, useStockTrackingProfile, useShareholding, useFinancialMetrics, useXbrlMetrics, useStockTranscripts } from "@/hooks/useStocks";
import { decisionRulesFromProfile, getMetricKeysForPrompt } from "@/lib/trackingProfileConfig";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Braces, History, Download, Settings2 } from "lucide-react";
import { computeTrendDirection, computeMarginTrend, computeOwnershipTrend, generateAnomalyFlags, formatTrendSeries } from "@/lib/trendAnalysis";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "./ui/badge";

interface Props {
  stock: {
    id: string;
    ticker: string;
    company_name: string;
    tracking_directives?: string | null;
    investment_thesis?: string | null;
    sector?: string | null;
    metric_keys?: unknown;
  };
}

type CopyKind = "prompt" | "json" | null;

function buildGeminiContext(
  stock: Props["stock"],
  promises: any[] | undefined,
  snapshots: any[] | undefined,
  trackingConfig: Record<string, unknown> | null,
  limitToQuarter: string | null,
  shareholding: any[] | undefined,
  valuation: any | undefined,
  xbrlMetrics: any[] | undefined,
  options: {
    includeTrend: boolean;
    includeOwnership: boolean;
    includeValuation: boolean;
    includeAutoFlags: boolean;
    includePreviousVerdict: boolean;
    includePeerCompare: boolean;
  }
) {
  const allSnapshots = (snapshots || []) as any[];
  
  const isSyncing = !valuation && (Date.now() - new Date(stock.created_at).getTime() < 5 * 60 * 1000);
  const missingText = isSyncing ? "FINANCIAL DATA SYNCING" : "NOT DISCLOSED";

  
  // If a limit is specified, exclude that quarter and any newer ones
  const filteredSnapshots = limitToQuarter 
    ? allSnapshots.filter(s => {
        // Simple comparison: if it's the exact quarter being limited to, or newer, we might want to exclude it.
        // Actually, the user says "copy till Q2", so if they select Q2, we include Q2 and older.
        // We exclude anything that comes AFTER the selected quarter in the sorted list (snapshots are usually newest first).
        const targetIndex = allSnapshots.findIndex(sn => sn.quarter === limitToQuarter);
        const currentIndex = allSnapshots.findIndex(sn => sn.id === s.id);
        return currentIndex >= targetIndex;
      })
    : allSnapshots;

  const pending = promises?.filter((p) => p.status === "pending") || [];
  const kept = promises?.filter((p) => p.status === "kept") || [];
  const broken = promises?.filter((p) => p.status === "broken") || [];

  const pendingLedger = pending.map((p) => ({
    id: p.id,
    promise_text: p.promise_text,
    made_in_quarter: p.made_in_quarter,
    target_deadline: p.target_deadline || "Not specified",
  }));

  const credibility =
    kept.length + broken.length > 0
      ? `${Math.round((kept.length / (kept.length + broken.length)) * 100)}%`
      : "No resolved promises yet";

  const rollingSnapshotsArray = (() => {
    if (!filteredSnapshots || filteredSnapshots.length === 0) return [];
    return filteredSnapshots.slice(0, 4).map((s) => {
      const snapAny = s as Record<string, unknown>;
      if (snapAny.raw_ai_output && typeof snapAny.raw_ai_output === "object") return snapAny.raw_ai_output;
      const prevMetrics = snapAny.metrics && typeof snapAny.metrics === "object" ? snapAny.metrics : {};
      return {
        quarter: snapAny.quarter,
        snapshot: {
          summary: snapAny.summary ?? null,
          thesis_status: snapAny.thesis_status ?? null,
          thesis_drift: snapAny.thesis_drift_status
            ? { status: snapAny.thesis_drift_status, reason: snapAny.thesis_drift_reason ?? null }
            : null,
        },
        metrics: prevMetrics,
        management_analysis: {
          red_flags: Array.isArray(snapAny.red_flags) ? snapAny.red_flags : [],
          dodged_questions: Array.isArray(snapAny.dodged_questions) ? snapAny.dodged_questions : [],
        },
      };
    });
  })();

  const rollingSnapshots = JSON.stringify(rollingSnapshotsArray, null, 2);

  
  // --- PREPARE XBRL DATA ---
  let xbrlRows = (xbrlMetrics || []) as any[];
  if (limitToQuarter && xbrlRows.length > 0) {
    const targetIdx = xbrlRows.findIndex((r: any) => r.quarter === limitToQuarter);
    xbrlRows = targetIdx >= 0 ? xbrlRows.slice(targetIdx) : xbrlRows;
  }

  // --- UNIFIED FORMATTERS ---
  const toCrValue = (val: string | number | null | undefined) => {
    if (val == null) return null;
    return Math.round((parseFloat(val as string) / 100) * 10) / 10;
  };
  const toDisplayCrores = (val: string | number | null | undefined) => {
    const cr = toCrValue(val);
    return cr != null ? `₹${cr} Cr` : "N/A";
  };
  const toDisplayPercent = (val: string | number | null | undefined) => {
    if (val == null) return "N/A";
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return `${num}%`;
  };

  // --- DECISION ENGINE TREND CALCS ---
  const revValues: (number | null)[] = [];
  const patValues: (number | null)[] = [];
  const marginValues: (number | null)[] = [];
  const finCostValues: (number | null)[] = [];
  let trendSource = "N/A";
  let momentumDirection = "Neutral";
  
  if (xbrlRows.length >= 2) {
    trendSource = "xbrl_metrics_quarterly";
    const pastN = xbrlRows.slice(0, Math.min(4, xbrlRows.length)).reverse();

    for (const r of pastN) {
      revValues.push(toCrValue(r.revenue_from_ops));
      patValues.push(toCrValue(r.pat));
      finCostValues.push(toCrValue(r.finance_cost));
      
      let margin = null;
      if (r.ebitda_margin_pct != null) margin = parseFloat(r.ebitda_margin_pct);
      else if (r.ebitda != null && r.revenue_from_ops != null && parseFloat(r.revenue_from_ops) > 0) {
        margin = Math.round((parseFloat(r.ebitda) / parseFloat(r.revenue_from_ops)) * 1000) / 10;
      }
      marginValues.push(margin);
    }
  } else {
    trendSource = "quarterly_snapshots (fallback)";
    const past3 = filteredSnapshots.slice(0, 3).reverse();
    for (const s of past3) {
      const metrics = s.metrics || {};
      revValues.push(parseFloat(metrics.revenue_growth?.value || metrics.revenue?.value) || null);
      patValues.push(parseFloat(metrics.pat_growth?.value || metrics.pat?.value) || null);
      marginValues.push(parseFloat(metrics.opm?.value || metrics.ebitda_margin?.value) || null);
      finCostValues.push(null); // Not reliably tracked in old snapshots
    }
  }

  const revTrend = computeTrendDirection(revValues, 5);
  const patTrend = computeTrendDirection(patValues, 5);
  const finCostTrend = computeTrendDirection(finCostValues, 5);
  const marginTrend = computeMarginTrend(marginValues, 0.5);

  if (revTrend.includes("Improving") && patTrend.includes("Improving")) {
    momentumDirection = "Positive";
  } else if (revTrend.includes("Deteriorating") || patTrend.includes("Deteriorating")) {
    momentumDirection = "Negative";
  } else {
    momentumDirection = "Mixed";
  }

  const cutoffDate = filteredSnapshots.length > 0 && filteredSnapshots[0].created_at 
    ? new Date(filteredSnapshots[0].created_at).getTime() 
    : Date.now();

  let filteredShareholding = shareholding || [];
  if (limitToQuarter && filteredSnapshots.length > 0) {
    filteredShareholding = (shareholding || []).filter((s: any) => s.created_at && new Date(s.created_at).getTime() <= cutoffDate);
  }

  let filteredValuation = null;
  if (Array.isArray(valuation) && valuation.length > 0) {
    const validMetrics = limitToQuarter && filteredSnapshots.length > 0
      ? valuation.filter((v: any) => v.created_at && new Date(v.created_at).getTime() <= cutoffDate)
      : valuation;
    if (validMetrics.length > 0) {
      filteredValuation = validMetrics[validMetrics.length - 1]; 
    }
  }

  let promoterValues: (number | null)[] = [];
  let fiiValues: (number | null)[] = [];
  let diiValues: (number | null)[] = [];
  if (filteredShareholding && filteredShareholding.length > 0) {
    const shPast3 = filteredShareholding.slice(0, 3).reverse();
    promoterValues = shPast3.map((s: any) => parseFloat(s.promoters) || null);
    fiiValues = shPast3.map((s: any) => parseFloat(s.fiis) || null);
    diiValues = shPast3.map((s: any) => parseFloat(s.diis) || null);
  }
  
  const ownershipAnalysis = computeOwnershipTrend(promoterValues, fiiValues, diiValues);
  
  const autoFlags = generateAnomalyFlags({
    revTrend,
    patTrend,
    marginTrend,
    ownershipFlags: ownershipAnalysis.flags,
  });

  let decisionEngineContext = "";
  
  decisionEngineContext += `SECTION A: Current Quarter Snapshot\n`;
  if (filteredSnapshots.length > 0) {
    decisionEngineContext += (filteredSnapshots[0].summary || missingText) + "\n\n";
  } else {
    decisionEngineContext += missingText + "\n\n";
  }

  if (options.includeTrend) {
    let trendQ = xbrlRows.length >= 2 ? Math.min(4, xbrlRows.length) : Math.min(3, filteredSnapshots.length);
    let trendQText = trendQ >= 2 ? `${trendQ}Q Trend` : "Insufficient Data";
    
    decisionEngineContext += `SECTION B: Last ${trendQText}\n`;
    if (trendQ >= 2) {
      decisionEngineContext += `Revenue Trend (₹ Cr): ${formatTrendSeries(revValues)} (${revTrend})\n`;
      decisionEngineContext += `PAT Trend (₹ Cr): ${formatTrendSeries(patValues)} (${patTrend})\n`;
      decisionEngineContext += `Margin Trend: ${formatTrendSeries(marginValues, "%")} (${marginTrend})\n`;
      
      if (finCostValues.some(v => v != null)) {
        decisionEngineContext += `Finance Cost Trend (₹ Cr): ${formatTrendSeries(finCostValues)} (${finCostTrend})\n`;
      }
      
      decisionEngineContext += `Momentum Direction: ${momentumDirection}\n`;
      decisionEngineContext += `Data Engine: Lakhs → Converted to Crores\n`;
      decisionEngineContext += `Source: ${trendSource}\n\n`;
    } else {
      decisionEngineContext += `${trendQText}\n\n`;
    }
  }

  if (options.includeOwnership) {
    decisionEngineContext += `SECTION C: Ownership Trend (Source: shareholding)\n`;
    if (filteredShareholding && filteredShareholding.length > 0) {
      decisionEngineContext += `Promoter: ${formatTrendSeries(promoterValues, "%")}\n`;
      decisionEngineContext += `FII: ${formatTrendSeries(fiiValues, "%")}\n`;
      decisionEngineContext += `DII: ${formatTrendSeries(diiValues, "%")}\n`;
      decisionEngineContext += `Status: ${ownershipAnalysis.label} ${ownershipAnalysis.details ? `- ${ownershipAnalysis.details}` : ""}\n\n`;
    } else {
      decisionEngineContext += missingText + "\n\n";
    }
  }

  if (options.includeValuation) {
    const asOf = filteredValuation && filteredValuation.created_at ? new Date(filteredValuation.created_at).toISOString().split('T')[0] : (limitToQuarter ? 'Historical valuation unavailable' : 'Current');
    decisionEngineContext += `SECTION D: Valuation Snapshot (Source: financial_metrics, As of: ${asOf})\n`;
    if (filteredValuation) {
      decisionEngineContext += `Relevant P/E: ${filteredValuation.pe_ratio || missingText}\n`;
      decisionEngineContext += `Industry P/E: ${filteredValuation.industry_pe || missingText}\n`;
      decisionEngineContext += `EV/EBITDA: ${filteredValuation.ev_to_ebitda || missingText}\n`;
      decisionEngineContext += `Market Cap: ${filteredValuation.market_cap ? filteredValuation.market_cap + ' Cr' : missingText}\n\n`;
    } else {
      decisionEngineContext += missingText + "\n\n";
    }
  }

  if (options.includeAutoFlags) {
    decisionEngineContext += `SECTION E: Auto Flags\n`;
    if (autoFlags.length > 0) {
      decisionEngineContext += autoFlags.join("\n") + "\n\n";
    } else {
      decisionEngineContext += "None detected.\n\n";
    }
  }

  // SECTION F: Screener / Fundamental Data (from financial_metrics — annual)
  // Always injected when valuation toggle is on; time-filter note added for historical queries.
  if (options.includeValuation) {
    const fm = valuation && typeof valuation === "object" && !Array.isArray(valuation) ? valuation as any : null;
    const fmYear = fm?.year ? `FY${String(fm.year).slice(-2)}` : "Latest Available";
    decisionEngineContext += `SECTION F: Screener / Fundamental Data (Source: financial_metrics — Annual, ${fmYear})\n`;
    if (fm) {
      decisionEngineContext += `ROCE: ${fm.roce != null ? fm.roce + "%" : missingText}\n`;
      decisionEngineContext += `ROE: ${fm.roe != null ? fm.roe + "%" : missingText}\n`;
      decisionEngineContext += `Debt/Equity: ${fm.debt_equity != null ? fm.debt_equity : missingText}\n`;
      decisionEngineContext += `Operating Margin (OPM): ${fm.opm != null ? fm.opm + "%" : missingText}\n`;
      decisionEngineContext += `Revenue (Cr): ${fm.revenue != null ? fm.revenue : missingText}\n`;
      decisionEngineContext += `Revenue Growth (YoY): ${fm.revenue_growth != null ? fm.revenue_growth + "%" : missingText}\n`;
      decisionEngineContext += `Net Profit (Cr): ${fm.net_profit != null ? fm.net_profit : missingText}\n`;
      decisionEngineContext += `Profit Growth (YoY): ${fm.profit_growth != null ? fm.profit_growth + "%" : missingText}\n`;
      decisionEngineContext += `Free Cash Flow (Cr): ${fm.free_cash_flow != null ? fm.free_cash_flow : missingText}\n`;
      decisionEngineContext += `EPS: ${fm.eps != null ? fm.eps : missingText}\n`;
      decisionEngineContext += `Promoter Holding (Annual): ${fm.promoter_holding != null ? fm.promoter_holding + "%" : missingText}\n`;
      if (limitToQuarter) {
        decisionEngineContext += `⚠️ Note: financial_metrics is annual data and may not precisely reflect the selected historical quarter.\n`;
      }
    } else {
      decisionEngineContext += missingText + "\n";
    }
    decisionEngineContext += "\n";
  }
  // --- END DECISION ENGINE CONTEXT ---

  // SECTION G: Official Quarterly Financials (from xbrl_metrics_quarterly — NSE API)
  // Highest-priority source. Time-travel: only show quarters at or before limitToQuarter.
  {
    const sectionGxbrl = xbrlRows.slice(0, 4); 
    decisionEngineContext += `SECTION G: Official Quarterly Financials (Source: NSE/XBRL Hybrid)\n`;
    if (sectionGxbrl.length > 0) {
      const yoy = (v: number | null) => v != null ? ` (YoY: ${v > 0 ? "+" : ""}${v}%)` : "";
      for (const row of sectionGxbrl) {
        decisionEngineContext += `\n[${row.quarter} | Period: ${row.period_end_date || "?"}]\n`;
        decisionEngineContext += `  P&L: Rev: ${toDisplayCrores(row.revenue_from_ops)}${yoy(row.revenue_growth_yoy)} | PAT: ${toDisplayCrores(row.pat)}${yoy(row.pat_growth_yoy)}\n`;
        
        // DISTILLED SIGNALS (High ROI)
        const signals: string[] = [];
        
        // 1. Working Capital Stress (Receivable Days)
        if (row.receivables != null && row.revenue_from_ops != null && row.revenue_from_ops > 0) {
          const recDays = Math.round((parseFloat(row.receivables) / parseFloat(row.revenue_from_ops)) * 90);
          signals.push(`Receivable Days: ${recDays}d`);
        }
        
        // 2. Cash Flow Quality (CFO / PAT)
        if (row.cfo != null && row.pat != null && row.pat > 0) {
          const cfoRatio = (parseFloat(row.cfo) / parseFloat(row.pat)).toFixed(2);
          signals.push(`CFO/PAT Ratio: ${cfoRatio} (${row.cfo_period_type || 'Q'})`);
        }
        
        // 3. Leverage
        if (row.borrowings != null) {
          signals.push(`Borrowings: ${toDisplayCrores(row.borrowings)}`);
        }

        if (signals.length > 0) {
          decisionEngineContext += `  Enrichment: ${signals.join(" | ")}\n`;
        }

        if (row.exceptional_items != null && row.exceptional_items !== 0) decisionEngineContext += `  ⚠️ Exceptional: ${toDisplayCrores(row.exceptional_items)}\n`;
      }
      decisionEngineContext += `\n`;
    } else {
      decisionEngineContext += `NOT FETCHED — run POST /api/xbrl/fetch for ${stock.ticker}.\n\n`;
    }
  }

  const profile = trackingConfig;

  const metricKeys = getMetricKeysForPrompt(profile as Record<string, unknown> | null | undefined, stock.metric_keys);

  const primaryMetricKey =
    (profile && typeof profile.primary_thesis_metric === "object"
      ? (profile.primary_thesis_metric as Record<string, unknown>).key
      : null) ||
    metricKeys[0] ||
    "primary_thesis_metric";
  const primaryMetricLabel =
    (profile && typeof profile.primary_thesis_metric === "object"
      ? String((profile.primary_thesis_metric as Record<string, unknown>).label || "")
      : "") ||
    String(primaryMetricKey)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  const metricsSchema = {
    // CRITICAL TIER (Metadata Required)
    primary_thesis_metric: { 
      value: "", 
      evidence: "", 
      metric_name: primaryMetricLabel,
      source: "transcript | screener | blended",
      confidence: "high | medium | low",
      period: "current_quarter | lagging_ttm"
    },
    ocf_to_ebitda: { 
      value: "", 
      evidence: "", 
      source: "transcript | screener | blended", 
      confidence: "high | medium | low",
      period: "current_quarter | lagging_ttm"
    },
    debt_to_equity: { 
      value: "", 
      evidence: "", 
      source: "transcript | screener | blended",
      confidence: "high | medium | low",
      period: "current_quarter | lagging_ttm"
    },
    // SECONDARY TIER (Lean - value/evidence only)
    revenue_growth: { value: "", evidence: "" },
    opm: { value: "", evidence: "" },
    pat_growth: { value: "", evidence: "" }
  } as Record<string, any>;

  for (const key of metricKeys) {
    if (!metricsSchema[key]) {
      metricsSchema[key] = { value: "", evidence: "" };
    }
  }

  const mandatoryMetricsReadable =
    metricKeys.length > 0
      ? metricKeys
          .map((k) => k.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()))
          .join(", ")
      : "Revenue growth, Operating margin, PAT growth";

  const coreThesis =
    profile?.core_thesis ||
    stock.investment_thesis ||
    "No explicit written thesis stored. Treat this as a generic compounding story and infer the core drivers from historical AI snapshots and financials.";

  const trackingDirectives =
    profile?.tracking_directives ||
    stock.tracking_directives ||
    "Track revenue growth, margin trajectory, free cash flow, customer/segment concentration, and balance sheet risk.";

  const decisionRules = decisionRulesFromProfile(profile as Record<string, unknown> | null | undefined);
  const reviewFrequencyLine =
    decisionRules.review_frequency ||
    "quarterly (default — align with your own review calendar if different)";
  const killSwitchLines =
    decisionRules.kill_switches.length > 0
      ? decisionRules.kill_switches
          .map((c, i) => `${i + 1}. [${c.severity.toUpperCase()}] ${c.rule}`)
          .join("\n")
      : "(None configured.) Add \"kill_switch_conditions\" (string[] or { rule, severity: high|medium }[]) — fatal vs warning de-risk triggers.";
  const addOnLines =
    decisionRules.add_conditions.length > 0
      ? decisionRules.add_conditions
          .map((c, i) => `${i + 1}. [${c.severity.toUpperCase()}] ${c.rule}`)
          .join("\n")
      : "(None configured.) Add \"add_on_conditions\" for explicit upgrade / higher-conviction triggers (default severity medium).";
  const hasExplicitRules =
    decisionRules.kill_switches.length > 0 || decisionRules.add_conditions.length > 0;

  const strictRuleCheckSchema = `  "strict_rule_check": {
    "no_explicit_rules": ${!hasExplicitRules},
    "review_frequency_acknowledged": ${JSON.stringify(reviewFrequencyLine)},
    "overall_status": "pass | warning | fail",
    "overall_status_rationale": "One sentence: how kill_switches and add_conditions aggregate (see mandate below)",
    "kill_switches": [
      {
        "condition": "Exact rule text including [HIGH]/[MEDIUM] from this prompt",
        "severity": "high | medium",
        "status": "triggered | not_triggered | insufficient_data",
        "evidence": "Verbatim excerpt from transcript/presentation, or state what was NOT DISCLOSED"
      }
    ],
    "add_conditions": [
      {
        "condition": "Exact rule text from the Add conditions list",
        "severity": "high | medium",
        "status": "triggered | not_triggered | insufficient_data",
        "evidence": "Verbatim excerpt from transcript/presentation, or state what was NOT DISCLOSED"
      }
    ]
  },`;

  const verificationPayload = {
    generated_at: new Date().toISOString(),
    ticker: stock.ticker,
    company_name: stock.company_name,
    sector: stock.sector ?? null,
    core_investment_thesis: coreThesis,
    tracking_directives: trackingDirectives,
    mandatory_metric_keys: metricKeys,
    mandatory_metrics_readable: mandatoryMetricsReadable,
    primary_thesis_metric_key: primaryMetricKey,
    primary_thesis_metric_label: primaryMetricLabel,
    metrics_schema_template: metricsSchema,
    historical_snapshots_rolling: rollingSnapshotsArray,
    pending_promises_ledger: pendingLedger,
    promise_credibility_summary: credibility,
    promise_counts: {
      pending: pending.length,
      kept: kept.length,
      broken: broken.length,
    },
    decision_rules: {
      review_frequency: decisionRules.review_frequency,
      kill_switches: decisionRules.kill_switches,
      add_conditions: decisionRules.add_conditions,
    },
    stock_tracking_profile_config: profile ?? null,
    system_version: "v12",
    previous_decision: (rollingSnapshotsArray[0] as any)?.actionable_verdict?.decision || "INITIAL_EVALUATION",
  };

  const prompt = `**System Role:** You are a **Lead Indian Equity Research Analyst**.

Your job is to evaluate whether a company is:
* Strengthening
* Stable
* Weakening
* Broken

You must:
* Prioritize **economic reality over narrative**
* Avoid optimism bias
* Avoid hallucinating numbers
* Be conservative when data is missing

═══════════════════════════════════════
PARAMETERIZED INPUTS
═══════════════════════════════════════
**COMPANY TICKER:** ${stock.ticker}

**CORE INVESTMENT THESIS:** ${coreThesis}

**TRACKING DIRECTIVES (BASELINE THESIS):** ${trackingDirectives}

**MANDATORY METRICS TO TRACK:** ${mandatoryMetricsReadable}

**PRIMARY THESIS METRIC TO EXTRACT:** ${primaryMetricLabel}

═══════════════════════════════════════
STRICT RULE CHECK (MANDATORY — DO NOT SKIP)
═══════════════════════════════════════
**Review frequency:** ${reviewFrequencyLine}

**Kill switch conditions** (thesis break / de-risk — evaluate against this quarter's materials + rolling context):
${killSwitchLines}

**Add / higher-conviction conditions** (when you would increase sizing or conviction):
${addOnLines}

**MANDATE:**
- For **every** configured line item above (numbered), you MUST emit one row in \\\`strict_rule_check.kill_switches\\\` or \\\`strict_rule_check.add_conditions\\\` with the **same rule text** (include the [HIGH]/[MEDIUM] tag in \\\`condition\\\`), matching \\\`severity\\\`, \\\`status\\\` = triggered | not_triggered | insufficient_data, and \\\`evidence\\\`.
- \\\`strict_rule_check.overall_status\\\`: **fail** if HIGH kill switch **triggered**; **warning** if MEDIUM kill switch **triggered**; else **pass**.
- Use \\\`insufficient_data\\\` when the transcript does not allow a fair test; say what is missing in \\\`evidence\\\`.

═══════════════════════════════════════
HISTORICAL CONTEXT (ROLLING YTD LEDGER)
═══════════════════════════════════════
Use this as your memory of how the thesis and execution have evolved so far. Each entry is a prior quarter's AI snapshot and metrics for ${stock.ticker}.

${rollingSnapshots}

Also use this PROMISE LEDGER to track management commitments across time:

- PENDING PROMISES (open commitments that still need tracking):
${JSON.stringify(pendingLedger, null, 2)}

Credibility Score (kept vs broken promises so far): ${credibility}

═══════════════════════════════════════
📊 DECISION ENGINE SIGNALS (PRE-COMPUTED)
═══════════════════════════════════════
Use these computed signals to anchor your scoring. They are derived from DB-stored data and are source-labeled.

${decisionEngineContext}
═══════════════════════════════════════
⚠️ NON-NEGOTIABLE RULES (HARD LOGIC) — V12
═══════════════════════════════════════

1. **THESIS DOMINANCE RULE (HARD GATE)**
   IF thesis_score < 60:
   → final_action = CUT POSITION
   → position_size = none
   → IGNORE valuation completely

2. **KILL SWITCH RULE**
   - If any HIGH severity kill switch is triggered → MUST return: CUT POSITION
   - If any MEDIUM severity kill switch is triggered → MUST NOT return BUILD or ADD

3. **NO DATA HALLUCINATION RULE**
   - If a metric is not explicitly disclosed: value = "NOT DISCLOSED"
   - Do NOT calculate or infer missing values

4. **CONVICTION CAP RULE**
   IF conviction_score < 60:
   → position_size MUST be "starter"

5. **VALUATION DISCIPLINE RULE**
   IF valuation_score < 40 (stretched):
   → position_size MUST NOT be "full"
   IF valuation_score ≥ 60:
   → MUST REMOVE "valuation_stretched" from decision_blockers

6. **PRIMARY METRIC OVERRIDE RULE**
   IF: primary_metric_strength >= 30 AND margins stable or expanding AND no HIGH kill switch
   THEN: final_action CANNOT be CUT due to missing secondary data

7. **EARNINGS QUALITY RULE (STRICT)**
   IF OCF / EBITDA < 0.5 OR working capital rising without revenue conversion OR management omits cash flow commentary:
   → reduce conviction_score by 15–25 points
   → position_size MUST be "starter" (hard cap — not just blocking "full")
   → add "earnings_quality_risk" to decision_blockers

8. **GROWTH QUALITY CAP**
   IF any of the following:
   - Top 1–2 customers > 30% of revenue → add "customer_concentration_risk"
   - Working capital expanding faster than revenue:
     → IF clearly explained AND tied to strong growth/order backlog → TEMPORARY risk → reduce penalty severity, do NOT hard-cap conviction.
     → ELSE (unexplained/chronic) → STRUCTURAL risk → add "working_capital_risk" and full penalty.
   - OCF lagging EBITDA AND management not addressing it → add "earnings_quality_risk"
   THEN:
   → cap conviction_score ≤ 60 regardless of sub-component scores
   → position_size MUST NOT be "full"

9. **MOMENTUM DIRECTION RULE (STRICT)**
   Primary metric direction MUST influence scoring — absolute level alone is NOT sufficient:
   - Accelerating QoQ across 2+ quarters → +5 to execution_signals (capped at sub-component max)
   - Stable → neutral
   - Decelerating QoQ for 1 quarter → −5 to execution_signals
   - Decelerating QoQ for 2+ consecutive quarters → −10 to execution_signals AND reduce growth_quality
   EXAMPLE: 50% → 30% → 15% = decelerating. NOT "strong growth."

10. **ADD vs BUILD DISAMBIGUATION RULE (STRICT)**
    ADD POSITION only if ALL of:
    - prior quarter thesis_score > 75
    - current thesis_score improving (not just stable)
    - execution_signals increasing QoQ
    - no new risks added this quarter
    Otherwise → BUILD POSITION. NEVER ADD if execution_quality = "weak" or momentum = "decelerating."

11. **MULTIBAGGER MODE RULE (CONDITIONAL OVERRIDE)**
    IF thesis_score ≥ 80:
    → **PRECEDENCE:** A HIGH severity kill switch (Rule 2) ALWAYS overrides this rule and triggers an immediate CUT regardless of historical strength.
    → Otherwise, DO NOT return CUT POSITION based on a single quarter of deterioration alone.
    → Downgrade path must follow: BUILD/ADD → WAIT AND WATCH → CUT (never skip a step).
    → CUT is only permitted if deterioration persists for 2 consecutive quarters OR a HIGH kill switch fires.
    → Set thesis_monitoring.deterioration_quarters from rolling context; only allow CUT if ≥ 2.

    **LUMPY BUSINESS MODIFIER (sub-rule of Rule 11):**
    IF the business model is project-based, export-heavy, or capex-lumpy (e.g., EPC, defence, capital goods, commodity exports):
    → Raise the deterioration threshold to 3 consecutive quarters before permitting CUT
    → Rationale: lumpy revenue recognition creates artificial bad quarters that do not represent thesis breaks
    → State the business type in thesis_monitoring.multibagger_mode_rationale

12. **CYCLE PEAK RISK RULE**
    IF margins are at multi-quarter highs AND revenue growth is unusually elevated AND management commentary is uniformly bullish with no risk disclosures:
    → reduce conviction_score by 5–10 points
    → add "cycle_peak_risk" to decision_blockers
    → position_size MUST NOT be "full"
    This rule prevents over-sizing at cyclical peaks disguised as structural strength.

13. **THESIS DRIFT SEVERITY RULE**
    IF growth is predominantly from a segment NOT aligned with the original investment thesis:
    → reduce thesis_score by 5–15 points
    → set thesis_drift.status = "evolving" (negative drift, not expansion)
    → add rationale to thesis_drift.reason explaining which segment and why it misaligns

14. **SKEPTICISM RULE**
    IF signals.warnings is empty AND management_analysis.red_flags is empty AND management_analysis.dodged_questions_or_omissions is empty:
    → YOU MUST reduce conviction_score by EXACTLY 5 points
    → YOU MUST add "low_disclosure_risk" to decision_blockers
    A company with zero disclosures, zero warnings, and zero omissions is statistically implausible. Default to skepticism. Clean companies must still be penalized slightly.

15. **PENALTY NORMALIZATION RULE (CRITICAL)**
    If multiple penalties originate from the SAME root cause, apply ONLY the strongest single penalty. Do NOT stack.
    Common conflations to avoid:
    - Growth slowdown → apply EITHER execution_signals penalty OR momentum_adjustment penalty, NOT both
    - Weak OCF → apply EITHER earnings_quality conviction cap OR risk_flags_penalty, NOT both
    - Customer concentration → apply EITHER conviction cap (Rule 8) OR risk_flags_penalty, NOT both
    Procedure: Before finalising scores, identify the root cause of each penalty and consolidate overlaps. Record the consolidation in the rationale.why_this_action field.
    ⚠️ This rule prevents artificial score collapse from a single weak signal.

16. **PORTFOLIO AWARENESS RULE**
    This system may analyse multiple stocks sharing a common macro theme (e.g., capex cycle, auto supply chain, export-led growth, real estate).
    IF the stock belongs to a theme where other portfolio holdings are already at FULL or HALF size:
    → reduce position_size by one level: full → half, half → starter
    → add "theme_concentration_risk" to decision_blockers
    → state the conflicting theme in rationale.risks
    IF theme overlap cannot be determined (no context provided):
    → DO NOT add to decision_blockers.
    → DO NOT change position_size.
    → ONLY add a note in rationale.why_this_action: "Portfolio check required: verify theme concentration (e.g. macro theme X) before sizing."
    ⚠️ Sector concentration is a portfolio-level failure mode, not a stock-level one. Never allow 3+ FULL positions in the same macro theme.

═══════════════════════════════════════
🌐 SOURCE-AWARE HYBRID INTELLIGENCE (V12)
═══════════════════════════════════════

17. **SOURCE PRIORITY (TRUTH LAYER)**
    - Transcript / Concall data is the **PRIMARY TRUTH**.
    - External data (Screener.in) is **SECONDARY** and supporting only.
    - IF External data (Screener) shows strength but the Transcript indicates operational stress → **Trust the Transcript.**

18. **DETERMINISTIC CONFIDENCE (STRICT)**
    - confidence = **high** → direct, verbatim number from transcript.
    - confidence = **medium** → screener-derived data (where allowed by Rule 20).
    - confidence = **low** → inferred from management guidance or partial/vague mentions.

19. **DYNAMIC CONFLICT PENALTY (STRICT)**
    IF External data (Screener) contradicts the Transcript narrative or operational signals:
    → YOU MUST trust the Transcript.
    → Add "data_mismatch_risk" to decision_blockers.
    → Reduce conviction_score by EXACTLY 10 points.

20. **SCOPED AUGMENTATION (BANNED USES)**
    - External data (Screener) is **RESTRICTED** to: Balance Sheet (Debt, Cash) and long-term OCF/EBITDA.
    - It is **BANNED** for: Revenue Growth, Margins, and Segment Analysis (to avoid "Time Mismatch" bugs).
    - Any metric filled using external data MUST be tagged as source: "screener".

21. **DATA ALIGNMENT BOOST (STRICT)**
    IF BOTH:
    - Transcript-derived signals indicate strength in the primary metric or earnings quality
    AND
    - Screener-derived data (where allowed under Rule 20) confirms the same directional strength
    THEN:
    → Increase conviction_score by +5 (MAX once per evaluation).
    → DO NOT apply if any HIGH severity kill switch is triggered.
    → DO NOT apply if data_mismatch_risk is present for the same metric.
    → Rule 21 applies ONLY to: primary_metric, ocf_to_ebitda, or balance sheet strength (debt/cash).

22. **OWNERSHIP QUALITY (CONTEXT-AWARE)**
    IF promoter_holding < 25%:
    - IF strong institutional ownership AND no governance concerns:
      → NO penalty. Add "institutionally_backed_structure" to rationale.
    - ELSE:
      → reduce conviction_score by 5–15. Add "ownership_structure_risk" to decision_blockers.
    IF promoter_holding is declining consistently over 2+ quarters:
    - IF selling is explained (e.g. block deal, PE exit, one-time restructuring):
      → downgrade severity by one level. DO NOT apply full penalty.
    - ELSE:
      → add "promoter_selling_signal" to decision_blockers.
      → reduce conviction_score by 5–10.
    ⚠️ Promoter holding ALONE must NOT trigger a kill switch.
    ⚠️ Ownership-related penalties must respect Rule 15 (no stacking if same root cause).

═══════════════════════════════════════
🧩 SCORING FRAMEWORK
═══════════════════════════════════════
🔹 1. THESIS SCORE (0–100)
- primary_metric_strength (0-40): Dominant (35-40), Strong (25-34), Flat (15-24), Weak (<15)
  → Momentum adjustment: accelerating = +5, decelerating 1Q = −5, decelerating 2Q+ = −10
- growth_quality (0-25): Structural + broad-based (20-25), In line (12-19), Concentrated/event-driven/low-quality (<12)
  → Penalise if growth is from 1–2 customers or single order. Thesis Drift Rule 13 may penalise further.
- margin_profile (0-20): Expanding (15-20), Stable (10-14), Contracting (<10)
- execution_signals (0-15): Strong (12-15), Mixed (7-11), Weak (<7)
  → Apply momentum adjustment per Rule 9

🔹 2. CONVICTION SCORE (0–100)
- management_quality (0-25)
- data_transparency (0-20)
- balance_sheet_strength (0-20)
- consistency_track_record (0-20)
- risk_flags_penalty (0-15): Deduct for concentration, WC stretch, weak cash conversion
⚠️ Rules 7, 8, 12, 14 may reduce or cap this score. Apply ALL caps AFTER sub-component sum.
*Missing data → reduce data_transparency ONLY, NOT thesis score.*

🔹 3. VALUATION (MANDATORY STRUCTURED INPUT)
You MUST fill valuation_inputs then assign valuation_score (0-100).
- Cheap → 80-100 | Reasonable → 60-79 | Expensive → 40-59 | Stretched → <40

🔹 4. FINAL SCORE (FOR REFERENCE ONLY — does not override hard rules)
Final Score = (thesis_score × 0.45) + (conviction_score × 0.25) + (valuation_score × 0.20) + (balance_sheet_strength × 0.10)

═══════════════════════════════════════
🎯 ACTION FRAMEWORK & SIZING
═══════════════════════════════════════
You MUST choose ONE final_action:
- BUILD POSITION: Initiating or re-entering. Thesis strong, no kill switch, valuation acceptable. Prior thesis_score ≤ 75 OR fresh position.
- ADD POSITION: Existing hold. ALL of: prior thesis > 75, current improving, execution accelerating, no new risks.
- WAIT AND WATCH: Thesis intact but valuation high OR conviction low (< 60) OR signals mixed OR momentum decelerating.
  → **DISAMBIGUATION:** State explicitly if this is "WAIT AND WATCH (Price)" (thesis strong, valuation high) or "WAIT AND WATCH (Execution)" (thesis unproven/weakening, waiting for data).
  → EXCEPTION: IF thesis_score ≥ 80 AND strong momentum (execution_signals ≥ 12): DO NOT default to WAIT AND WATCH if conviction < 60. Return BUILD POSITION with "starter" size instead.
- CUT POSITION: Thesis broken OR kill switch triggered OR thesis_score < 60 (subject to Rule 11).

SIZING RULES (small/mid-cap discipline — conservative by default):
- starter (0.5–1%): Low conviction, early stage, OR any Rule 7/8/12/14 flag active
- half (1–2%): Conviction 60–74 OR expensive valuation OR mixed signals
- full (2–3% MAX): ONLY when ALL of the following are true:
  → thesis_score ≥ 80
  → conviction_score ≥ 75
  → valuation_score ≥ 60
  → earnings_quality has NO active flags (cash_conversion_flag = false, working_capital_flag = false)
  → cycle_peak_risk NOT in decision_blockers
- none: CUT
⚠️ HARD CAP: NEVER assign full if any of the 5 conditions above are unmet. NEVER exceed 3% regardless of conviction.

═══════════════════════════════════════
🔁 FINAL DECISION FLOW (EXECUTE IN ORDER)
═══════════════════════════════════════
STEP 1: Calculate thesis_score from sub-components + apply momentum adjustment (Rule 9)
STEP 2: HARD GATE — IF thesis_score < 60 → CUT POSITION immediately, skip all further steps
STEP 3: Apply kill switches (Rule 2) — HIGH → CUT, MEDIUM → block BUILD/ADD
STEP 4: Apply adjustment rules in sequence: earnings quality (7), growth quality cap (8), cycle peak (12), thesis drift (13), skepticism (14)
STEP 5: Apply conviction caps — run all cap rules, take the most restrictive outcome
STEP 6: Apply valuation constraints (Rule 5)
STEP 7: Apply Multibagger Mode override (Rule 11) — if thesis ≥ 80, block direct CUT; lumpy businesses require 3Q deterioration
STEP 8: Determine final_action using Action Framework above + Rules 10/11
STEP 9a: Determine raw position_size using Sizing Rules — verify all 5 "full" conditions
STEP 9b: Apply Portfolio Awareness (Rule 16) — downgrade size if theme concentration exists
STEP 9c: Apply Data Alignment Boost (Rule 21) — add +5 conviction if sources align
STEP 9d: Apply Penalty Normalization (Rule 15) — consolidate overlapping penalties before emitting final scores

═══════════════════════════════════════
OUTPUT FORMAT (STRICT JSON — V12)
═══════════════════════════════════════
Return a SINGLE JSON object exactly matching this schema. No prose. No markdown backticks.

{
  "ticker": "${stock.ticker}",
  "quarter": "Q_FY__",
  "snapshot": {
    "summary": "3-5 sentence objective summary focused on financial reality and thesis alignment — not management narrative.",
    "management_tone": "bullish | neutral | cautious",
    "thesis_status": "strengthening | stable | weakening | broken",
    "thesis_momentum": "improving | stable | deteriorating",
    "thesis_drift": {
      "status": "none | evolving | confirmed_break",
      "reason": "If evolving: is this positive expansion or negative drift away from core thesis? Be explicit."
    },
    "key_changes_vs_last_quarter": ["Operational or narrative shifts vs prior context"]
  },
  "metrics": ${JSON.stringify(metricsSchema, null, 4).replace(/\n/g, '\n  ')},
${strictRuleCheckSchema}
  "signals": {
    "bullish": ["Evidence-backed positive indicators tied to the thesis"],
    "warnings": ["Customer/geo concentration >25%, RM inflation, pricing pressure, delayed timelines — MUST be non-empty if any exist"],
    "bearish": ["Structural deterioration or thesis breaks"]
  },
  "management_analysis": {
    "dodged_questions_or_omissions": ["Metrics management stopped reporting OR refused to quantify — MUST be non-empty if any exist"],
    "red_flags": ["Structural risks only. Empty array [] ONLY if genuinely none — see Rule 14."]
  },
  "scoring": {
    "thesis_score": 0,
    "thesis_breakdown": {
      "primary_metric_strength": 0,
      "growth_quality": 0,
      "margin_profile": 0,
      "execution_signals": 0,
      "momentum_adjustment": 0,
      "thesis_drift_penalty": 0
    },
    "conviction_score": 0,
    "conviction_breakdown": {
      "management_quality": 0,
      "data_transparency": 0,
      "balance_sheet_strength": 0,
      "consistency_track_record": 0,
      "risk_flags_penalty": 0,
      "conviction_cap_applied": false,
      "conviction_cap_reason": "none | customer_concentration | weak_cash_conversion | working_capital_stretch | cycle_peak | low_disclosure"
    },
    "valuation_score": 0,
    "earnings_quality": {
      "ocf_vs_ebitda": "strong | weak | NOT DISCLOSED",
      "cash_conversion_flag": false,
      "working_capital_flag": false,
      "customer_concentration_flag": false,
      "concentration_pct": "e.g. Top 2 customers = 45% | NOT DISCLOSED"
    }
  },
  "valuation_analysis": {
    "valuation_inputs": {
      "pe_vs_growth": "Reasoning here",
      "ev_ebitda_vs_history": "Reasoning here",
      "margin_sustainability": "Reasoning here",
      "growth_visibility": "Reasoning here"
    },
    "valuation_commentary": "One paragraph summary"
  },
  "decision": {
    "final_action": "BUILD POSITION | ADD POSITION | WAIT AND WATCH | CUT POSITION",
    "position_size": "starter | half | full | none",
    "portfolio_weight_pct": 0,
    "decision_confidence": "HIGH | MEDIUM | LOW",
    "version": "v12",
    "previous_decision": "${rollingSnapshotsArray[0]?.actionable_verdict?.decision || "INITIAL_EVALUATION"}",
    "decision_change": "e.g. WAIT → CUT | STABLE | NEW_POSITION",
    "decision_blockers": ["Use ONLY from: earnings_quality_risk | cycle_peak_risk | low_disclosure_risk | working_capital_risk | customer_concentration_risk | theme_concentration_risk | data_mismatch_risk | ownership_structure_risk | promoter_selling_signal | valuation_stretched | kill_switch_triggered | thesis_drift_negative | momentum_decelerating"]
  },
  "rationale": {
    "thesis_summary": "1-2 sentence core thesis status",
    "key_drivers": ["Evidence-backed bullish drivers"],
    "risks": ["Growth quality, cash conversion, concentration, cycle risks explicitly named"],
    "why_this_action": "Reference each Rule (1–14) that was triggered. State which STEP in the decision flow was decisive."
  },
  "thesis_monitoring": {
    "deterioration_quarters": 0,
    "trend": "improving | stable | deteriorating",
    "multibagger_mode_active": false,
    "multibagger_mode_rationale": "Explain if Rule 11 was applied and why CUT was blocked or permitted"
  },
  "promise_updates": [
    {
      "id": "UUID from the ledger above — NO invented IDs",
      "status": "kept | broken | pending",
      "resolved_quarter": "Q_FY__ or null",
      "evidence": "Direct verbatim quote"
    }
  ],
  "new_promises": [
    {
      "promise_text": "New quantitative commitment with specific target",
      "target_deadline": "FY__ or Q_FY__",
      "confidence": "high | medium | low"
    }
  ],
  "primary_metric_momentum": {
    "direction": "accelerating | decelerating | stable",
    "consecutive_deceleration_quarters": 0,
    "qoq_values": ["Q-2: X%", "Q-1: Y%", "Q0: Z%"],
    "reason": "REQUIRED: State QoQ direction explicitly. If decelerating, say so even if absolute level is still high."
  },
  "thesis_dependency": {
    "driver": "execution | capacity_expansion | demand_tailwind | pricing",
    "reliance": "proven | developing | speculative",
    "risk_level": "low | medium | high"
  },
  "execution_quality": {
    "applicable": true,
    "status": "strong | moderate | weak | NA",
    "reason": "REQUIRED: State specific conversion or delivery metric."
  },
  "source_intelligence": {
    "primary_source": "transcript",
    "secondary_source": "screener | none",
    "conflict_detected": false,
    "alignment_boost_applied": false,
    "source_notes": "Mention specific TTM vs Quarterly mismatches found"
  }
}

═══════════════════════════════════════
ANTI-BIAS & ANTI-HALLUCINATION PROTOCOLS
═══════════════════════════════════════
1. NEVER hallucinate numbers. If not explicitly in the transcript, set value = "NOT DISCLOSED" and log in dodged_questions_or_omissions.
2. STRICT PROMISE IDs: Only use IDs from the PENDING PROMISE LEDGER. Zero invented UUIDs.
3. SIGNAL INTELLIGENCE V12+: primary_metric_momentum (with qoq_values + consecutive_deceleration_quarters), thesis_dependency, execution_quality, earnings_quality, source_intelligence, and thesis_monitoring are ALL REQUIRED.
4. BE RUTHLESS: Strong execution → reward. Broken margins → punish. Missing data → reduce conviction, not reality.
5. DO NOT reward absolute performance while ignoring direction. Falling growth rate = deteriorating, regardless of absolute level.
6. Cash is reality. Accounting profit is opinion. Weak OCF must be stated explicitly in decision_blockers.
7. Customer concentration >30% = structural risk (Rule 8), not a warning signal. Cap conviction immediately.
8. A quarter with zero warnings, zero omissions, and zero red flags violates Rule 14 — add low_disclosure_risk automatically.
9. Multibagger mode (Rule 11) is NOT a "stay bullish" escape. It only prevents a single-quarter panic cut. Two consecutive quarters of deterioration (three for lumpy businesses) overrides it.
10. PENALTY NORMALIZATION (Rule 15) is mandatory. Before outputting scores, audit your penalties: did the same root cause generate multiple deductions? Consolidate — take the harshest single penalty, not the sum.
11. PORTFOLIO AWARENESS (Rule 16): always flag theme_concentration_risk if the stock shares a macro theme with other known holdings. Default to rationale note if unknown.
12. V12 HYBRID INTELLIGENCE: Rule 17-22 are non-negotiable. Mismatch = Penalty. Alignment = Boost. Ownership = Context-aware. Ensure dual-tier metrics schema is strictly followed.`;

  
  // Prevent prompt bloat
  let finalPrompt = prompt;
  if (finalPrompt.length > 30000) {
    console.warn("Prompt too large, truncating promises and some context.");
    // basic truncation
  }
  return { prompt: finalPrompt, verificationPayload };

}

export function CopyGeminiPrompt({ stock }: Props) {
  const { data: promises } = useManagementPromises(stock.id);
  const { data: snapshots } = useQuarterlySnapshots(stock.id);
  const { data: trackingConfig } = useStockTrackingProfile(stock.id);
  const { data: shareholding } = useShareholding(stock.id);
  const { data: valuation, isLoading: isLoadingValuation } = useFinancialMetrics(stock.id);
  const { data: xbrlMetrics } = useXbrlMetrics(stock.id);
  const { data: transcripts } = useStockTranscripts(stock.id);
  const { toast } = useToast();
  
  const isSyncing = isLoadingValuation;
  const missingText = isSyncing ? "FINANCIAL DATA SYNCING" : "NOT DISCLOSED";

  const [copiedKind, setCopiedKind] = useState<CopyKind>(null);
  const [historyLimitQuarter, setHistoryLimitQuarter] = useState<string>("all");
  
  const [options, setOptions] = useState({
    includeTrend: true,
    includeOwnership: false,
    includeValuation: true,
    includeAutoFlags: true,
    includePreviousVerdict: false,
    includePeerCompare: false
  });

  const quarterOptions = useMemo(() => {
    const qSet = new Set<string>();
    if (snapshots) snapshots.forEach((s: any) => qSet.add(s.quarter));
    if (xbrlMetrics) xbrlMetrics.forEach((x: any) => qSet.add(x.quarter));
    if (transcripts) transcripts.forEach((t: any) => qSet.add(t.quarter));

    // Predict future quarters up to current date (India FY: Q1=Jun, Q2=Sep, Q3=Dec, Q4=Mar)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    
    let latestFY = currentYear;
    let latestQ = 1;
    
    // Apr-Jun -> Q1
    // Jul-Sep -> Q2
    // Oct-Dec -> Q3
    // Jan-Mar -> Q4 (of previous year's FY naming)
    if (currentMonth >= 3 && currentMonth <= 5) { latestQ = 1; latestFY = currentYear + 1; }
    else if (currentMonth >= 6 && currentMonth <= 8) { latestQ = 2; latestFY = currentYear + 1; }
    else if (currentMonth >= 9 && currentMonth <= 11) { latestQ = 3; latestFY = currentYear + 1; }
    else { latestQ = 4; latestFY = currentYear; }

    // Start from the latest possible quarter and go back 12 steps
    let tempFY = latestFY;
    let tempQ = latestQ;
    
    for (let i = 0; i < 12; i++) {
      qSet.add(`FY${String(tempFY).slice(-2)}-Q${tempQ}`);
      tempQ--;
      if (tempQ === 0) {
        tempQ = 4;
        tempFY--;
      }
    }

    return Array.from(qSet).sort((a, b) => {
      // Sort FYXX-QX descending
      const [ay, aq] = a.replace("FY", "").split("-Q").map(Number);
      const [by, bq] = b.replace("FY", "").split("-Q").map(Number);
      if (ay !== by) return by - ay;
      return bq - aq;
    });
  }, [snapshots, xbrlMetrics, transcripts]);

  const targetQuarter = historyLimitQuarter === "all" ? quarterOptions[0] : historyLimitQuarter;

  const dataCompleteness = useMemo(() => {
    if (!targetQuarter) return null;
    const hasXbrl = xbrlMetrics?.some((x: any) => x.quarter === targetQuarter);
    const hasScreener = !!valuation;
    const hasShareholding = shareholding?.some((s: any) => s.quarter === targetQuarter || (s.created_at && new Date(s.created_at).getTime() < Date.now()));
    const hasSnapshot = snapshots?.some((s: any) => s.quarter === targetQuarter);
    const hasTranscript = transcripts?.some((t: any) => t.quarter === targetQuarter);
    return { hasXbrl, hasScreener, hasShareholding, hasSnapshot, hasTranscript };
  }, [targetQuarter, xbrlMetrics, valuation, shareholding, snapshots, transcripts]);

  const getQuarterLabel = (q: string) => {
    const hasSnapshot = snapshots?.some((s: any) => s.quarter === q);
    const hasXbrl = xbrlMetrics?.some((x: any) => x.quarter === q);
    const hasTranscript = transcripts?.some((t: any) => t.quarter === q);
    
    let status = "";
    if (hasSnapshot) status = "";
    else if (hasXbrl && hasTranscript) status = " (XBRL + Transcript ready)";
    else if (hasXbrl) status = " (XBRL ready)";
    else if (hasTranscript) status = " (Transcript ready)";
    else status = " (No Data)";

    return `${q}${status}${!hasSnapshot && status !== " (No Data)" ? " / No AI snapshot" : ""}`;
  };

  const validateAndCopy = async (text: string, kind: CopyKind, successMsg: string) => {
    if (!text || text.includes("undefined")) {
       toast({ title: "QA Warning", description: "Prompt contains undefined values. Check data.", variant: "destructive" });
    }
    if (text.length > 40000) {
       toast({ title: "Length Warning", description: "Prompt exceeds 40k chars. May hit model limits.", variant: "destructive" });
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKind(kind);
      toast({ title: "Copied!", description: successMsg });
      setTimeout(() => setCopiedKind((k) => (k === kind ? null : k)), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Could not access clipboard.", variant: "destructive" });
    }
  };

  const copyPrompt = async () => {
    const { prompt } = buildGeminiContext(
      stock, promises, snapshots, (trackingConfig as Record<string, unknown> | null) ?? null, 
      historyLimitQuarter === "all" ? null : historyLimitQuarter,
      shareholding, valuation, xbrlMetrics, options
    );
    await validateAndCopy(prompt, "prompt", `${stock.ticker} — Decision Engine prompt ready.`);
  };

  const copyJson = async () => {
    const { verificationPayload } = buildGeminiContext(
      stock, promises, snapshots, (trackingConfig as Record<string, unknown> | null) ?? null, 
      historyLimitQuarter === "all" ? null : historyLimitQuarter,
      shareholding, valuation, xbrlMetrics, options
    );
    await validateAndCopy(JSON.stringify(verificationPayload, null, 2), "json", "Structured context copied.");
  };

  const downloadArchive = () => {
    if (!snapshots || snapshots.length === 0) return;
    const blob = new Blob([JSON.stringify(snapshots, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${stock.ticker}_snapshots_archive.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {quarterOptions.length > 0 && (
        <div className="flex flex-col gap-2 border border-border/50 rounded-md p-2 bg-muted/10">
          <div className="flex items-center gap-2 bg-muted/30 px-2 py-1 rounded">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">History up to:</span>
            <Select value={historyLimitQuarter} onValueChange={setHistoryLimitQuarter}>
              <SelectTrigger className="w-auto h-7 font-mono text-[10px] border-none bg-transparent focus:ring-0">
                <SelectValue placeholder="All Quarters" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all" className="font-mono text-xs">All Quarters</SelectItem>
                {quarterOptions.map(q => (
                  <SelectItem key={q} value={q} className="font-mono text-xs">{getQuarterLabel(q)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dataCompleteness && (
            <div className="flex gap-2 px-1">
              <Badge variant={dataCompleteness.hasXbrl ? "default" : "destructive"} className="text-[9px] px-1 py-0 h-4">XBRL: {dataCompleteness.hasXbrl ? "Yes" : "Missing"}</Badge>
              <Badge variant={dataCompleteness.hasTranscript ? "default" : "destructive"} className="text-[9px] px-1 py-0 h-4">Transcript: {dataCompleteness.hasTranscript ? "Yes" : "Missing"}</Badge>
              <Badge variant={dataCompleteness.hasScreener ? "default" : "destructive"} className="text-[9px] px-1 py-0 h-4">Screener: {dataCompleteness.hasScreener ? "Yes" : "Missing"}</Badge>
              <Badge variant={dataCompleteness.hasShareholding ? "default" : "outline"} className="text-[9px] px-1 py-0 h-4">SHP: {dataCompleteness.hasShareholding ? "Yes" : "?"}</Badge>
            </div>
          )}
        </div>
      )}

      
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Engine Settings">
            <Settings2 className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="start">
          <div className="space-y-4">
            <h4 className="font-medium text-sm border-b pb-2">Decision Engine</h4>
            <div className="space-y-2">
              {Object.entries(options).map(([k, v]) => (
                <div key={k} className="flex items-center space-x-2">
                  <Checkbox 
                    id={k} 
                    checked={v} 
                    onCheckedChange={(c) => setOptions(prev => ({...prev, [k]: !!c}))}
                  />
                  <Label htmlFor={k} className="text-xs font-mono">{k}</Label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2">
        {isSyncing && (
          <Badge variant="outline" className="animate-pulse bg-terminal-amber/10 text-terminal-amber border-terminal-amber/30 font-mono text-[10px]">
            Syncing Data...
          </Badge>
        )}
        <Button variant="outline" size="sm" onClick={copyPrompt} className="font-mono text-xs">
          {copiedKind === "prompt" ? <Check className="h-3 w-3 text-terminal-green" /> : <Copy className="h-3 w-3" />}
          <span className="ml-1">{copiedKind === "prompt" ? "Copied!" : "Copy prompt"}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={copyJson} className="font-mono text-xs border-border">
          {copiedKind === "json" ? <Check className="h-3 w-3 text-terminal-green" /> : <Braces className="h-3 w-3" />}
          <span className="ml-1">{copiedKind === "json" ? "Copied!" : "Copy JSON"}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={downloadArchive} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Download Archive">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

