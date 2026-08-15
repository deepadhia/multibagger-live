-- Migration: 20260815130000_phase4e4_thesis_trajectory.sql
-- Description: Phase 4E.4 Multi-Horizon Thesis Trajectory & Market Alignment Engine Schema

CREATE TABLE IF NOT EXISTS phase4e4_thesis_survival_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL REFERENCES phase4e0_event_records(event_id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    horizon TEXT NOT NULL CHECK (horizon IN ('6M', '12M', '24M')),
    horizon_status TEXT NOT NULL DEFAULT 'COMPUTABLE' CHECK (horizon_status IN ('COMPUTABLE', 'NOT_YET_MATURED', 'INSUFFICIENT_EVIDENCE')),
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- T0 Reference Snapshot
    t0_hypothesis_label TEXT NOT NULL,
    t0_pe NUMERIC,
    t0_thesis_growth NUMERIC,
    t0_market_implied_growth NUMERIC,
    thesis_market_gap_t0 NUMERIC,

    -- Horizon Quantitative State
    thesis_growth_t NUMERIC,
    market_implied_growth_t NUMERIC,
    thesis_market_gap_t NUMERIC,
    gap_change NUMERIC,

    -- Valuation & Relative Performance Context
    pe_t NUMERIC,
    multiple_change_pct NUMERIC,
    stock_return_pct NUMERIC,
    sector_return_pct NUMERIC,
    sector_relative_alpha_pct NUMERIC,
    nifty_relative_alpha_pct NUMERIC,

    -- The Two Independent Axes
    axis1_thesis_trajectory TEXT NOT NULL CHECK (axis1_thesis_trajectory IN ('THESIS_STRENGTHENING', 'THESIS_STABLE', 'THESIS_WEAKENING', 'THESIS_BROKEN', 'NOT_YET_MATURED')),
    axis2_market_relationship TEXT NOT NULL CHECK (axis2_market_relationship IN ('MARKET_DISCOUNTING', 'MARKET_LAGGING', 'MARKET_CONVERGING', 'MARKET_OVERSHOOTING', 'MARKET_NEUTRAL', 'NOT_COMPUTABLE')),
    dislocation_trajectory TEXT NOT NULL CHECK (dislocation_trajectory IN ('WIDENING', 'STABLE', 'NARROWING', 'REVERSED', 'NO_CONCLUSION')),

    -- Evidence Ledger
    economic_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    conviction_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    interpretation TEXT,

    -- Immutable Lock & Timestamp Audit
    t_horizon_state_locked BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (event_id, horizon)
);

CREATE INDEX IF NOT EXISTS idx_phase4e4_ticker_horizon ON phase4e4_thesis_survival_records(ticker, horizon);
CREATE INDEX IF NOT EXISTS idx_phase4e4_dislocation_trajectory ON phase4e4_thesis_survival_records(dislocation_trajectory);
