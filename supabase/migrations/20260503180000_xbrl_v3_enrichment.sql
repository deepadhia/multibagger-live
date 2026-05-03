ALTER TABLE public.xbrl_metrics_quarterly
  ADD COLUMN IF NOT EXISTS receivables      NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS inventory        NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS borrowings       NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS cash_and_bank    NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS cfo              NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS capex            NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS xml_confidence_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_preferred TEXT DEFAULT 'api', -- api | xml | merged
  ADD COLUMN IF NOT EXISTS cfo_period_type  TEXT; -- quarterly | ytd | annual

-- 2. Create reconciliation logs for audit
CREATE TABLE IF NOT EXISTS public.xbrl_reconciliation_logs (
  id              UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id        UUID      NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  ticker          TEXT      NOT NULL,
  quarter         TEXT      NOT NULL,
  field_name      TEXT      NOT NULL,
  api_val         NUMERIC(15,2),
  xml_val         NUMERIC(15,2),
  variance_pct    NUMERIC(8,4),
  winner_source   TEXT      NOT NULL, -- api | xml
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create parse logs for audit/repro
CREATE TABLE IF NOT EXISTS public.xbrl_parse_logs (
  id              UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id        UUID      NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  ticker          TEXT      NOT NULL,
  quarter         TEXT      NOT NULL,
  status          TEXT      NOT NULL, -- success | warning | error
  message         TEXT,
  details         JSONB,    -- To store mismatches/diffs
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
-- ALTER TABLE public.xbrl_reconciliation_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.xbrl_parse_logs           ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Allow all access to xbrl_reconciliation_logs" ON public.xbrl_reconciliation_logs FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all access to xbrl_parse_logs"          ON public.xbrl_parse_logs          FOR ALL USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_xbrl_reconciliation_ticker ON public.xbrl_reconciliation_logs (ticker);
CREATE INDEX IF NOT EXISTS idx_xbrl_parse_logs_ticker     ON public.xbrl_parse_logs (ticker);
