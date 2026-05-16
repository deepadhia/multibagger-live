/**
 * Standardized Financial Formatting Utility
 * Enforces Crore/Lakh formatting for Indian listed company financials.
 */

/**
 * Formats a raw number (usually in Rupees) into a Crore-based string.
 * Example: 1083230000 -> ₹108.32 Cr
 */
export function formatCr(val) {
  if (val === null || val === undefined || isNaN(val)) return "-";
  
  const num = Number(val);
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  
  // NSE values are usually raw Rupees or scaled by LevelOfRounding.
  // We assume raw Rupees for standardization unless stated otherwise.
  const cr = absNum / 10000000;
  
  let formatted = `₹${cr.toFixed(2)} Cr`;
  if (isNegative) formatted = `-${formatted}`;
  
  return formatted;
}

/**
 * Generic formatter that handles Lakhs for smaller metrics if needed,
 * but defaults to Cr for consistency.
 */
export function formatFinancial(val) {
  if (val === null || val === undefined || isNaN(val)) return "-";
  
  const num = Number(val);
  if (Math.abs(num) < 1000000) { // Less than 10 Lakhs
    return `₹${(num / 100000).toFixed(2)} L`;
  }
  return formatCr(num);
}

/**
 * Standardizes a metrics object for logging or AI prompts.
 */
export function standardizeMetrics(metrics) {
  const result = {};
  for (const [key, val] of Object.entries(metrics)) {
    // Skip non-numeric fields
    if (['quarter', 'period_end_date', 'source', 'confidence'].includes(key)) {
      result[key] = val;
      continue;
    }
    result[key] = formatFinancial(val);
  }
  return result;
}
