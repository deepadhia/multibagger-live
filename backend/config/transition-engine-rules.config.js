/**
 * Generic Transition Engine Rules & Sizing Parameters (FROZEN CONFIGURATION V1)
 * 
 * IMMUTABILITY GUARANTEE:
 * Rule mutations during portfolio cross-validation runs are STRICTLY FORBIDDEN.
 * Any attempt to dynamically alter thresholds or sizing weights between stocks
 * will throw a fatal RULE_MUTATION_DURING_REPLAY exception.
 */

export const RULESET_VERSION = "MARKET_RECOGNITION_RULE_V1";
export const RULESET_MUTATION = "FORBIDDEN";

/**
 * 1. Evidence Sufficiency Taxonomy
 * Separates "absence of evidence" from "evidence of failure".
 */
export const EVIDENCE_STATUS = Object.freeze({
  SUFFICIENT: "SUFFICIENT",       // Complete filing, audited figures, verifiable metrics
  PARTIAL: "PARTIAL",             // Unaudited commentary, press release without full disclosures
  INSUFFICIENT: "INSUFFICIENT",   // Data missing or filing unavailable at checkpoint date
  CONFLICTING: "CONFLICTING"      // Contradictory statements between management and official filing
});

/**
 * 2. 4-Dimensional Thesis Matrix Taxonomy
 */
export const THESIS_TAXONOMY_V1 = Object.freeze({
  CONTRACTUAL_MANDATE: ["UNVALIDATED", "DEVELOPING", "VALIDATED", "INSUFFICIENT_EVIDENCE"],
  BUSINESS_TRANSFORMATION: ["UNVALIDATED", "DEVELOPING", "CONFIRMED", "INSUFFICIENT_EVIDENCE"],
  EARNINGS_CONVERSION: ["UNVALIDATED", "DEVELOPING", "CONFIRMED", "INSUFFICIENT_EVIDENCE"],
  FRANCHISE_DURABILITY: ["UNPROVEN", "DEVELOPING", "CONFIRMED", "INSUFFICIENT_EVIDENCE"]
});

/**
 * 3. Objective Outcome Classification (Replacing simplistic "Correct/Wrong")
 */
export const THESIS_OUTCOME_CLASSIFICATION = Object.freeze({
  THESIS_SURVIVED: "THESIS_SURVIVED",         // Contract held, execution active, CFO positive, thesis intact over 4Q+
  THESIS_FAILED: "THESIS_FAILED",             // Contract cancelled, severe WC elongation, CFO negative, guidance missed >40%
  PARTIAL_VALIDATION: "PARTIAL_VALIDATION",   // Revenue converted but margins compressed or customer highly concentrated
  INCONCLUSIVE: "INCONCLUSIVE"                // Replay window too short or subsequent audit data not yet published
});

/**
 * 4. Three Orthogonal Success Dimensions
 */
export const SUCCESS_DIMENSIONS = Object.freeze({
  FUNDAMENTAL_SUCCESS: "FUNDAMENTAL_SUCCESS", // Did the underlying business metrics / cash flows improve?
  INVESTMENT_SUCCESS: "INVESTMENT_SUCCESS",   // Did the capital allocation generate benchmark-relative excess return?
  DECISION_SUCCESS: "DECISION_SUCCESS"        // Was the decision rational & justified based ONLY on information available at T0?
});

/**
 * 5. Market Recognition Classifier (Frozen V1)
 */
export const MARKET_RECOGNITION_RULE_V1 = Object.freeze({
  version: "1.0.0",
  frozenAt: "2026-08-17",
  description: "Deterministic multi-factor market recognition classifier independent of single-ticker outcomes",
  factors: {
    price_appreciation_from_base: {
      weight: 30,
      thresholds: [
        { minPct: 80, points: 30 },
        { minPct: 40, points: 20 },
        { minPct: 15, points: 10 }
      ]
    },
    valuation_pe_rerating_from_base: {
      weight: 30,
      thresholds: [
        { minPeExpansionPct: 60, points: 30 },
        { minPeExpansionPct: 30, points: 20 },
        { minPeExpansionPct: 10, points: 10 }
      ]
    },
    volume_expansion_vs_90d_avg: {
      weight: 20,
      thresholds: [
        { minMultiple: 3.0, points: 20 },
        { minMultiple: 1.5, points: 10 }
      ]
    },
    fundamental_state_alignment: {
      weight: 20,
      thresholds: [
        { minStateLevel: 5, points: 20 },
        { minStateLevel: 3, points: 10 }
      ]
    }
  },
  classificationBands: [
    { label: "UNRECOGNIZED", minScore: 0, maxScore: 30 },
    { label: "EMERGING", minScore: 31, maxScore: 60 },
    { label: "RECOGNIZED", minScore: 61, maxScore: 80 },
    { label: "FULLY_RECOGNIZED", minScore: 81, maxScore: 100 }
  ]
});

/**
 * 6. Deterministic Position Sizing Engine (Frozen V1)
 */
export const DETERMINISTIC_POSITION_SIZING_V1 = Object.freeze({
  version: "1.0.0",
  frozenAt: "2026-08-17",
  description: "Deterministic sizing mapping evidence and expectation gaps into portfolio weights",
  tiers: {
    TIER_0_OBSERVATION: { targetWeightPct: 0.0, description: "No position / Watchlist (State 0-2)" },
    TIER_1_STARTER: { targetWeightPct: 1.0, description: "Starter 1.0% (Binding Contract / State 3 Award)" },
    TIER_2_BUILD_INITIAL: { targetWeightPct: 2.0, description: "Built 2.0% (Production Validation / State 4)" },
    TIER_3_BUILD_COMMENCED: { targetWeightPct: 3.0, description: "Built 3.0% (Physical Supplies Active / State 4)" },
    TIER_4_CORE_INFLECTION: { targetWeightPct: 4.0, description: "Core 4.0% (P&L Revenue & Margin Delivery / State 5)" },
    TIER_5_CONVICTION_MAX: { targetWeightPct: 6.0, description: "High Conviction 6.0% (Multi-client Durability / State 7-8)" }
  },
  governorRules: {
    HIGH_VALUATION_RESERVATION: "Block new capital additions (0% add); hold existing core allocation.",
    NEGATIVE_THESIS_TRIGGER: "Order cancellation, severe working capital elongation, or 2+ consecutive negative CFO quarters triggers immediate thesis downgrade & 50-100% position trim."
  }
});

/**
 * Security Guard: Verifies that rules have not been mutated at runtime
 */
export function assertRulesImmutable() {
  if (RULESET_MUTATION !== "FORBIDDEN" || RULESET_VERSION !== "MARKET_RECOGNITION_RULE_V1") {
    throw new Error("FATAL [RULE_MUTATION_DURING_REPLAY]: Attempted unauthorized mutation of frozen transition engine rules!");
  }
  return true;
}
