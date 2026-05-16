-- V12 Engine: Add queryable intelligence columns to quarterly_snapshots
-- These make decision blockers, deterioration tracking, and data quality
-- directly queryable without unpacking raw_ai_output JSONB every time.

ALTER TABLE quarterly_snapshots
  ADD COLUMN IF NOT EXISTS decision_blockers  text[]         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deterioration_quarters integer    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_quality_score  numeric(5,2)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS official_filing_present boolean   DEFAULT NULL;

-- Index for querying stocks with active blockers or deterioration
CREATE INDEX IF NOT EXISTS idx_qs_decision_blockers
  ON quarterly_snapshots USING GIN (decision_blockers);

CREATE INDEX IF NOT EXISTS idx_qs_deterioration
  ON quarterly_snapshots (stock_id, deterioration_quarters)
  WHERE deterioration_quarters > 0;

COMMENT ON COLUMN quarterly_snapshots.decision_blockers IS
  'V12: Array of active decision blockers (earnings_quality_risk, kill_switch_triggered, etc.)';
COMMENT ON COLUMN quarterly_snapshots.deterioration_quarters IS
  'V12: Consecutive quarters of thesis deterioration (used by Multibagger Mode Rule 11)';
COMMENT ON COLUMN quarterly_snapshots.data_quality_score IS
  'V12: 0-100 score reflecting input completeness (XBRL + transcript + screener coverage)';
COMMENT ON COLUMN quarterly_snapshots.official_filing_present IS
  'V12: Whether an official XBRL or earnings PDF filing was available for this quarter';
