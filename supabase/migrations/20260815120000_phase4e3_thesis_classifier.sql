-- Migration: Phase 4E.3 Thesis & Conviction Classifier Ledger
-- Description: Stores locked T0 economic case, mispricing direction, and conviction level with full cryptographic provenance.

CREATE TABLE IF NOT EXISTS phase4e3_classifier_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL REFERENCES phase4e0_event_records(event_id),
  ticker TEXT NOT NULL,
  event_available_at TIMESTAMP WITH TIME ZONE NOT NULL,
  decision_cutoff_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Provenance Metadata
  data_provenance_type TEXT NOT NULL DEFAULT 'PRODUCTION_PROVENANCE_CHAIN',
  thesis_source_document TEXT,
  thesis_version TEXT,
  thesis_hash TEXT,
  thesis_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  valuation_source TEXT,

  -- Thesis Assumption Integrity Ledger
  historical_thesis_verified BOOLEAN NOT NULL DEFAULT TRUE,
  assumption_count INT NOT NULL,
  supported_count INT NOT NULL,
  weak_count INT NOT NULL,
  contradicted_count INT NOT NULL,
  assumption_test_ledger JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Economic Divergence & Asymmetry Evaluation
  our_thesis_vs_market_gap NUMERIC,
  business_evidence_support TEXT NOT NULL,
  valuation_support TEXT NOT NULL,
  downside_asymmetry TEXT NOT NULL,

  -- Predicates & Classification Outputs
  predicate_historical_thesis_verified BOOLEAN NOT NULL,
  predicate_critical_assumptions_supported BOOLEAN NOT NULL,
  predicate_business_evidence_sufficient BOOLEAN NOT NULL,
  predicate_thesis_materially_above_market BOOLEAN NOT NULL,
  predicate_downside_acceptable BOOLEAN NOT NULL,

  economic_case TEXT NOT NULL,       -- 'THESIS_SUPPORTED_MARKET_DISLOCATION', 'THESIS_SUPPORTED_FAIRLY_PRICED', 'THESIS_SUPPORTED_OVERPRICED', 'THESIS_UNSUPPORTED', 'INSUFFICIENT_EVIDENCE'
  mispricing_direction TEXT NOT NULL, -- 'UNDERPRICED', 'FAIRLY_PRICED', 'OVERPRICED', 'NO_CONCLUSION'
  mispricing_context TEXT NOT NULL,   -- 'STRUCTURAL_UNDERPRICING', 'STRUCTURAL_OVERPRICING', 'EVENT_OVERREACTION', 'EXPECTATION_RESET', 'FAIRLY_PRICED', 'NO_CONCLUSION'
  conviction_level TEXT NOT NULL,     -- 'HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT_EVIDENCE'

  t0_state_locked BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase4e3_ticker ON phase4e3_classifier_records (ticker, decision_cutoff_at);
