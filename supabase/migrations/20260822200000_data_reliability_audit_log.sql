-- Migration: 20260822200000_data_reliability_audit_log.sql
-- Description: Create append-only data_reconciliation_audit_logs table with immutable triggers

CREATE TABLE IF NOT EXISTS data_reconciliation_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    run_id VARCHAR(50) NOT NULL,
    engine_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    log_level VARCHAR(10) NOT NULL CHECK (log_level IN ('LEVEL_A', 'LEVEL_B', 'LEVEL_C')),
    ticker VARCHAR(20) NOT NULL,
    period VARCHAR(20) NOT NULL,
    check_category VARCHAR(50) NOT NULL,
    source_table VARCHAR(50),
    source_record_id VARCHAR(50),
    source_document_id VARCHAR(100),
    action_taken VARCHAR(50) NOT NULL CHECK (action_taken IN ('DRY_RUN_DETECTED', 'AUTO_REPAIRED', 'REQUIRES_HUMAN_REVIEW', 'BLOCKED')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying by run_id, ticker, period, and log_level
CREATE INDEX IF NOT EXISTS idx_data_recon_audit_run ON data_reconciliation_audit_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_data_recon_audit_ticker_period ON data_reconciliation_audit_logs(ticker, period);
CREATE INDEX IF NOT EXISTS idx_data_recon_audit_level ON data_reconciliation_audit_logs(log_level);

-- Append-only trigger function blocking UPDATE, DELETE, and TRUNCATE
CREATE OR REPLACE FUNCTION trg_block_data_recon_audit_mutations()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'IMMUTABILITY VIOLATION: data_reconciliation_audit_logs is an append-only table. % operations are prohibited.', TG_OP;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger for UPDATE and DELETE
DROP TRIGGER IF EXISTS trg_audit_log_immutable ON data_reconciliation_audit_logs;
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON data_reconciliation_audit_logs
FOR EACH ROW
EXECUTE FUNCTION trg_block_data_recon_audit_mutations();

-- Apply trigger for TRUNCATE
DROP TRIGGER IF EXISTS trg_audit_log_no_truncate ON data_reconciliation_audit_logs;
CREATE TRIGGER trg_audit_log_no_truncate
BEFORE TRUNCATE ON data_reconciliation_audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION trg_block_data_recon_audit_mutations();
