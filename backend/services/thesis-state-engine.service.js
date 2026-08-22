/**
 * Thesis State Engine v2.0
 * 
 * Strict Architectural Separation:
 * 1. Frozen Ranking Layer (v1.0): Protected, immutable score/trajectory/rank.
 * 2. Data Reliability Layer: Clean / Discrepancy / Critical validation.
 * 3. Thesis State Layer: Evidence-derived canonical 6-state classification.
 * 
 * Canonical 6-State Enum:
 *   1. INSUFFICIENT_EVIDENCE  (Reliability failure, unreplayable lineage, or unanchored evidence)
 *   2. THESIS_BROKEN          (Core thesis invalidated / hard break)
 *   3. THESIS_WEAKENING       (Material negative evidence + operational deterioration; OUTRANKS STABLE)
 *   4. THESIS_UNDER_EVALUATION(Ambiguous/mixed evidence or pending multi-quarter verification)
 *   5. THESIS_STRENGTHENING   (Positive driver confirmation + improving trajectory + 0 material contradiction)
 *   6. THESIS_STABLE          (Default baseline: operational drivers intact)
 * 
 * Invariants:
 *   - Canonical states only (NO composite string states like STABLE / UNDER_EVALUATION)
 *   - Monitoring flags and confidence levels are first-class structured fields
 *   - Working capital is classified as THESIS_RELEVANT (severity: WATCH), not generic noise
 *   - Grounding integrity: Unanchored/unprovenanced evidence fails closed to INSUFFICIENT_EVIDENCE
 *   - Zero mutation to frozen ranking fields or database snapshots
 *   - Bidirectional trajectory independence (Zero causal influence from trajectory bonus)
 */

export const THESIS_STATES = {
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  THESIS_BROKEN: 'THESIS_BROKEN',
  THESIS_WEAKENING: 'THESIS_WEAKENING',
  THESIS_UNDER_EVALUATION: 'THESIS_UNDER_EVALUATION',
  THESIS_STRENGTHENING: 'THESIS_STRENGTHENING',
  THESIS_STABLE: 'THESIS_STABLE'
};

export const THESIS_RELEVANCE = {
  MATERIAL: 'MATERIAL',
  THESIS_RELEVANT: 'THESIS_RELEVANT',
  NON_THESIS_RELEVANT: 'NON_THESIS_RELEVANT',
  LOW: 'LOW'
};

/**
 * Validates whether an evidence item meets mandatory provenance and schema standards.
 */
export function validateEvidenceItem(item) {
  if (!item || typeof item !== 'object') return false;
  // Must have a metric/claim identifier
  const hasMetric = typeof item.metric === 'string' && item.metric.trim().length > 0;
  const hasClaim = typeof item.claim === 'string' && item.claim.trim().length > 0;
  if (!hasMetric && !hasClaim) return false;

  // Must have an explicit thesisRelevance declaration
  if (!item.thesisRelevance || typeof item.thesisRelevance !== 'string') return false;
  const rel = item.thesisRelevance.toUpperCase();
  if (!Object.values(THESIS_RELEVANCE).includes(rel)) return false;

  return true;
}

/**
 * Deterministically classifies the thesis state for a stock given its verified evidence inputs.
 * Returns a strict, canonical 6-state ThesisAssessment object.
 * 
 * @param {Object} params
 * @param {string} params.ticker - Stock ticker symbol
 * @param {string} params.period - Fiscal period (e.g. 'Q1_FY27')
 * @param {string} [params.reliabilityStatus='HIGH'] - Reliability status ('HIGH', 'MODERATE', 'INSUFFICIENT', 'CRITICAL')
 * @param {boolean} [params.hasUnreplayableClaim=false] - Lineage replay failure flag
 * @param {boolean} [params.isCoreThesisInvalidated=false] - Core assumption invalidation flag
 * @param {Array<Object>} [params.contradictoryEvidence=[]] - Array of contradictory evidence objects
 * @param {Array<Object>} [params.monitoringEvidence=[]] - Array of monitoring/watch items
 * @param {string} [params.operationalDirection='FLAT'] - Operational direction ('UP', 'DOWN', 'FLAT', 'DOWN/SLOWING')
 * @param {boolean} [params.positiveDriverConfirmation=false] - Whether core driver expansion is confirmed
 * @param {boolean} [params.isMixedEvidence=false] - Whether single-quarter evidence is mixed/divergent
 * @param {boolean} [params.requiresMultiQuarterVerification=false] - Whether confirmation across subsequent quarters is needed
 * @param {number} [params.trajectoryBonus=0] - Trajectory bonus from Ranking v1.0 (Passed for audit; zero causal influence)
 * @returns {Object} ThesisAssessment: { state, confidence, materialContradictions, monitoringFlags, rationale, isTrajectoryIndependent }
 */
