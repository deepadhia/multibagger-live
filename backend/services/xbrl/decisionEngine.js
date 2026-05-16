/**
 * decisionEngine.js — Signal Trust Layer
 * 
 * Transforms validated metrics into weighted alpha signals.
 * Incorporates data provenance (age, source) into the decision score.
 */

export function calculateAlphaSignals(metrics, currentIdx) {
  const current = metrics[currentIdx];
  if (!current) return null;

  const meta = current.metric_metadata || {};
  const prev = metrics[currentIdx + 1]; 
  const yoyBase = metrics[currentIdx + 4]; 
  const reliability = parseFloat(current.reliability_score || 0) / 100;

  const getTrust = (field) => {
    const m = meta[field] || {};
    if (m.derived_valid === false || m.confidence === 0) return 0;
    let trust = 0.8;
    if (m.source === 'xbrl') trust = 1.0;
    if (m.source === 'fallback') {
      const age = m.age_quarters || 1;
      if (age === 1) trust = 0.6;
      else if (age === 2) trust = 0.3;
      else trust = 0;
    }
    const finalTrust = trust * reliability;
    return isNaN(finalTrust) ? 0 : finalTrust;
  };

  // --- 1. BASE MOMENTUM (Max 40 pts) ---
  const revGrowth = parseFloat(current.revenue_growth_yoy || 0);
  const patGrowth = parseFloat(current.pat_growth_yoy || 0);
  const currRev = parseFloat(current.revenue_from_ops || 0);
  const currEbitda = parseFloat(current.ebitda || 0);
  const currentMargin = currRev > 0 ? (currEbitda / currRev) : 0;
  const prevYearMargin = (yoyBase && yoyBase.revenue_from_ops > 0) ? (yoyBase.ebitda / yoyBase.revenue_from_ops) : 0;
  
  let momPoints = Math.min(Math.max((revGrowth + patGrowth) / 4, -20), 30); // Base 30 pts
  if (revGrowth > 0 && currentMargin > prevYearMargin + 0.01) momPoints += 10; // Margin Bonus
  if (revGrowth > 0 && currentMargin < prevYearMargin - 0.01) momPoints -= 10; // Margin Penalty
  
  // Acceleration Bonus (Capped)
  if (prev) {
    const prevGrowth = prev.revenue_growth_yoy || 0;
    if (revGrowth > prevGrowth + 5) momPoints += 5;
  }

  // --- 2. TREND CONSISTENCY (Max 20 pts) ---
  let consistencyPoints = 0;
  for (let i = 0; i < 4; i++) {
    const m = metrics[currentIdx + i];
    if (m && (m.revenue_growth_yoy > 5)) consistencyPoints += 4; // 4 pts per strong growth Q
  }
  if (consistencyPoints >= 12) consistencyPoints += 4; // Streak bonus

  // --- 3. RELATIVE STRENGTH (Max 10 pts) ---
  let relPoints = 0;
  let avg4QGrowth = 0;
  let validQs = 0;
  for (let i = 1; i <= 4; i++) {
    if (metrics[currentIdx + i]) {
      avg4QGrowth += (metrics[currentIdx + i].revenue_growth_yoy || 0);
      validQs++;
    }
  }
  if (validQs > 0) {
    avg4QGrowth /= validQs;
    if (revGrowth > avg4QGrowth + 5) relPoints = 10;
  }

  // --- 4. WORKING CAPITAL HEALTH (Max 15 pts) ---
  let wcPoints = 15;
  const getWCRatio = (m) => m && m.revenue_from_ops > 0 ? ((parseFloat(m.receivables || 0) + parseFloat(m.inventory || 0) - parseFloat(m.trade_payables || 0)) / m.revenue_from_ops) : null;
  const currentWC = getWCRatio(current);
  const prevWC = getWCRatio(prev);
  const prev2WC = getWCRatio(metrics[currentIdx + 2]);

  if (currentWC && prevWC && currentWC > prevWC + 0.02) wcPoints -= 7; // Deteriorating trend
  if (prevWC && prev2WC && prevWC > prev2WC + 0.02) wcPoints -= 8; // Sustained deterioration

  // --- 5. EARNINGS QUALITY (Max 15 pts) ---
  const cfoPat = parseFloat(current.cfo_pat_ratio || 0);
  let qualityPoints = Math.min(Math.max((cfoPat - 0.8) * 10, 0), 15);
  
  // CFO Guard: Artificial Inflaters
  if (prev) {
    const recRelease = current.receivables < prev.receivables * 0.8;
    const invRelease = current.inventory < prev.inventory * 0.8;
    const paySpike = current.trade_payables > prev.trade_payables * 1.3;
    if ((recRelease || invRelease || paySpike) && cfoPat > 1.5) {
      qualityPoints -= 10;
    }
  }

  // --- 6. GROWTH TYPE DETECTION (Context Only) ---
  let growthType = "Flat";
  if (revGrowth > 5) {
    if (currentMargin > prevYearMargin + 0.02) growthType = "Pricing Power";
    else if (Math.abs(currentMargin - prevYearMargin) < 0.02) growthType = "Volume Expansion";
    else growthType = "Cyclical / Low Quality";
  }

  const signals = [
    { name: 'Momentum', score: momPoints, trust: getTrust('revenue_from_ops'), weight: 1.0 },
    { name: 'Consistency', score: consistencyPoints, trust: getTrust('pat'), weight: 1.0 },
    { name: 'Relative Strength', score: relPoints, trust: getTrust('revenue_from_ops'), weight: 1.0 },
    { name: 'WC Health', score: wcPoints, trust: Math.min(getTrust('receivables'), getTrust('inventory'), getTrust('trade_payables')), weight: 1.0 },
    { name: 'Quality', score: qualityPoints, trust: getTrust('cfo'), weight: 1.0 }
  ];

  let signalStrengthScore = 0;
  let totalTrust = 0;
  signals.forEach(s => {
    signalStrengthScore += s.score * s.trust;
    totalTrust += s.trust;
  });

  return {
    signalStrengthScore: Math.round(Math.max(0, signalStrengthScore)),
    signalConfidence: Math.round((totalTrust / 5) * 100),
    growthType,
    signals: signals.map(s => ({
      ...s,
      adjustedScore: Math.round(s.score * s.trust)
    }))
  };
}
