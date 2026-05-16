-- Add metric_sources column to track the origin of each field
ALTER TABLE xbrl_metrics_quarterly ADD COLUMN IF NOT EXISTS metric_sources JSONB DEFAULT '{}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN xbrl_metrics_quarterly.metric_sources IS 'Stores the source of each metric (e.g., {"revenue": "xbrl", "receivables": "fallback"})';
