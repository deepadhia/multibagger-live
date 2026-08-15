-- Phase 3: Deterministic Multi-Quarter Thesis Engine Schema
CREATE TABLE IF NOT EXISTS thesis_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id TEXT NOT NULL,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contract_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'DEPRECATED')),
  thesis_statement TEXT NOT NULL,
  supersedes_contract_id UUID REFERENCES thesis_contracts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(thesis_id, contract_version)
);

CREATE TABLE IF NOT EXISTS thesis_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_contract_id UUID NOT NULL REFERENCES thesis_contracts(id) ON DELETE CASCADE,
  assumption_code TEXT NOT NULL,
  assumption_text TEXT NOT NULL,
  indicator_type TEXT NOT NULL CHECK (indicator_type IN ('LEADING', 'LAGGING_CONFIRMATION', 'RISK_TRIGGER')),
  associated_metric TEXT,
  baseline_value TEXT NOT NULL,
  warning_threshold_expression TEXT,
  break_threshold_expression TEXT,
  source_rationale TEXT NOT NULL,
  rationale_claim_id TEXT NOT NULL REFERENCES claim_lineage(claim_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(thesis_contract_id, assumption_code)
);

CREATE TABLE IF NOT EXISTS thesis_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_contract_id UUID NOT NULL REFERENCES thesis_contracts(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  period TEXT NOT NULL,
  
  business_condition TEXT NOT NULL CHECK (business_condition IN ('IMPROVING', 'STABLE', 'DETERIORATING')),
  previous_thesis_state TEXT NOT NULL CHECK (previous_thesis_state IN ('STRENGTHENING', 'STABLE', 'WEAKENING', 'BROKEN', 'UNINITIALIZED')),
  current_thesis_state TEXT NOT NULL CHECK (current_thesis_state IN ('STRENGTHENING', 'STABLE', 'WEAKENING', 'BROKEN')),
  evidence_status TEXT NOT NULL CHECK (evidence_status IN ('CONFIRMED', 'MIXED', 'INSUFFICIENT', 'CONFLICTING')),
  review_status TEXT NOT NULL CHECK (review_status IN ('NORMAL', 'REVIEW_REQUIRED')),

  state_change_reason TEXT NOT NULL,
  consecutive_negative_quarters INT NOT NULL DEFAULT 0,
  consecutive_positive_quarters INT NOT NULL DEFAULT 0,
  is_temporary_headwind BOOLEAN NOT NULL DEFAULT FALSE,
  is_structural_deterioration BOOLEAN NOT NULL DEFAULT FALSE,
  thesis_break_triggered BOOLEAN NOT NULL DEFAULT FALSE,

  explanation_what_changed TEXT NOT NULL,
  explanation_assumption_affected TEXT NOT NULL,
  explanation_nature TEXT NOT NULL,
  explanation_invalidation_criteria TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(thesis_contract_id, ticker, period)
);

CREATE TABLE IF NOT EXISTS thesis_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_history_id UUID NOT NULL REFERENCES thesis_state_history(id) ON DELETE CASCADE,
  claim_id TEXT NOT NULL REFERENCES claim_lineage(claim_id) ON DELETE CASCADE,
  evidence_role TEXT NOT NULL CHECK (evidence_role IN ('SUPPORTING', 'CONTRADICTING', 'MANAGEMENT_CLAIM_TEST')),
  reconciliation_status TEXT NOT NULL CHECK (reconciliation_status IN ('SUPPORTED', 'PARTIALLY_SUPPORTED', 'UNSUPPORTED', 'CONFLICTING', 'NOT_TESTABLE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thesis_state_lookup ON thesis_state_history(ticker, period);
CREATE INDEX IF NOT EXISTS idx_thesis_evidence_lookup ON thesis_evidence_links(state_history_id);
