-- Migration: Phase 4E.1 Fundamental Reaction & Evidence Mapping Ledger
-- Description: Stores mapped fundamental changes, financial actuals, guidance updates, and deterministic fundamental damage scores.

CREATE TABLE IF NOT EXISTS phase4e1_fundamental_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL REFERENCES phase4e0_event_records(event_id),
  ticker TEXT NOT NULL,
  event_available_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Fundamental Change Measurements
  revenue_yoy_pct NUMERIC,
  ebitda_yoy_pct NUMERIC,
  margin_change_bps NUMERIC,
  order_book_change_pct NUMERIC,
  guidance_action TEXT, -- 'REITERATED', 'UPGRADED', 'DOWNGRADED', 'WITHDRAWN', 'NO_GUIDANCE'

  -- Deterministic Fundamental Damage Classification
  fundamental_damage_score TEXT NOT NULL, -- 'LOW', 'MODERATE', 'HIGH', 'NOT_COMPUTABLE'
  damage_reason TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase4e1_ticker ON phase4e1_fundamental_records (ticker, event_available_at);
