import * as cheerio from 'cheerio';
import { ALIAS_MAP } from './aliasDictionary.js';

export function extractMetrics(xmlContent, contexts) {
  const $ = cheerio.load(xmlContent, { xmlMode: true });
  const results = {};
  
  // To track context precedence: consolidated > standalone
  const metricsSource = {}; 

  const quarters = [...new Set(Object.values(contexts).map(c => c.quarter).filter(Boolean))];
  quarters.forEach(q => { 
    results[q] = {}; 
    metricsSource[q] = {};
  });

  let cfoPeriodType = 'quarterly';

  for (const [metric, tags] of Object.entries(ALIAS_MAP)) {
    tags.forEach(tag => {
      const elements = $('*').filter((i, el) => {
        const name = el.name || '';
        return name === tag || name.endsWith(':' + tag);
      });
      
      elements.each((i, el) => {
        const contextRef = $(el).attr('contextRef');
        const rawVal = parseFloat($(el).text());
        if (!contextRef || isNaN(rawVal)) return;

        const ctx = contexts[contextRef];
        if (!ctx || !ctx.quarter) return;
        
        // Skip true segments/subsidiaries
        if (ctx.isSegment) return;

        const isCashFlow = ['cfo', 'capex'].includes(metric);
        if (!isCashFlow && ctx.isYTD) return; // Skip YTD for P&L
        
        const val = rawVal;
        const currentSource = metricsSource[ctx.quarter][metric];
        
        // Priority: Consolidated > Standalone
        const isBetterContext = !currentSource || (ctx.isConsolidated && currentSource === 'standalone');

        if (isBetterContext) {
          results[ctx.quarter][metric] = val;
          metricsSource[ctx.quarter][metric] = ctx.isConsolidated ? 'consolidated' : 'standalone';
          
          if (isCashFlow && ctx.isYTD) cfoPeriodType = 'ytd';
        } else if (metric === 'borrowings' && currentSource === (ctx.isConsolidated ? 'consolidated' : 'standalone')) {
           // Sum borrowings only if they are from the same context type
          results[ctx.quarter][metric] = Math.round((results[ctx.quarter][metric] + val) * 100) / 100;
        }
      });
    });
  }

  const quarterDates = {};
  quarters.forEach(q => {
    const ctx = Object.values(contexts).find(c => c.quarter === q && !c.isYTD);
    if (ctx) quarterDates[q] = ctx.endDate || ctx.instant;
  });

  return { metrics: results, cfo_period_type: cfoPeriodType, quarterDates };
}
