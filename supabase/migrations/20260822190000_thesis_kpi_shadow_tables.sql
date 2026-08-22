-- Migration: Thesis KPI Shadow Engine v1.0 Tables
-- Creates isolated shadow tables for company-specific business driver tracking and lead-lag observation.
-- Zero write path to ranking tables or existing quarterly snapshots.

CREATE TABLE IF NOT EXISTS thesis_kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company TEXT NOT NULL,
    metric_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT,
    thesis_link TEXT,
    expected_direction TEXT,
    measurement_quality TEXT NOT NULL DEFAULT 'B',
    source_priority INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company, metric_id)
);

CREATE TABLE IF NOT EXISTS thesis_kpi_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company TEXT NOT NULL,
    metric_id TEXT NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'QUARTERLY',
    period TEXT NOT NULL,
    reported_value NUMERIC,
    unit TEXT,
    source_type TEXT,
    source_document TEXT,
    source_page TEXT,
    evidence_text TEXT,
    availability_status TEXT DEFAULT 'AVAILABLE',
    qoq_delta NUMERIC,
    yoy_delta NUMERIC,
    growth_rate NUMERIC,
    growth_acceleration NUMERIC,
    growth_direction TEXT,
    driver_state TEXT DEFAULT 'WATCH',
    economic_relevance TEXT DEFAULT 'LOW',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company, metric_id, period_type, period)
);

CREATE INDEX IF NOT EXISTS idx_thesis_kpi_defs_company ON thesis_kpi_definitions(company);
CREATE INDEX IF NOT EXISTS idx_thesis_kpi_obs_lookup ON thesis_kpi_observations(company, metric_id, period_type, period);
