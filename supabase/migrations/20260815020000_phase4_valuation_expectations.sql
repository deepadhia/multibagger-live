-- Phase 4: Valuation & Market Expectations Layer Schema
CREATE TABLE IF NOT EXISTS market_data_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  period TEXT NOT NULL,
  market_data_as_of DATE NOT NULL,
  market_data_retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  market_data_source TEXT NOT NULL,
  market_data_version INT NOT NULL DEFAULT 1,
  source_document_id TEXT,
  source_hash TEXT,
  freshness_status TEXT NOT NULL CHECK (freshness_status IN ('FRESH', 'STALE_WARNING', 'EXPIRED')),

  share_price NUMERIC NOT NULL,
  shares_outstanding NUMERIC NOT NULL,
  market_cap NUMERIC NOT NULL,
  enterprise_value NUMERIC NOT NULL,
  net_debt NUMERIC NOT NULL DEFAULT 0,
  dilution_warrants_impact_pct NUMERIC DEFAULT 0.0,

  ttm_revenue NUMERIC NOT NULL,
  ttm_ebitda NUMERIC NOT NULL,
  ttm_ebit NUMERIC NOT NULL,
  ttm_pat NUMERIC NOT NULL,
  ttm_eps NUMERIC NOT NULL,
  ttm_fcf NUMERIC,
  roce_pct NUMERIC,
  pe_ratio NUMERIC NOT NULL,
  ev_ebitda_ratio NUMERIC NOT NULL,
  pe_historical_percentile NUMERIC,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticker, period, market_data_as_of)
);

CREATE TABLE IF NOT EXISTS market_implied_expectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  period TEXT NOT NULL,
  information_cutoff_at TIMESTAMPTZ NOT NULL,
  share_price NUMERIC NOT NULL,
  holding_period_years INT NOT NULL DEFAULT 5,
  required_cagr_pct NUMERIC NOT NULL DEFAULT 20.0,
  
  baseline_eps NUMERIC NOT NULL,
  baseline_revenue NUMERIC NOT NULL,
  baseline_net_margin_pct NUMERIC NOT NULL,
  baseline_shares_outstanding NUMERIC NOT NULL,
  assumed_terminal_shares_outstanding NUMERIC NOT NULL,
  assumed_dilution_pct NUMERIC NOT NULL DEFAULT 0.0,
  assumed_terminal_pe NUMERIC NOT NULL,
  assumed_terminal_net_margin_pct NUMERIC NOT NULL,

  required_terminal_equity_value NUMERIC NOT NULL,
  required_terminal_eps NUMERIC NOT NULL,
  required_eps_cagr_pct NUMERIC NOT NULL,
  required_terminal_revenue NUMERIC NOT NULL,
  required_revenue_cagr_pct NUMERIC NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticker, period, information_cutoff_at)
);

CREATE TABLE IF NOT EXISTS valuation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  period TEXT NOT NULL,
  information_cutoff_at TIMESTAMPTZ NOT NULL,
  scenario_name TEXT NOT NULL CHECK (scenario_name IN ('BEAR', 'BASE', 'BULL', 'OPTIONALITY')),
  expected_eps_cagr_pct NUMERIC NOT NULL,
  expected_terminal_pe NUMERIC NOT NULL,
  projected_target_price_min NUMERIC NOT NULL,
  projected_target_price_max NUMERIC NOT NULL,
  
  operational_growth_return_pct NUMERIC NOT NULL,
  multiple_expansion_return_pct NUMERIC NOT NULL,
  dividend_yield_return_pct NUMERIC DEFAULT 0.0,

  value_trap_category TEXT NOT NULL CHECK (
    value_trap_category IN (
      'NOT_VALUE_TRAP',
      'CHEAP_VALUATION',
      'CHEAP_WITH_DETERIORATING_BUSINESS',
      'CHEAP_WITH_TEMPORARY_HEADWIND',
      'CHEAP_WITH_STRUCTURAL_IMPAIRMENT',
      'CHEAP_WITH_IDENTIFIABLE_CATALYST'
    )
  ),
  value_trap_rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticker, period, scenario_name, information_cutoff_at)
);

