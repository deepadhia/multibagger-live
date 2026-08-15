-- Migration: Phase 4 Management Execution Ledger Table
-- Adds additive ledger schema for deterministic commitment tracking and outcome matching.

CREATE TABLE IF NOT EXISTS management_execution_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticker TEXT NOT NULL,
    source_claim_id TEXT NOT NULL REFERENCES claim_lineage(claim_id) ON DELETE CASCADE,
    statement_text TEXT NOT NULL,
    commitment_type TEXT NOT NULL CHECK (
        commitment_type IN (
            'MEASURABLE_COMMITMENT',
            'MEASURABLE_GUIDANCE',
            'TIMELINE_COMMITMENT',
            'CAPACITY_CAPEX_COMMITMENT',
            'ORDER_EXECUTION_EXPECTATION'
        )
    ),
    target_metric TEXT NOT NULL,
    target_value NUMERIC,
    target_unit TEXT,
    target_timeline TEXT,
    evaluation_period TEXT NOT NULL,
    actual_observed_value NUMERIC,
    actual_source_claim_id TEXT REFERENCES claim_lineage(claim_id),
    variance_pct NUMERIC,
    execution_outcome TEXT NOT NULL CHECK (
        execution_outcome IN (
            'ACHIEVED',
            'PARTIALLY_ACHIEVED',
            'MISSED',
            'DELAYED',
            'IN_PROGRESS',
            'NOT_YET_TESTABLE'
        )
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_ticker_source_claim UNIQUE (ticker, source_claim_id)
);

CREATE INDEX IF NOT EXISTS idx_mgmt_ledger_ticker ON management_execution_ledger(ticker);
CREATE INDEX IF NOT EXISTS idx_mgmt_ledger_source_claim ON management_execution_ledger(source_claim_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_ledger_execution_outcome ON management_execution_ledger(execution_outcome);
