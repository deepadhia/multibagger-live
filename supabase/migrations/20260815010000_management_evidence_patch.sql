-- Phase 3 Patch: Management Evidence Completeness & Narrative Shift Schema
CREATE TABLE IF NOT EXISTS thesis_management_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  period TEXT NOT NULL,
  claim_id TEXT NOT NULL REFERENCES claim_lineage(claim_id) ON DELETE CASCADE,
  source_class TEXT NOT NULL CHECK (
    source_class IN (
      'CONCALL_TRANSCRIPT',
      'INVESTOR_PRESENTATION',
      'AGM_DISCLOSURE',
      'SEBI_FILING',
      'ORDER_WIN_ANNOUNCEMENT',
      'MANAGEMENT_GUIDANCE',
      'OUTSTANDING_COMMITMENT'
    )
  ),
  statement_text TEXT NOT NULL,
  topic_category TEXT NOT NULL DEFAULT 'GENERAL',
  reconciliation_status TEXT NOT NULL CHECK (
    reconciliation_status IN (
      'SUPPORTED',
      'PARTIALLY_SUPPORTED',
      'UNSUPPORTED',
      'CONFLICTING',
      'NOT_TESTABLE'
    )
  ),
  reconciliation_rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticker, period, claim_id)
);

CREATE TABLE IF NOT EXISTS management_narrative_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  current_period TEXT NOT NULL,
  previous_period TEXT NOT NULL,
  current_claim_id TEXT NOT NULL REFERENCES claim_lineage(claim_id) ON DELETE CASCADE,
  previous_claim_id TEXT REFERENCES claim_lineage(claim_id) ON DELETE SET NULL,
  shift_category TEXT NOT NULL CHECK (
    shift_category IN (
      'NEW_COMMITMENT',
      'GUIDANCE_INCREASE',
      'GUIDANCE_UNCHANGED',
      'GUIDANCE_REDUCED',
      'GUIDANCE_WITHDRAWN',
      'TIMELINE_PUSHED',
      'TIMELINE_ACCELERATED',
      'NEW_RISK_DISCLOSED',
      'RISK_REMOVED',
      'EXPLANATION_CHANGED',
      'PREVIOUS_CLAIM_REPEATED',
      'PREVIOUS_CLAIM_CONTRADICTED'
    )
  ),
  narrative_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mgmt_evidence_lookup ON thesis_management_evidence(ticker, period);
CREATE INDEX IF NOT EXISTS idx_mgmt_narrative_lookup ON management_narrative_shifts(ticker, current_period);
