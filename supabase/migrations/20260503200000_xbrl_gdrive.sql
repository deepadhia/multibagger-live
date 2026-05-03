ALTER TABLE public.xbrl_filings
  ADD COLUMN IF NOT EXISTS gdrive_id   TEXT,
  ADD COLUMN IF NOT EXISTS gdrive_url  TEXT;
