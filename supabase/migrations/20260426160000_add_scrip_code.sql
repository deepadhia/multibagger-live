-- Add BSE Scrip Code column to stocks table for announcement scanning
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS bse_scrip_code TEXT;

CREATE INDEX IF NOT EXISTS idx_stocks_bse_scrip_code ON public.stocks(bse_scrip_code);
