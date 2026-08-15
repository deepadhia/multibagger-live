-- Migration: 20260815150000_phase4f_decision_journal.sql
-- Phase 4F: Decision Journal & 3-Stage Thesis Dislocation Lifecycle Schema

CREATE TABLE IF NOT EXISTS phase4f_dislocation_lifecycle_records (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(30) NOT NULL,
    current_lifecycle_stage VARCHAR(50) NOT NULL, -- STAGE1_PUNISHMENT, STAGE2_RECOVERY_EVIDENCE, STAGE3_CONFIRMATION
    lifecycle_status VARCHAR(60) NOT NULL,        -- PUNISHMENT_UNDER_OBSERVATION, RECOVERY_UNDER_OBSERVATION, RECOVERY_CONFIRMED, WAITING_FOR_MARKET_RECOGNITION, PUNISHMENT_JUSTIFIED_REASSESSMENT_REQUIRED, THESIS_RESTRUCTURED, FAILED_RECOVERY
    event_id VARCHAR(100) NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    
    -- Disruption Classification
    disruption_type VARCHAR(50),                  -- TYPE_A_TEMPORARY_DISRUPTION, TYPE_B_EARNINGS_RECOVERY_LAG, TYPE_C_STRUCTURAL_DETERIORATION
    
    -- Four-Pronged Reconsideration Gates
    business_thesis_intact BOOLEAN NOT NULL,
    market_punishment_reason_resolving BOOLEAN NOT NULL,
    management_milestones_delivered BOOLEAN NOT NULL,
    valuation_attractive BOOLEAN NOT NULL,
    capital_reconsideration_supported BOOLEAN NOT NULL,
    
    -- Decomposed Strategic vs Near-Term Earnings Thesis
    strategic_thesis_status VARCHAR(50) NOT NULL, -- SUPPORTED, INTACT, CONTESTED, BROKEN
    near_term_earnings_thesis_status VARCHAR(50) NOT NULL, -- SUPPORTED, WEAKENED, CONTRADICTED
    
    -- Action & Recommendation Decoupled from Mechanical Buy/Sell
    capital_action_recommendation VARCHAR(60) NOT NULL, -- EVIDENCE_SUPPORTS_RECONSIDERATION, STAGED_OBSERVATION_WITH_RESERVATIONS, REASSESS_EXECUTION_DO_NOT_ADD, HOLD_OBSERVATION, REDUCE_EXPOSURE_EVIDENCE, REVOCATION_EVIDENCE_CONFIRMED
    anti_averaging_down_rule_passed BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Granular Multi-Driver & Milestone Ledgers
    thesis_components JSONB NOT NULL DEFAULT '[]'::jsonb,
    management_milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
    remaining_unresolved_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_phase4f_ticker_event UNIQUE(ticker, event_id)
);

CREATE TABLE IF NOT EXISTS phase4f_market_concern_resolution_ledgers (
    id SERIAL PRIMARY KEY,
    lifecycle_record_id INTEGER REFERENCES phase4f_dislocation_lifecycle_records(id) ON DELETE CASCADE,
    ticker VARCHAR(30) NOT NULL,
    event_id VARCHAR(100) NOT NULL,
    concern_id VARCHAR(50) NOT NULL,
    concern_description TEXT NOT NULL,
    punishment_event_source VARCHAR(100) NOT NULL,
    
    -- Item-by-Item Resolution State
    resolution_state VARCHAR(40) NOT NULL, -- RESOLVED, IMPROVING, UNCHANGED, WORSENING, NEW_RISK_INTRODUCED
    evaluation_evidence TEXT NOT NULL,
    severity VARCHAR(30) NOT NULL,          -- HIGH, MEDIUM, LOW
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure additive columns exist if table was already created
ALTER TABLE phase4f_dislocation_lifecycle_records
  ADD COLUMN IF NOT EXISTS disruption_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS market_punishment_reason_resolving BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS management_milestones_delivered BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS valuation_attractive BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS thesis_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS management_milestones JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_phase4f_ticker_lifecycle ON phase4f_dislocation_lifecycle_records(ticker, current_lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_phase4f_concern_ticker ON phase4f_market_concern_resolution_ledgers(ticker, concern_id);
