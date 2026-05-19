-- Create shadow table for historical snapshot comparison
CREATE TABLE IF NOT EXISTS public.quarterly_snapshots_shadow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  quarter text NOT NULL,
  summary text,
  dodged_questions jsonb DEFAULT '[]'::jsonb,
  red_flags jsonb DEFAULT '[]'::jsonb,
  metrics jsonb DEFAULT '{}'::jsonb,
  raw_ai_output jsonb,
  thesis_status text,
  thesis_status_reason text,
  thesis_score numeric,
  valuation_score numeric,
  conviction_score numeric,
  final_action text,
  position_size text,
  scoring_version text,
  decision_blockers text[] DEFAULT '{}',
  deterioration_quarters integer DEFAULT 0,
  data_quality_score numeric(5,2),
  official_filing_present boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(stock_id, quarter)
);

-- Enable RLS and add policy
ALTER TABLE public.quarterly_snapshots_shadow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to quarterly_snapshots_shadow"
  ON public.quarterly_snapshots_shadow FOR ALL
  USING (true) WITH CHECK (true);