CREATE TABLE IF NOT EXISTS valuation_scenario_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES valuation_scenarios(id) ON DELETE CASCADE,
  assumption_key TEXT NOT NULL,
  assumption_value TEXT NOT NULL,
  provenance_category TEXT NOT NULL CHECK (provenance_category IN ('VERIFIED_FACT', 'DERIVED_FACT', 'MANAGEMENT_CLAIM', 'ANALYST_ASSUMPTION')),
  claim_id TEXT REFERENCES claim_lineage(claim_id) ON DELETE RESTRICT,
  rationale_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_claim_id_required CHECK (
    (provenance_category IN ('VERIFIED_FACT', 'DERIVED_FACT', 'MANAGEMENT_CLAIM') AND claim_id IS NOT NULL)
    OR (provenance_category = 'ANALYST_ASSUMPTION')
  )
);

CREATE TABLE IF NOT EXISTS rerating_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  period TEXT NOT NULL,
  information_cutoff_at TIMESTAMPTZ NOT NULL,
  
  pre_trigger_market_archetype TEXT NOT NULL,
  post_trigger_market_archetype TEXT NOT NULL,
  pre_trigger_pe NUMERIC NOT NULL,
  post_trigger_pe NUMERIC NOT NULL,
  
  price_implied_eps_cagr_before NUMERIC NOT NULL,
  price_implied_eps_cagr_after NUMERIC NOT NULL,
  consensus_eps_cagr_before NUMERIC,
  consensus_eps_cagr_after NUMERIC,
  
  price_before_trigger NUMERIC NOT NULL,
  price_after_trigger NUMERIC NOT NULL,
  multiple_contribution_pct NUMERIC NOT NULL,
  earnings_contribution_pct NUMERIC NOT NULL,

  trigger_description TEXT NOT NULL,
  trigger_horizon TEXT NOT NULL CHECK (trigger_horizon IN ('0-2_QUARTERS', '2-4_QUARTERS', '1-2_YEARS', 'GREATER_THAN_2_YEARS')),
  trigger_status TEXT NOT NULL CHECK (trigger_status IN ('NOT_STARTED', 'IN_PROGRESS', 'TRIGGERED', 'INVALIDATED')),
  trigger_observed_at TIMESTAMPTZ,
  trigger_claim_id TEXT REFERENCES claim_lineage(claim_id) ON DELETE RESTRICT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS human_decision_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  period TEXT NOT NULL,
  decision_version INT NOT NULL DEFAULT 1,
  previous_decision_id UUID REFERENCES human_decision_journal(id) ON DELETE SET NULL,
  decision_maker_user_id TEXT NOT NULL DEFAULT 'HUMAN_INVESTOR',
  information_cutoff_at TIMESTAMPTZ NOT NULL,

  machine_expectation_gap_classification TEXT NOT NULL CHECK (
    machine_expectation_gap_classification IN ('UNDERAPPRECIATED_GROWTH', 'FAIRLY_PRICED', 'PRICED_FOR_PERFECTION', 'VALUE_TRAP', 'HEADWIND_DISCOUNT', 'SEVERE_DERATING')
  ),
  machine_summary TEXT NOT NULL,
  
  human_decision TEXT NOT NULL CHECK (human_decision IN ('BUY', 'HOLD', 'WATCH', 'TRIM', 'EXIT')),
  human_investor_rationale TEXT NOT NULL,
  
  human_probability_bear_pct NUMERIC NOT NULL CHECK (human_probability_bear_pct BETWEEN 0 AND 100),
  human_probability_base_pct NUMERIC NOT NULL CHECK (human_probability_base_pct BETWEEN 0 AND 100),
  human_probability_bull_pct NUMERIC NOT NULL CHECK (human_probability_bull_pct BETWEEN 0 AND 100),
  human_probability_optionality_pct NUMERIC NOT NULL CHECK (human_probability_optionality_pct BETWEEN 0 AND 100),

  CONSTRAINT chk_probability_sum_100 CHECK (
    (human_probability_bear_pct + human_probability_base_pct + human_probability_bull_pct + human_probability_optionality_pct) = 100
  ),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticker, period, decision_version)
);

CREATE INDEX IF NOT EXISTS idx_market_data_lookup ON market_data_snapshots(ticker, period);
CREATE INDEX IF NOT EXISTS idx_decision_journal_lookup ON human_decision_journal(ticker, period);
