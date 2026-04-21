-- Add scoring_version to track data regime (V5 = pre-structured, V9 = new framework)
ALTER TABLE quarterly_snapshots
  ADD COLUMN IF NOT EXISTS scoring_version TEXT DEFAULT 'V5';

-- Mark all existing rows as V5 (old heuristic scoring)
UPDATE quarterly_snapshots
SET scoring_version = 'V5'
WHERE scoring_version IS NULL OR scoring_version = 'V5';
