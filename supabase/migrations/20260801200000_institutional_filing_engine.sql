-- Add filing_category, event_analysis, deep_dive_status to corporate_announcements
ALTER TABLE public.corporate_announcements
  ADD COLUMN IF NOT EXISTS filing_category TEXT DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS event_analysis JSONB,
  ADD COLUMN IF NOT EXISTS deep_dive_status TEXT DEFAULT 'not_required';

-- Index for worker queue polling
CREATE INDEX IF NOT EXISTS idx_ca_deep_dive_status ON public.corporate_announcements(deep_dive_status);
CREATE INDEX IF NOT EXISTS idx_ca_filing_category ON public.corporate_announcements(filing_category);

-- Expand management_commitments to support multi-quarter credibility tracking
ALTER TABLE public.management_commitments
  ADD COLUMN IF NOT EXISTS ticker TEXT,
  ADD COLUMN IF NOT EXISTS evidence_summary TEXT,
  ADD COLUMN IF NOT EXISTS blockers_and_risks TEXT,
  ADD COLUMN IF NOT EXISTS credibility_impact TEXT DEFAULT 'neutral',
  ADD COLUMN IF NOT EXISTS last_evaluated_quarter TEXT,
  ADD COLUMN IF NOT EXISTS commitment_title TEXT,
  ADD COLUMN IF NOT EXISTS target_timeline TEXT;
