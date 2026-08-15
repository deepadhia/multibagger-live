-- Migration: Phase 4E.0 Point-in-Time Event Dataset & Provenance Ledger
-- Description: DDL schema for raw event records, market reaction windows, fundamental change windows, and event attribution states.

CREATE TABLE IF NOT EXISTS phase4e0_event_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  ticker TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'EARNINGS', 'RESULTS', 'GUIDANCE_CHANGE', 'ORDER_WIN', 'ORDER_LOSS', 'REGULATORY', 'PROMOTER_ACTION', 'CAPEX', 'ACQUISITION', 'DEMERGER', 'MANAGEMENT_CHANGE', 'SECTOR_EVENT', 'HEADLINE', 'OTHER'
  event_cluster_id TEXT, -- Multi-event clustering identifier
  
  -- Timestamps & Session Context (Amendment 3)
  event_published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  event_available_at TIMESTAMP WITH TIME ZONE NOT NULL,
  decision_cutoff_at TIMESTAMP WITH TIME ZONE NOT NULL,
  market_session_context TEXT NOT NULL, -- 'PRE_MARKET', 'INTRADAY', 'POST_MARKET'

  -- Source Provenance
  source_type TEXT NOT NULL, -- 'EXCHANGE_FILING', 'EARNINGS_CALL', 'PRESS_RELEASE', 'INVESTOR_PRESENTATION'
  source_id TEXT,

  -- Market Reaction Window (Raw Prices & Returns)
  pre_event_price NUMERIC,
  event_price NUMERIC,
  return_1d NUMERIC,
  return_3d NUMERIC,
  return_5d NUMERIC,
  volume_shock_ratio NUMERIC,

  -- Fundamental Change Window (Disclosed Actual Facts & Guidance)
  fundamental_changes JSONB NOT NULL, -- { "revenue_yoy_pct": 0.23, "ebitda_yoy_pct": 0.245, "margin_change_bps": 50, "order_book_change_pct": null, "guidance_action": "REITERATED" }

  -- Deterministic Event Attribution & Integrity State (Amendment 4)
  event_attribution_state TEXT NOT NULL, -- 'CLEAN', 'MULTI_EVENT_WINDOW', 'CONFOUNDING_SECTOR_EVENT', 'INSUFFICIENT_EVENT_DATA'
  synthetic_fallback_used BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phase4e0_events_ticker ON phase4e0_event_records (ticker, event_available_at);
