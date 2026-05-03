import * as cheerio from 'cheerio';
import { ALIAS_MAP } from './aliasDictionary.js';

/**
 * Extracts values from XML for the mapped tags.
 * contexts: output from contextParser
 * Returns: { [quarter]: { [metric]: value } }
 */
export function extractMetrics(xmlContent, contexts) {
  const $ = cheerio.load(xmlContent, { xmlMode: true });
  const results = {};

  // Initialize results for each unique quarter found in contexts
  const quarters = [...new Set(Object.values(contexts).map(c => c.quarter).filter(Boolean))];
  quarters.forEach(q => { results[q] = {}; });

  let cfoPeriodType = 'quarterly';

  for (const [metric, tags] of Object.entries(ALIAS_MAP)) {
    tags.forEach(tag => {
      // Find all elements where the local name matches our tag
      const elements = $('*').filter((i, el) => {
        const name = el.name || '';
        return name === tag || name.endsWith(':' + tag);
      });
      
      elements.each((i, el) => {
        const contextRef = $(el).attr('contextRef');
        const val = parseFloat($(el).text());
        if (!contextRef || isNaN(val)) return;

        const ctx = contexts[contextRef];
        if (!ctx || !ctx.quarter) return;

        // STRATEGIC PRIORITY:
        // P&L metrics (revenue, pat, etc.) -> Prefer discrete quarters (isYTD = false)
        // Cash Flow (cfo, capex) -> Often only YTD is available in interim filings
        
        const isCashFlow = ['cfo', 'capex'].includes(metric);
        
        if (results[ctx.quarter][metric] === undefined) {
          if (!isCashFlow && ctx.isYTD) return; // Skip YTD for P&L if we want quarterly
          
          results[ctx.quarter][metric] = val;
          if (isCashFlow && ctx.isYTD) cfoPeriodType = 'ytd';
        } else if (metric === 'borrowings') {
          results[ctx.quarter][metric] += val;
        }
      });
    });
  }

  return { metrics: results, cfo_period_type: cfoPeriodType };
}
