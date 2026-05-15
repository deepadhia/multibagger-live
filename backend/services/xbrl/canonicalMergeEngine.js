/**
 * Strategic Reconciler for NSE API (V2) vs XML Parser (V3).
 * Transforms into a "Financial Data Validity Engine".
 */
export function mergeXbrlData(apiData, parsedData, history = []) {
  const merged = { ...apiData };
  const reconciliationLogs = [];
  const SANITY_BAND_PCT = 3.0;
  const MAX_FALLBACK_QUARTERS = 2;
  
  // Track metadata for every field
  const metric_metadata = {};
  
  merged.xml_confidence_score = parsedData.confidence || 0;
  merged.source_preferred = 'api';
  merged.cfo_period_type = parsedData.cfo_period_type || 'quarterly';

  const xmlMetrics = Object.values(parsedData.metrics || {})[0] || {};
  const currentQuarter = Object.keys(parsedData.metrics || {})[0];

  // 1. Scale Recognition (Normalize XML to Absolute INR)
  const getScale = () => {
    const xmlRev = xmlMetrics.revenue;
    const apiRev = apiData.revenue_from_ops; // apiData is ALREADY in Absolute INR
    
    let segmentTotal = 0;
    if (parsedData.segments && parsedData.segments.length > 0) {
      segmentTotal = parsedData.segments
        .filter(s => s.metric === 'revenue' && s.value != null)
        .reduce((sum, s) => sum + s.value, 0);
    }
    
    // Segment-based Anchor (The "Bypass" Fix)
    // If core revenue is missing, but we have segments, sum them up to deduce scale
    const anchorRev = xmlRev != null ? xmlRev : (segmentTotal > 0 ? segmentTotal : null);
    
    // If we have API data, we can deduce the exact multiplier
    if (anchorRev != null && apiRev != null && anchorRev !== 0) {
      const ratio = apiRev / anchorRev;
      const orderOfMagnitude = Math.round(Math.log10(ratio));
      
      // Common scales:
      // 10^7 = Crores
      // 10^6 = Millions
      // 10^5 = Lakhs
      // 10^3 = Thousands
      // 10^0 = Absolute
      
      if (orderOfMagnitude === 7) return 10000000;
      if (orderOfMagnitude === 6) return 1000000;
      if (orderOfMagnitude === 5) return 100000;
      if (orderOfMagnitude === 3) return 1000;
      if (orderOfMagnitude === 0) return 1.0;
      
      // If it's somewhat in between, snap to the closest expected scale
      if (orderOfMagnitude >= 4 && orderOfMagnitude <= 5) return 100000;
      if (orderOfMagnitude >= 6 && orderOfMagnitude <= 7) return 10000000;
    }
    
    // Fallback heuristic if API data is missing (e.g. latest quarter)
    if (anchorRev != null) {
      const absRev = Math.abs(anchorRev);
      if (absRev > 1000000) return 1.0; // Likely Absolute INR (> 1 Crore absolute)
      if (absRev > 1000) return 100000; // Likely Lakhs
      if (absRev > 0) return 10000000; // Likely Crores
    }
    
    return 1.0;
  };

  const scale = getScale();
  // Apply scale to all incoming XML metrics
  Object.keys(xmlMetrics).forEach(k => {
    if (typeof xmlMetrics[k] === 'number') xmlMetrics[k] *= scale;
  });

  // Also scale segments if they exist
  if (parsedData.segments && parsedData.segments.length > 0) {
    parsedData.segments.forEach(s => {
      if (typeof s.value === 'number') s.value *= scale;
    });
  }

  // Helper: Get metric from history
  const getFromHistory = (field) => {
    for (let i = 0; i < Math.min(history.length, 4); i++) {
      if (history[i][field] != null) {
        return {
          value: history[i][field],
          quarter: history[i].quarter,
          age: i + 1,
          metadata: history[i].metric_metadata?.[field] || {}
        };
      }
    }
    return null;
  };

  // 1. Core P&L Reconcile
  const coreFields = ['revenue_from_ops', 'pat', 'pbt', 'finance_cost'];
  const fieldMap = {
    revenue_from_ops: 'revenue',
    pat: 'pat',
    pbt: 'pbt',
    finance_cost: 'finance_cost'
  };

  coreFields.forEach(field => {
    const xmlKey = fieldMap[field];
    const xmlVal = xmlMetrics[xmlKey];
    const apiVal = apiData[field];
    
    let source = 'api';
    let confidence = 80;
    let age = 0;

    if (xmlVal != null) {
      if (apiVal != null) {
        const diff = Math.abs(apiVal - xmlVal);
        const variancePct = apiVal !== 0 ? (diff / apiVal) * 100 : 0;
        const isWithinSanityBand = variancePct < SANITY_BAND_PCT;
        const highXmlConfidence = merged.xml_confidence_score >= 90;

        if (isWithinSanityBand && highXmlConfidence) {
          merged[field] = xmlVal;
          source = 'xbrl';
          confidence = 95;
        } else {
          source = 'api';
          confidence = 85;
          if (variancePct >= 1.0) {
            reconciliationLogs.push({ field_name: field, api_val: apiVal, xml_val: xmlVal, variance_pct: variancePct, winner: 'api' });
          }
        }
      } else {
        merged[field] = xmlVal;
        source = 'xbrl';
        confidence = 90;
      }
    }

    metric_metadata[field] = {
      source,
      confidence,
      age_quarters: age,
      period_type: 'quarterly',
      is_aligned: true,
      derived_valid: true
    };
  });

  // 2. Enrichment: Balance Sheet & Cash Flow (with Fallback)
  const enrichmentFields = ['receivables', 'inventory', 'trade_payables', 'borrowings', 'cash_and_bank', 'cfo', 'capex', 'equity'];
  enrichmentFields.forEach(field => {
    let val = xmlMetrics[field];
    let source = 'xbrl';
    let age = 0;
    let ref_quarter = currentQuarter;
    let confidence = 95;
    let invalid_reason = null;

    if (val == null) {
      const hist = getFromHistory(field);
      if (hist && hist.age <= MAX_FALLBACK_QUARTERS) {
        val = hist.value;
        source = 'fallback';
        age = hist.age;
        ref_quarter = hist.quarter;
        confidence = Math.max(0, 90 - (age * 20));
      } else if (hist && hist.age > MAX_FALLBACK_QUARTERS) {
        invalid_reason = 'AGE_GT_2Q';
        confidence = 0;
      }
    }

    if (val != null) {
      merged[field] = val;
      if (merged.source_preferred === 'api') merged.source_preferred = 'merged';
    }

    metric_metadata[field] = {
      source: val != null ? source : 'missing',
      confidence: val != null ? confidence : 0,
      age_quarters: age,
      ref_quarter,
      period_type: field === 'cfo' || field === 'capex' ? merged.cfo_period_type : 'quarterly',
      is_aligned: true,
      derived_valid: val != null && !invalid_reason,
      invalid_reason
    };
  });

  // 3. Derived Metrics & Validity Guards
  const derive = (name, calcFn, dependencies) => {
    const depsMeta = dependencies.map(d => metric_metadata[d]);
    const allPresent = depsMeta.every(m => m && m.source !== 'missing');
    const allValid = depsMeta.every(m => m && m.derived_valid);
    const anyFallback = depsMeta.some(m => m && m.age_quarters > 0);
    const maxAge = Math.max(...depsMeta.map(m => m?.age_quarters || 0));
    
    let derived_valid = allPresent && allValid;
    let invalid_reason = null;
    let confidence = allPresent ? Math.min(...depsMeta.map(m => m.confidence)) : 0;

    // RULE: Period Mismatch (Dependency awareness)
    if (anyFallback) {
      // If we use current Revenue but fallback Receivables, it's a mismatch
      // In this system, any age > 0 mixed with age 0 is a mismatch
      const ages = depsMeta.map(m => m.age_quarters);
      const isMixed = new Set(ages).size > 1;
      if (isMixed) {
        derived_valid = false;
        invalid_reason = 'DEPENDENCY_MISMATCH';
        confidence = Math.min(confidence, 30);
      }
    }

    // RULE: CFO YTD Mid-year Incomplete
    if (name === 'cfo_pat_ratio') {
      const cfoMeta = metric_metadata['cfo'];
      if (cfoMeta?.period_type === 'YTD' && !currentQuarter.includes('Q4')) {
        derived_valid = false;
        invalid_reason = 'YTD_INCOMPLETE';
        confidence = 0;
      }
    }

    // Hard Nullification for > 2Q
    if (maxAge > MAX_FALLBACK_QUARTERS) {
      derived_valid = false;
      invalid_reason = 'AGE_GT_2Q';
      confidence = 0;
    }

    const value = derived_valid ? calcFn() : null;
    merged[name] = value;
    metric_metadata[name] = {
      source: 'derived',
      confidence,
      age_quarters: maxAge,
      derived_valid,
      invalid_reason
    };
  };

  const qRev = merged.revenue_from_ops || 0;
  derive('receivable_days', () => (merged.receivables / qRev) * 90, ['receivables', 'revenue_from_ops']);
  derive('inventory_days', () => (merged.inventory / qRev) * 90, ['inventory', 'revenue_from_ops']);
  derive('payable_days', () => (merged.trade_payables / qRev) * 90, ['trade_payables', 'revenue_from_ops']);
  derive('working_capital_days', () => ((merged.receivables + merged.inventory - merged.trade_payables) / qRev) * 90, ['receivables', 'inventory', 'trade_payables', 'revenue_from_ops']);
  derive('net_working_capital', () => (merged.receivables + merged.inventory - merged.trade_payables), ['receivables', 'inventory', 'trade_payables']);
  derive('net_cash', () => (merged.cash_and_bank || 0) - (merged.borrowings || 0), ['cash_and_bank', 'borrowings']);
  derive('cfo_pat_ratio', () => merged.cfo / merged.pat, ['cfo', 'pat']);

  // 4. Conditional Reliability Score
  // Weights: Revenue/PAT (50%), BS (30%), CF (20%)
  const calculateReliability = () => {
    let coreWeight = 0.5;
    let bsWeight = 0.3;
    let cfWeight = 0.2;

    const hasBs = ['receivables', 'inventory', 'borrowings'].some(f => metric_metadata[f].source !== 'missing');
    const hasCf = metric_metadata['cfo'].source !== 'missing';

    // Redistribute weight if optional sections are missing
    if (!hasBs && !hasCf) {
      coreWeight = 1.0; bsWeight = 0; cfWeight = 0;
    } else if (!hasBs) {
      coreWeight += bsWeight; bsWeight = 0;
    } else if (!hasCf) {
      coreWeight += cfWeight; cfWeight = 0;
    }

    const coreScore = (metric_metadata['revenue_from_ops'].confidence + metric_metadata['pat'].confidence) / 2;
    const bsScore = (metric_metadata['receivables'].confidence + metric_metadata['inventory'].confidence + metric_metadata['borrowings'].confidence) / 3;
    const cfScore = metric_metadata['cfo'].confidence;

    return Math.round((coreScore * coreWeight) + (bsScore * bsWeight) + (cfScore * cfWeight));
  };

  merged.metric_metadata = metric_metadata;
  merged.reliability_score = calculateReliability();
  merged.segments = parsedData.segments || [];

  return { merged, reconciliationLogs };
}
