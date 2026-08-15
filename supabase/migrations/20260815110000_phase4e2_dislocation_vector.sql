-- Migration: Phase 4E.2 Point-in-Time Investment State Ledger
-- Description: Stores 3 distinct layers (business_state, thesis_state, market_state), expectation gaps, evidence quality, and optional event reaction without interpretation or composite scores.

CREATE TABLE IF NOT EXISTS phase4e2_dislocation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL REFERENCES phase4e0_event_records(event_id),
  ticker TEXT NOT NULL,
  event_available_at TIMESTAMP WITH TIME ZONE NOT NULL,
  decision_cutoff_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Layer A: Current Business State (What is happening NOW)
  revenue_growth_actual NUMERIC,
  ebitda_growth_actual NUMERIC,
  margin_pct_actual NUMERIC,
  margin_trend TEXT,
  order_book_growth NUMERIC,
  guidance_action TEXT,

  -- Layer B: Our Forward Thesis State (What we believe happens NEXT)
  thesis_state JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Layer C: Market State (What the price implies NEXT & Valuation)
  market_implied_revenue_growth NUMERIC,
  market_implied_earnings_growth NUMERIC,
  market_implied_margin_pct NUMERIC,
  pe_ratio NUMERIC,
  ev_ebitda NUMERIC,
  price_to_sales NUMERIC,

  -- Expectation Gaps Vector (Measurements only!)
  revenue_growth_gap_market_vs_business NUMERIC,
  revenue_growth_gap_market_vs_thesis NUMERIC,
  margin_gap_bps_market_vs_thesis NUMERIC,
  order_book_gap NUMERIC,

  -- Evidence Quality & Point-in-Time Provenance
  evidence_completeness TEXT NOT NULL, -- 'HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT'
  point_in_time_valid BOOLEAN NOT NULL DEFAULT TRUE,
  attribution_quality TEXT NOT NULL DEFAULT 'CLEAN',

  -- Optional Secondary Event Reaction
  return_1d_abs NUMERIC,
  return_3d_abs NUMERIC,
  return_5d_abs NUMERIC,
  volume_shock_ratio NUMERIC,

  -- Orthogonal Fundamental Trajectory
  fundamental_trajectory TEXT NOT NULL, -- 'POSITIVE', 'STABLE', 'DETERIORATING', 'SEVERELY_DETERIORATING', 'NOT_COMPUTABLE'

  data_status TEXT NOT NULL DEFAULT 'COMPUTABLE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase4e2_ticker ON phase4e2_dislocation_records (ticker, decision_cutoff_at);
