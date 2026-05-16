-- Add metric_metadata column for granular provenance
ALTER TABLE xbrl_metrics_quarterly ADD COLUMN IF NOT EXISTS metric_metadata JSONB DEFAULT '{}';

-- Add reliability_score for aggregate quality tracking
ALTER TABLE xbrl_metrics_quarterly ADD COLUMN IF NOT EXISTS reliability_score INT DEFAULT 0;
