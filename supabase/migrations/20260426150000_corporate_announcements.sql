-- Create table for tracking corporate announcements and AI classification
CREATE TABLE IF NOT EXISTS public.corporate_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID REFERENCES public.stocks(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  source_id TEXT NOT NULL, -- Unique ID from the source (e.g. Screener announcement ID)
  title_hash TEXT NOT NULL, -- MD5 hash of (ticker + title + date)
  title TEXT NOT NULL,
  raw_text TEXT, -- For auditing AI decisions
  priority TEXT, -- HIGH | MEDIUM | LOW
  impact TEXT,   -- POSITIVE | NEGATIVE | NEUTRAL
  confidence TEXT, -- HIGH | MEDIUM | LOW
  summary TEXT,
  status TEXT DEFAULT 'pending', -- pending | sent | failed | ignored
  sent_to_telegram BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticker, source_id),
  UNIQUE(ticker, title_hash)
);

CREATE INDEX IF NOT EXISTS idx_corporate_announcements_title_hash ON public.corporate_announcements(title_hash);

CREATE INDEX IF NOT EXISTS idx_corporate_announcements_ticker ON public.corporate_announcements(ticker);
CREATE INDEX IF NOT EXISTS idx_corporate_announcements_priority ON public.corporate_announcements(priority);

-- RLS
ALTER TABLE public.corporate_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to corporate_announcements" ON public.corporate_announcements FOR ALL USING (true) WITH CHECK (true);
