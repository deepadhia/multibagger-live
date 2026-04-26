-- Add result date tracking to stocks and flag earnings releases in announcements
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS next_results_date DATE;
ALTER TABLE public.corporate_announcements ADD COLUMN IF NOT EXISTS is_earnings_release BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_stocks_next_results_date ON public.stocks(next_results_date);
