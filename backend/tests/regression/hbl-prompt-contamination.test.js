import { getVerifiedGroundTruth, validateNarrativeAgainstArithmetic } from '../../services/verified-data-layer.service.js';

describe('Regression Test: Prompt Contamination & Unverified Segment Suppression', () => {

  // ✅ TEST 1: Unverified Prompt-Leaked Numbers Must Be Hard-Blocked
  test('HBLENGINE Q1 FY27 output must NOT contain hallucinated Defence EBIT -72.4%', () => {
    const truth = getVerifiedGroundTruth('HBLENGINE');
    expect(truth.segmentRedFlags).toBeUndefined();

    const leakedNarrative = "Q1 FY27 results show 🟡 SEGMENT RED FLAG: Defence & Aviation EBIT collapsed -72.4% YoY (₹9.10 Cr vs ₹32.94 Cr). Net profit reached ₹109.14 Cr.";
    const cleaned = validateNarrativeAgainstArithmetic('HBLENGINE', leakedNarrative);

    expect(cleaned).not.toContain('9.10');
    expect(cleaned).not.toContain('32.94');
    expect(cleaned).toContain('109.14'); // Grounded number preserved
  });

  // ✅ TEST 2: Verified Numbers MUST Pass Through Intact (Positive Assertion)
  test('HBLENGINE Q1 FY27 verified figures must be present in output', () => {
    const truth = getVerifiedGroundTruth('HBLENGINE');
    expect(truth.revenue).toBe(658.59);
    expect(truth.patConsolidated).toBe(109.14);
    expect(truth.ebitdaMarginPct).toBe(25.40);
  });

  // ✅ TEST 3: Cross-Ticker Contamination Test (SKIPPER vs HBL Compound Pattern)
  test('SKIPPER output must NOT contain HBLENGINE figures or Defence segment text', () => {
    const skipperTruth = getVerifiedGroundTruth('SKIPPER');
    expect(skipperTruth.revenue).toBe(1309.83);
    expect(skipperTruth.patConsolidated).toBe(56.47);

    const skipperNarrative = "Skipper declared Q1 results with PAT ₹56.47 Cr.";
    const cleaned = validateNarrativeAgainstArithmetic('SKIPPER', skipperNarrative, 'Q1 FY27');

    expect(cleaned).not.toMatch(/Defence\s*&\s*Aviation.*9\.10/i);
    expect(cleaned).not.toMatch(/32\.94.*EBIT/i);
    expect(cleaned).not.toContain('Defence & Aviation');
  });

  // ✅ TEST 4: Ticker Universe Isolation Guard
  test('SKIPPER output narrative must contain zero references to other portfolio stock tickers', () => {
    const portfolioTickers = ['HBLENGINE', 'INOXINDIA', 'ANANTRAJ', 'SJS', 'LUMAXTECH'];
    const skipperNarrative = "Skipper declared Q1 results with PAT ₹56.47 Cr.";
    const cleaned = validateNarrativeAgainstArithmetic('SKIPPER', skipperNarrative, 'Q1 FY27');

    portfolioTickers.forEach(otherTicker => {
      expect(cleaned).not.toMatch(new RegExp(`\\b${otherTicker}\\b`, 'i'));
    });
  });

});