export function classifyThesisStateV2(params = {}) {
  const {
    ticker = 'UNKNOWN',
    period = 'Q1_FY27',
    reliabilityStatus = 'HIGH',
    hasUnreplayableClaim = false,
    isCoreThesisInvalidated = false,
    contradictoryEvidence = [],
    monitoringEvidence = [],
    operationalDirection = 'FLAT',
    positiveDriverConfirmation = false,
    isMixedEvidence = false,
    requiresMultiQuarterVerification = false,
    trajectoryBonus = 0
  } = params;

  // -------------------------------------------------------------------------
  // HIERARCHY LEVEL 1A: PROVENANCE INTEGRITY CHECK (Test 8)
  // All evidence items must be grounded with valid schema and relevance tags
  // -------------------------------------------------------------------------
  const allItems = [...contradictoryEvidence, ...monitoringEvidence];
  for (const item of allItems) {
    if (!validateEvidenceItem(item)) {
      return {
        state: THESIS_STATES.INSUFFICIENT_EVIDENCE,
        confidence: 'LOW',
        materialContradictions: [],
        monitoringFlags: [],
        rationale: `Evidence provenance validation failed for ticker ${ticker}: evidence item missing mandatory thesisRelevance or metric declaration.`,
        isTrajectoryIndependent: true
      };
    }
  }

  // -------------------------------------------------------------------------
  // HIERARCHY LEVEL 1B: RELIABILITY / LINEAGE CHECK (Test 7)
  // -------------------------------------------------------------------------
  if (
    reliabilityStatus === 'INSUFFICIENT' ||
    reliabilityStatus === 'CRITICAL' ||
    hasUnreplayableClaim === true
  ) {
    return {
      state: THESIS_STATES.INSUFFICIENT_EVIDENCE,
      confidence: 'LOW',
      materialContradictions: [],
      monitoringFlags: [],
      rationale: `Data reliability or evidence lineage insufficient for ticker ${ticker} in period ${period}. Evaluation blocked.`,
      isTrajectoryIndependent: true
    };
  }

  // Segregate evidence into material contradictions vs structured monitoring watch flags
  const materialContradictions = contradictoryEvidence.filter(e => {
    const rel = (e.thesisRelevance || '').toUpperCase();
    const sev = (e.severity || 'HIGH').toUpperCase();
    return rel === THESIS_RELEVANCE.MATERIAL && (sev === 'HIGH' || sev === 'MEDIUM');
  });

  const monitoringFlags = [
    ...monitoringEvidence,
    ...contradictoryEvidence.filter(e => {
      const rel = (e.thesisRelevance || '').toUpperCase();
      const sev = (e.severity || '').toUpperCase();
      return (rel === THESIS_RELEVANCE.THESIS_RELEVANT && sev === 'WATCH') ||
             rel === THESIS_RELEVANCE.NON_THESIS_RELEVANT;
    })
  ];

  // -------------------------------------------------------------------------
  // HIERARCHY LEVEL 2: THESIS BROKEN (Core Thesis Invalidation)
  // -------------------------------------------------------------------------
  if (isCoreThesisInvalidated) {
    return {
      state: THESIS_STATES.THESIS_BROKEN,
      confidence: 'HIGH',
      materialContradictions,
      monitoringFlags,
      rationale: `Core foundational thesis assumption invalidated for ${ticker}.`,
      isTrajectoryIndependent: true
    };
  }

  // -------------------------------------------------------------------------
  // HIERARCHY LEVEL 3: THESIS WEAKENING (Outranks STABLE on Material Contradiction)
  // -------------------------------------------------------------------------
  const opDir = operationalDirection.toUpperCase();
  const isOpDirectionDeteriorating = opDir.includes('DOWN') || opDir.includes('SLOWING') || opDir.includes('DETERIORATING');

  if (materialContradictions.length > 0 && isOpDirectionDeteriorating) {
    return {
      state: THESIS_STATES.THESIS_WEAKENING,
      confidence: 'HIGH',
      materialContradictions,
      monitoringFlags,
      rationale: `Material thesis-relevant contradictory evidence confirmed with downward operational trajectory (${materialContradictions.map(m => m.metric || 'kpi').join(', ')}).`,
      isTrajectoryIndependent: true
    };
  }

  // Standalone operational direction deterioration across core business drivers
  if (isOpDirectionDeteriorating && !positiveDriverConfirmation) {
    return {
      state: THESIS_STATES.THESIS_WEAKENING,
      confidence: 'HIGH',
      materialContradictions,
      monitoringFlags,
      rationale: `Operational direction is deteriorating (${operationalDirection}) across core business drivers beyond expected seasonal baseline.`,
      isTrajectoryIndependent: true
    };
  }

  // -------------------------------------------------------------------------
  // HIERARCHY LEVEL 4: THESIS UNDER EVALUATION (Mixed / Ambiguous Evidence)
  // -------------------------------------------------------------------------
  if (isMixedEvidence || requiresMultiQuarterVerification || materialContradictions.length > 0) {
    return {
      state: THESIS_STATES.THESIS_UNDER_EVALUATION,
      confidence: 'MODERATE',
      materialContradictions,
      monitoringFlags,
      rationale: `Evidence is mixed or requires multi-quarter confirmation. Operational milestone monitoring active.`,
      isTrajectoryIndependent: true
    };
  }

  // -------------------------------------------------------------------------
  // HIERARCHY LEVEL 5: THESIS STRENGTHENING (Positive Driver + Improving Trajectory)
  // -------------------------------------------------------------------------
  if (positiveDriverConfirmation && opDir.includes('UP') && materialContradictions.length === 0) {
    return {
      state: THESIS_STATES.THESIS_STRENGTHENING,
      confidence: 'HIGH',
      materialContradictions,
      monitoringFlags,
      rationale: `Core operational business drivers confirmed expanding with positive trajectory and zero material contradictions.`,
      isTrajectoryIndependent: true
    };
  }

  // -------------------------------------------------------------------------
  // HIERARCHY LEVEL 6: THESIS STABLE (Default Baseline)
  // -------------------------------------------------------------------------
  return {
    state: THESIS_STATES.THESIS_STABLE,
    confidence: monitoringFlags.length > 0 ? 'MODERATE' : 'HIGH',
    materialContradictions,
    monitoringFlags,
    rationale: `Core operational thesis remains intact within baseline bounds. Monitored watch items do not violate thesis fundamentals.`,
    isTrajectoryIndependent: true
  };
}

