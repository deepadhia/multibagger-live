ALTER TABLE public.xbrl_metrics_quarterly
  ADD COLUMN IF NOT EXISTS gdrive_url TEXT;
