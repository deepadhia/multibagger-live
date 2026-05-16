import { parseContexts } from './contextParser.js';
import { extractMetrics } from './metricMapper.js';
import { extractSegments } from './segmentExtractor.js';

/**
 * Main parser function.
 * Transforms raw XBRL XML into a normalized financial object.
 */
export async function parseXbrlFile(xmlContent) {
  try {
    const contexts = parseContexts(xmlContent);
    const { metrics, cfo_period_type, quarterDates } = extractMetrics(xmlContent, contexts);
    const segments = extractSegments(xmlContent, contexts);

    return {
      success: true,
      data: {
        metrics,
        segments,
        cfo_period_type,
        quarterDates
      }
    };
  } catch (error) {
    console.error('XBRL Parsing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
