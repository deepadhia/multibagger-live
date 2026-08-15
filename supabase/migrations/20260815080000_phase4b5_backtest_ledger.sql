-- Migration: Phase 4B.5 Point-in-Time Backtest Ledger & Snapshots
-- Description: Cryptographically auditable backtest snapshot ledger enforcing decision immutability and outcome isolation

CREATE TABLE IF NOT EXISTS phase4b5_backtest_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  decision_cutoff_at TIMESTAMP WITH TIME ZONE NOT NULL,
  snapshot_hash TEXT NOT NULL,
  decision_hash TEXT NOT NULL,
  blind_decision TEXT NOT NULL, -- 'BUY', 'WATCH', 'AVOID', 'NO_CONCLUSION'
  decision_reason TEXT NOT NULL,
  pre_probabilities JSONB NOT NULL,
  post_probabilities JSONB NOT NULL,
  execution_signal TEXT NOT NULL,
  evidence_sample_size INT NOT NULL,
  ruleset_version TEXT NOT NULL DEFAULT '1.0.0',
  is_immutable BOOLEAN NOT NULL DEFAULT TRUE,

  -- Outcome Revelation Fields (Populated ONLY AFTER decision persistence succeeds)
  forward_returns JSONB, -- { "1M": 0.05, "3M": 0.12, "6M": 0.40, "12M": 1.08 }
  max_drawdown NUMERIC,
  nifty500_return_12m NUMERIC,
  alpha_vs_nifty_12m NUMERIC,
  baseline_comparisons JSONB, -- { "buy_and_hold": 1.08, "equal_weight": 0.25, "momentum_6m": 0.45, "simple_screener": 0.30 }

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Unique index ensuring 1 immutable decision snapshot per ticker per cutoff per ruleset
CREATE UNIQUE INDEX IF NOT EXISTS idx_phase4b5_snapshots_unique 
  ON phase4b5_backtest_snapshots (ticker, decision_cutoff_at, ruleset_version);
