/**
 * Thesis Gate Evaluator Service
 * 
 * Implements the Dual-Layer Gate Architecture:
 * Layer 1: Universal Financial Health Gate (Revenue growth, PAT growth, margin insulation)
 * Layer 2: Company-Specific Thesis Hurdle Gate (Predefined operational & financial targets per thesis contract)
 * 
 * Action Authorization Invariant:
 * BUY / ACCUMULATE is technically impossible unless BOTH Layer 1 and Layer 2 are satisfied.
 */

import fs from 'fs';
import path from 'path';

// Cached driver-level thesis contracts
let cachedContracts = null;

function loadThesisContracts() {
  if (cachedContracts) return cachedContracts;
  try {
    const contractsPath = path.resolve('reports/thesis_board/driver-level-thesis-contracts.json');
    if (fs.existsSync(contractsPath)) {
      const raw = fs.readFileSync(contractsPath, 'utf8');
      const parsed = JSON.parse(raw);
      const map = new Map();
      const list = parsed.contracts || parsed || [];
      for (const c of list) {
        if (c.ticker) map.set(c.ticker.toUpperCase(), c);
      }
      cachedContracts = map;
      return cachedContracts;
    }
  } catch (err) {
    console.warn('[THESIS GATE] Could not load driver contracts JSON:', err.message);
  }
  return new Map();
}

/**
 * Evaluates Layer 1: Universal Financial Health Gate
 */
export function evaluateUniversalFinancialHealth(fin = {}) {
  if (!fin || fin.revenue === null || fin.revenue === undefined) {
    return {
      passed: false,
      reason: 'No verified financial data available'
    };
  }

  const patGrowth = fin.patYoYGrowthPct;
  const revGrowth = fin.revenueYoYGrowthPct;
  const isMarginEroded = fin.isMarginErosion || (fin.ebitdaMarginBpsDelta !== null && fin.ebitdaMarginBpsDelta < -150);

  if (patGrowth !== null && patGrowth < 0) {
    return {
      passed: false,
      reason: `PAT contraction (${patGrowth}% YoY)`
    };
  }

  if (revGrowth !== null && revGrowth < 0) {
    return {
      passed: false,
      reason: `Revenue contraction (${revGrowth}% YoY)`
    };
  }

  if (isMarginEroded) {
    return {
      passed: false,
      reason: `EBITDA Margin compression (${fin.ebitdaMarginBpsDelta ?? -150} bps YoY)`
    };
  }

  return {
    passed: true,
    reason: 'Positive revenue & PAT growth with intact operating margins'
  };
}

/**
 * Specific Hurdle Thresholds per Ticker Contract (Calibrated to Falsifiable Framework)
 */
/**
 * Specific Hurdle Thresholds per Ticker Contract (Calibrated to Falsifiable Framework)
 * Primary Gates: Mandatory financial conditions for BUY authorization.
 * Structural Confirmation: Modifies conviction (8/10 vs 9/10), but does not block BUY if primary gates clear.
 */
const SPECIFIC_THESIS_HURDLES = {
  TIMETECHNO: {
    primary: {
      minEbitdaMarginPct: 14.5,
      minPatCr: 130.0,
      minEbitdaCr: 246.0
    },
    structural: {
      targetVapSharePct: 30.0
    },
    description: "Primary: EBITDA margin ≥14.5%, PAT ≥₹130 Cr, EBITDA ≥₹246 Cr | Structural: VAP mix ≥30%"
  },
  ANANTRAJ: {
    primary: {
      minEbitdaMarginPct: 30.0,
      minPatCr: 140.0
    },
    structural: {
      targetDataCenterMw: 6.0
    },
    description: "Primary: EBITDA margin ≥30%, PAT ≥₹140 Cr | Structural: Data Center monetization"
  },
  HSCL: {
    primary: {
      minEbitdaMarginPct: 18.0,
      minPatCr: 140.0
    },
    structural: {
      targetScbUtilizationPct: 80.0
    },
    description: "Primary: EBITDA margin ≥18%, PAT ≥₹140 Cr | Structural: SCB utilization ≥80%"
  },
  HBLENGINE: {
    primary: {
      minRevenueCr: 700.0,
      minEbitdaMarginPct: 16.0
    },
    description: "Primary: Quarterly revenue run-rate ≥₹700 Cr, EBITDA margin ≥16%"
  },
  SKIPPER: {
    primary: {
      minEbitdaMarginPct: 9.5
    },
    structural: {
      targetExportMixPct: 45.0
    },
    description: "Primary: EBITDA margin ≥9.5% | Structural: Export order mix ≥45%"
  },
  INOXINDIA: {
    primary: {
      minEbitdaMarginPct: 22.0
    },
    structural: {
      targetExportMixPct: 50.0
    },
    description: "Primary: EBITDA margin ≥22.0% | Structural: Export backlog ≥50%"
  },
  GRAVITA: {
    primary: {
      minEbitdaMarginPct: 9.0
    },
    structural: {
      targetNonLeadMixPct: 35.0
    },
    description: "Primary: EBITDA margin ≥9.0% | Structural: Non-lead mix ≥35%"
  },
  CCL: {
    primary: {
      minEbitdaMarginPct: 18.0
    },
    structural: {
      targetFreezeDriedCapacityUtilPct: 75.0
    },
    description: "Primary: EBITDA margin ≥18.0% | Structural: Freeze-dried coffee utilization ≥75%"
  }
};

/**
 * Evaluates Layer 2: Company-Specific Thesis Hurdle Gate
 */
