/**
 * Strategic Reconciler for NSE API (V2) vs XML Parser (V3).
 * Rules (Refined):
 * 1. XML wins for enrichment (BS/CF) by default.
 * 2. XML overrides API for core P&L ONLY if variance is within sanity band (<3%) AND confidence >= 90.
 * 3. Log all significant mismatches for audit.
 */
export function mergeXbrlData(apiData, parsedData, options = {}) {
  const merged = { ...apiData };
  const reconciliationLogs = [];
  const SANITY_BAND_PCT = 3.0;
  
  // Initialize V3 metadata
  merged.xml_confidence_score = parsedData.confidence || 0;
  merged.source_preferred = 'api';
  merged.cfo_period_type = parsedData.cfo_period_type || 'quarterly';

  for (const [quarter, xmlMetrics] of Object.entries(parsedData.metrics || {})) {
    // 1. Core P&L Reconcile
    const coreMetrics = ['revenue_from_ops', 'pat', 'pbt', 'finance_cost'];
    const fieldMap = {
      revenue_from_ops: 'revenue',
      pat: 'pat',
      pbt: 'pbt',
      finance_cost: 'finance_cost'
    };

    coreMetrics.forEach(field => {
      const xmlKey = fieldMap[field];
      const xmlVal = xmlMetrics[xmlKey];
      const apiVal = apiData[field];

      if (xmlVal !== undefined && xmlVal !== null) {
        if (apiVal !== undefined && apiVal !== null) {
          const diff = Math.abs(apiVal - xmlVal);
          const variancePct = apiVal !== 0 ? (diff / apiVal) * 100 : 0;

          const isWithinSanityBand = variancePct < SANITY_BAND_PCT;
          const highConfidence = merged.xml_confidence_score >= 90;

          if (isWithinSanityBand && highConfidence) {
            merged[field] = xmlVal;
            merged.source_preferred = 'xml';
          } else if (variancePct >= 1.0) {
            // Log significant mismatch (>1%) even if we don't override
            reconciliationLogs.push({
              field_name: field,
              api_val: apiVal,
              xml_val: xmlVal,
              variance_pct: variancePct,
              winner_source: isWithinSanityBand && highConfidence ? 'xml' : 'api'
            });
          }
        } else {
          // API missing, use XML
          merged[field] = xmlVal;
          merged.source_preferred = 'xml';
        }
      }
    });

    // 2. Enrichment: Balance Sheet & Cash Flow
    const enrichmentFields = ['receivables', 'inventory', 'borrowings', 'cash_and_bank', 'cfo', 'capex', 'equity'];
    enrichmentFields.forEach(field => {
      if (xmlMetrics[field] !== undefined && xmlMetrics[field] !== null) {
        merged[field] = xmlMetrics[field];
        if (merged.source_preferred === 'api') merged.source_preferred = 'merged';
      }
    });

    // 3. Derived Signals
    const qRevenue = merged.revenue_from_ops || 0;
    
    // Receivable Days: (Receivables / Quarterly Revenue) * 90
    if (merged.receivables && qRevenue > 0) {
      merged.receivable_days = (merged.receivables / qRevenue) * 90;
    }

    // Inventory Days: (Inventory / Quarterly Revenue) * 90
    if (merged.inventory && qRevenue > 0) {
      merged.inventory_days = (merged.inventory / qRevenue) * 90;
    }

    // Net Cash: Cash & Bank - Borrowings
    if (merged.cash_and_bank !== undefined || merged.borrowings !== undefined) {
      merged.net_cash = (merged.cash_and_bank || 0) - (merged.borrowings || 0);
    }

    // CFO/PAT Ratio: CFO / PAT
    if (merged.cfo && merged.pat && merged.pat !== 0) {
      merged.cfo_pat_ratio = merged.cfo / merged.pat;
    }
  }

  return { merged, reconciliationLogs };
}