/**
 * Reconciles a computed thesis state against an existing database snapshot row.
 * Generates an audit review event without mutating the snapshot.
 * 
 * @param {Object} params
 * @param {string} params.ticker
 * @param {string} params.quarter
 * @param {string} params.snapshotStatus - Value from quarterly_snapshots.thesis_status
 * @param {string} params.computedState - Canonical ThesisState enum value
 * @returns {Object}
 */
export function reconcileSnapshotThesisState({ ticker, quarter, snapshotStatus, computedState }) {
  const normSnap = (snapshotStatus || '').toUpperCase().trim();
  const normComp = (computedState || '').toUpperCase().trim();

  // Check if semantics align
  const isAligned = 
    normSnap === normComp ||
    (normSnap.includes('WEAKENING') && normComp.includes('WEAKENING')) ||
    (normSnap.includes('STRENGTHENING') && normComp.includes('STRENGTHENING')) ||
    (normSnap.includes('STABLE') && normComp.includes('STABLE')) ||
    (normSnap.includes('BROKEN') && normComp.includes('BROKEN'));

  return {
    ticker,
    quarter,
    snapshotStatus: snapshotStatus || 'UNKNOWN',
    computedState,
    isDivergent: !isAligned,
    auditAction: !isAligned ? 'AUDIT_REVIEW_EVENT' : 'ALIGNED',
    // Strict Invariant: Zero DB mutation
    mutatedDatabase: false,
    timestamp: new Date().toISOString()
  };
}