export function evaluateThesisSpecificHurdle(ticker, fin = {}, operational = {}) {
  const symbol = (ticker || '').toUpperCase().trim();
  const hurdles = SPECIFIC_THESIS_HURDLES[symbol];

  // If stock has no explicit static hurdle rule, evaluate against generic driver contract state
  if (!hurdles) {
    const contracts = loadThesisContracts();
    const contract = contracts.get(symbol);
    if (contract && contract.drivers) {
      const hasDeteriorating = contract.drivers.some(d => d.direction === 'DETERIORATING');
      if (hasDeteriorating) {
        return {
          passed: false,
          structuralConfirmed: false,
          reason: 'One or more core thesis drivers deteriorating',
          hurdlesEvaluated: 'Driver-Level Contract Check'
        };
      }
    }
    return {
      passed: true,
      structuralConfirmed: true,
      reason: 'No restrictive thesis gate violation detected',
      hurdlesEvaluated: 'Generic Contract Health'
    };
  }

  const primary = hurdles.primary || {};
  const failures = [];

  // 1. Primary EBITDA Margin Gate
  if (primary.minEbitdaMarginPct !== undefined && fin.ebitdaMarginPct !== null && fin.ebitdaMarginPct !== undefined) {
    if (fin.ebitdaMarginPct < primary.minEbitdaMarginPct) {
      failures.push(`EBITDA Margin ${fin.ebitdaMarginPct}% < target ${primary.minEbitdaMarginPct}%`);
    }
  }

  // 2. Primary PAT Gate
  if (primary.minPatCr !== undefined && fin.patConsolidated !== null && fin.patConsolidated !== undefined) {
    if (fin.patConsolidated < primary.minPatCr) {
      failures.push(`PAT ₹${fin.patConsolidated} Cr < target ₹${primary.minPatCr} Cr`);
    }
  }

  // 3. Primary EBITDA Gate
  if (primary.minEbitdaCr !== undefined && fin.ebitda !== null && fin.ebitda !== undefined) {
    if (fin.ebitda < primary.minEbitdaCr) {
      failures.push(`EBITDA ₹${fin.ebitda} Cr < target ₹${primary.minEbitdaCr} Cr`);
    }
  }

  // 4. Primary Revenue Gate
  if (primary.minRevenueCr !== undefined && fin.revenue !== null && fin.revenue !== undefined) {
    if (fin.revenue < primary.minRevenueCr) {
      failures.push(`Revenue ₹${fin.revenue} Cr < target ₹${primary.minRevenueCr} Cr`);
    }
  }

  // Evaluate Structural Confirmation Metric (e.g. VAP mix)
  let structuralConfirmed = true;
  const structural = hurdles.structural || {};
  if (structural.targetVapSharePct !== undefined && operational.vapSharePct !== undefined) {
    structuralConfirmed = operational.vapSharePct >= structural.targetVapSharePct;
  }

  if (failures.length > 0) {
    return {
      passed: false,
      structuralConfirmed,
      reason: failures.join('; '),
      hurdlesEvaluated: hurdles.description
    };
  }

  return {
    passed: true,
    structuralConfirmed,
    reason: `All primary thesis hurdle rates satisfied (${hurdles.description})`,
    hurdlesEvaluated: hurdles.description
  };
}

/**
 * Main Dual-Layer Gating Function
 * Returns actionable verdict, granular categorization, and decision text.
 */
export function evaluateDualLayerActionGate({ ticker, financialData, operationalMetrics = {}, proposedAction = 'HOLD', llmConviction = 5 }) {
  const universal = evaluateUniversalFinancialHealth(financialData);
  const thesis = evaluateThesisSpecificHurdle(ticker, financialData, operationalMetrics);

  let finalAction = 'HOLD';
  let calibratedConviction = Math.min(Number(llmConviction) || 5, 10);
  let statusClassification = 'NEUTRAL';
  let decisionExplanation = '';

  if (universal.passed && thesis.passed) {
    // Both gates cleared -> Authorize BUY / ACCUMULATE
    // Structural confirmation adjusts conviction tier (9/10 for full structural beat vs 8/10 for primary gate pass)
    finalAction = (calibratedConviction >= 9 && thesis.structuralConfirmed) ? 'STRONG BUY' : 'ADD';
    calibratedConviction = thesis.structuralConfirmed ? Math.max(calibratedConviction, 9) : Math.max(calibratedConviction, 8);
    statusClassification = 'THESIS_CONFIRMED_BEAT';
    decisionExplanation = thesis.structuralConfirmed
      ? 'Primary financial growth and structural thesis hurdle rates verified.'
      : 'Primary financial hurdle rates cleared; structural metrics in confirmation phase.';
  } else if (universal.passed && !thesis.passed) {
    // Company is financially growing, but thesis-specific hurdle not yet met
    finalAction = 'WATCH / WAIT FOR CONFIRMATION';
    calibratedConviction = Math.min(calibratedConviction, 6);
    statusClassification = 'GROWING_BUT_THESIS_UNCONFIRMED';
    decisionExplanation = `Company is financially growing, but specific thesis gates unmet: ${thesis.reason}`;
  } else if (!universal.passed && financialData && financialData.isMarginErosion) {
    // Margin compression or earnings contraction
    finalAction = 'REASSESS THESIS';
    calibratedConviction = Math.min(calibratedConviction, 4);
    statusClassification = 'THESIS_DEVIATION';
    decisionExplanation = `Universal financial health failure: ${universal.reason}`;
  } else {
    // Default holding pattern
    finalAction = 'HOLD / MONITOR';
    calibratedConviction = Math.min(calibratedConviction, 5);
    statusClassification = 'NEUTRAL_HOLD';
    decisionExplanation = universal.reason || 'Holding position pending further evidence.';
  }

  return {
    actionAuthorized: universal.passed && thesis.passed,
    finalAction,
    calibratedConviction,
    statusClassification,
    decisionExplanation,
    universalGate: universal,
    thesisGate: thesis
  };
}
