import * as cheerio from 'cheerio';

/**
 * Parses XBRL contexts to map internal IDs to date ranges/instants.
 * Returns an object: { [contextId]: { startDate, endDate, instant, isYearToDate, quarter, fy } }
 */
export function parseContexts(xmlContent) {
  const $ = cheerio.load(xmlContent, { xmlMode: true });
  const contexts = {};

  // Handle both <xbrli:context> and <context>
  const contextElements = $('*').filter((i, el) => el.name === 'context' || el.name.endsWith(':context'));

  contextElements.each((i, el) => {
    const id = $(el).attr('id');
    const startDate = $(el).find('*').filter((j, e) => e.name === 'startDate' || e.name.endsWith(':startDate')).text();
    const endDate = $(el).find('*').filter((j, e) => e.name === 'endDate' || e.name.endsWith(':endDate')).text();
    const instant = $(el).find('*').filter((j, e) => e.name === 'instant' || e.name.endsWith(':instant')).text();

    if (!id) return;

    contexts[id] = {
      startDate: startDate || null,
      endDate: endDate || null,
      instant: instant || null,
      type: instant ? 'instant' : 'duration'
    };

    const dateToUse = endDate || instant;
    if (dateToUse) {
      const d = new Date(dateToUse);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();

      let q, fy;
      if (month >= 4 && month <= 6) { q = 1; fy = year + 1; }
      else if (month >= 7 && month <= 9) { q = 2; fy = year + 1; }
      else if (month >= 10 && month <= 12) { q = 3; fy = year + 1; }
      else { q = 4; fy = year; }

      contexts[id].quarter = `FY${String(fy).slice(-2)}-Q${q}`;
      contexts[id].fy = fy;
      
      // Calculate duration in days
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        contexts[id].days = diffDays;
        
        // India FY logic: if starts April 1st and duration > 100 days, it's YTD
        if (startDate.includes('-04-01') && diffDays > 100) {
           contexts[id].isYTD = true;
        }
      }
    }
  });

  return contexts;
}
