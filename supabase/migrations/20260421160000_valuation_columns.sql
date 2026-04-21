-- Migration to add explicit tier and valuation columns to quarterly_snapshots

ALTER TABLE quarterly_snapshots 
  ADD COLUMN IF NOT EXISTS thesis_score INTEGER,
  ADD COLUMN IF NOT EXISTS conviction_score INTEGER,
  ADD COLUMN IF NOT EXISTS valuation_score INTEGER,
  ADD COLUMN IF NOT EXISTS final_action TEXT,
  ADD COLUMN IF NOT EXISTS position_size TEXT;
