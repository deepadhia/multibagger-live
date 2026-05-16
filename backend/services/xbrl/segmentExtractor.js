import * as cheerio from 'cheerio';

/**
 * Extracts business segment data from XBRL.
 */
export function extractSegments(xmlContent, contexts) {
  const $ = cheerio.load(xmlContent, { xmlMode: true });
  const segments = [];

  // 1. Identify segment members from contexts
  const segmentContexts = {}; // { contextId: segmentName }

  $('context, xbrli\\:context').each((i, el) => {
    const id = $(el).attr('id');
    const member = $(el).find('explicitMember, xbrldi\\:explicitMember');
    
    if (member.length > 0) {
      // Dimension often includes "Segment" or "BusinessSegment"
      const dimension = member.attr('dimension') || '';
      if (dimension.toLowerCase().includes('segment')) {
        const segmentName = member.text().split(':').pop(); // "TowerMember" -> "TowerMember"
        segmentContexts[id] = segmentName;
      }
    }
  });

  // 2. Extract values for these contexts
  const tags = ['RevenueFromOperations', 'SegmentRevenue', 'ProfitBeforeTaxAndFinanceCostsFromSegments', 'SegmentResults'];
  
  for (const tag of tags) {
    const segmentElements = $('*').filter((i, el) => el.name === tag || el.name.endsWith(':' + tag));
  
    segmentElements.each((i, el) => {
      const contextRef = $(el).attr('contextRef');
      const segmentName = segmentContexts[contextRef];
      if (!segmentName) return;

      const val = parseFloat($(el).text());
      const ctx = contexts[contextRef];
      if (isNaN(val) || !ctx) return;

      segments.push({
        quarter: ctx.quarter,
        segment_name: segmentName,
        metric: tag.includes('Revenue') ? 'revenue' : 'profit',
        value: val,
        fy: ctx.fy
      });
    });
  }

  return segments;
}
