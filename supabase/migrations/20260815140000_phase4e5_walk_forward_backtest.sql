-- Migration: 20260815140000_phase4e5_walk_forward_backtest.sql
-- Phase 4E.5: Chronological Blind Walk-Forward Out-of-Sample Portfolio Audit Schema

CREATE TABLE IF NOT EXISTS phase4e5_t0_frozen_ledgers (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(30) NOT NULL,
    event_id VARCHAR(100) NOT NULL UNIQUE,
    t0_date TIMESTAMPTZ NOT NULL,
    decision_cutoff_at TIMESTAMPTZ NOT NULL,
    
    -- T0 Evidence & Conviction State
    t0_conviction_level VARCHAR(40) NOT NULL,
    t0_economic_case VARCHAR(60) NOT NULL,
    t0_hypothesis_label VARCHAR(60) NOT NULL,
    t0_evidence_completeness VARCHAR(40) NOT NULL,
    
    -- T0 Quantitative Baselines
    t0_thesis_growth NUMERIC(8, 4) NOT NULL,
    t0_market_implied_growth NUMERIC(8, 4) NOT NULL,
    t0_thesis_market_gap NUMERIC(8, 4) NOT NULL,
    t0_pe NUMERIC(8, 2) NOT NULL,
    
    -- Underlying Evidence Vectors (Immutable Audit Trail)
    thesis_integrity_summary JSONB NOT NULL,
    critical_assumptions_ledger JSONB NOT NULL,
    unresolved_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
    valuation_evidence_vector JSONB NOT NULL,
    
    t0_frozen_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phase4e5_walk_forward_evaluations (
    id SERIAL PRIMARY KEY,
    t0_ledger_id INTEGER REFERENCES phase4e5_t0_frozen_ledgers(id) ON DELETE CASCADE,
    ticker VARCHAR(30) NOT NULL,
    event_id VARCHAR(100) NOT NULL,
    horizon VARCHAR(10) NOT NULL, -- 6M, 12M, 24M
    horizon_status VARCHAR(40) NOT NULL, -- COMPUTABLE, NOT_YET_MATURED, NOT_COMPUTABLE
    evaluated_at TIMESTAMPTZ NOT NULL,
    target_horizon_date TIMESTAMPTZ NOT NULL,
    
    -- Dimension A: Thesis Outcome
    axis1_thesis_trajectory VARCHAR(50) NOT NULL,
    revenue_growth_realized NUMERIC(8, 4),
    ebitda_growth_realized NUMERIC(8, 4),
    critical_assumptions_survived INTEGER,
    critical_assumptions_total INTEGER,
    guidance_outcome VARCHAR(50),
    
    -- Dimension B: Market Recognition
    axis2_market_relationship VARCHAR(50) NOT NULL,
    dislocation_trajectory VARCHAR(50) NOT NULL,
    thesis_growth_t NUMERIC(8, 4),
    market_implied_growth_t NUMERIC(8, 4),
    thesis_market_gap_t NUMERIC(8, 4),
    gap_change NUMERIC(8, 4),
    
    -- Dimension C: Relative Investment Outcomes & Benchmarks
    stock_return_pct NUMERIC(8, 4),
    sector_return_pct NUMERIC(8, 4),
    sector_relative_alpha NUMERIC(8, 4),
    peer_basket_return_pct NUMERIC(8, 4),
    peer_relative_alpha NUMERIC(8, 4),
    smallcap_index_return_pct NUMERIC(8, 4),
    smallcap_relative_alpha NUMERIC(8, 4),
    nifty_index_return_pct NUMERIC(8, 4),
    nifty_relative_alpha NUMERIC(8, 4),
    pe_t NUMERIC(8, 2),
    multiple_change_pct NUMERIC(8, 4),
    
    -- Conviction Evidence Direction
    evidence_direction VARCHAR(50) NOT NULL,
    divergence_explanation_ledger JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_phase4e5_evaluation UNIQUE(ticker, event_id, horizon)
);

CREATE INDEX IF NOT EXISTS idx_phase4e5_t0_ticker ON phase4e5_t0_frozen_ledgers(ticker);
CREATE INDEX IF NOT EXISTS idx_phase4e5_eval_ticker_horizon ON phase4e5_walk_forward_evaluations(ticker, horizon);
