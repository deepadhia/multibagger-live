-- Sprint 2: XBRL / Official Financial Data Tables
-- Source: NSE quarterly results API (structured JSON, same official data as XBRL)

-- 1. Filing metadata and audit trail
CREATE TABLE IF NOT EXISTS public.xbrl_filings (
  id                UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id          UUID      REFERENCES public.stocks(id) ON DELETE CASCADE,
  ticker            TEXT      NOT NULL,
  bse_scrip_code    TEXT,
  nse_symbol        TEXT,
  quarter           TEXT      NOT NULL,  -- e.g. FY26-Q3
  period_end_date   DATE,               -- e.g. 2024-12-31
  filing_date       DATE,
  source            TEXT      NOT NULL DEFAULT 'nse_api', -- nse_api | bse_xbrl | manual
  source_url        TEXT,
  status            TEXT      NOT NULL DEFAULT 'fetched', -- fetched | failed | pending
  raw_response      JSONB,              -- Full API response for audit/reprocessing
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stock_id, quarter, source)
);

-- 2. Normalized quarterly financials — the core truth table
CREATE TABLE IF NOT EXISTS public.xbrl_metrics_quarterly (
  id                    UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id              UUID      NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  ticker                TEXT      NOT NULL,
  quarter               TEXT      NOT NULL,  -- FY26-Q3
  fy_year               INTEGER,             -- 2026
  period_end_date       DATE,
  period_start_date     DATE,
  -- P&L (values in lakhs, matching NSE API)
  revenue_from_ops      NUMERIC(15,2),
  other_income          NUMERIC(15,2),
  total_income          NUMERIC(15,2),
  total_expenses        NUMERIC(15,2),
  staff_cost            NUMERIC(15,2),
  raw_material_cost     NUMERIC(15,2),
  other_expenses        NUMERIC(15,2),
  ebitda                NUMERIC(15,2),       -- computed: total_income - expenses before D&A & finance
  ebitda_margin_pct     NUMERIC(6,2),        -- computed
  finance_cost          NUMERIC(15,2),
  depreciation          NUMERIC(15,2),
  exceptional_items     NUMERIC(15,2),
  pbt                   NUMERIC(15,2),
  tax_expense           NUMERIC(15,2),
  pat                   NUMERIC(15,2),
  pat_margin_pct        NUMERIC(6,2),        -- computed
  eps_basic             NUMERIC(10,4),
  eps_diluted           NUMERIC(10,4),
  -- Balance sheet proxies (available in NSE API)
  paid_up_capital       NUMERIC(15,2),
  debt_equity_ratio     NUMERIC(8,4),        -- from API field re_debt_eqt_rat
  -- YoY computed growth (filled by normalizer when prior year data exists)
  revenue_growth_yoy    NUMERIC(6,2),
  pat_growth_yoy        NUMERIC(6,2),
  -- Metadata
  source                TEXT      NOT NULL DEFAULT 'nse_api',
  confidence            TEXT      NOT NULL DEFAULT 'high', -- high | medium | low
  xbrl_filing_id        UUID      REFERENCES public.xbrl_filings(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stock_id, quarter, source)
);

-- 3. Segment data (when available in API response)
CREATE TABLE IF NOT EXISTS public.xbrl_segments (
  id              UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id        UUID      NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  ticker          TEXT      NOT NULL,
  quarter         TEXT      NOT NULL,
  segment_name    TEXT      NOT NULL,
  revenue         NUMERIC(15,2),
  profit_loss     NUMERIC(15,2),
  assets          NUMERIC(15,2),
  liabilities     NUMERIC(15,2),
  xbrl_filing_id  UUID      REFERENCES public.xbrl_filings(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stock_id, quarter, segment_name)
);

-- 4. Notable events extracted from API notes field
CREATE TABLE IF NOT EXISTS public.xbrl_notes (
  id              UUID      NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id        UUID      NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  ticker          TEXT      NOT NULL,
  quarter         TEXT      NOT NULL,
  note_type       TEXT      NOT NULL DEFAULT 'other',
  -- note_type: qip_use_of_funds | capex | exceptional | debt_repayment | order_book | rights_issue | other
  description     TEXT,
  amount          NUMERIC(15,2),
  xbrl_filing_id  UUID      REFERENCES public.xbrl_filings(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_xbrl_metrics_stock_quarter
  ON public.xbrl_metrics_quarterly (stock_id, quarter);

CREATE INDEX IF NOT EXISTS idx_xbrl_metrics_ticker
  ON public.xbrl_metrics_quarterly (ticker);

CREATE INDEX IF NOT EXISTS idx_xbrl_filings_stock
  ON public.xbrl_filings (stock_id, quarter);

CREATE INDEX IF NOT EXISTS idx_xbrl_segments_stock_quarter
  ON public.xbrl_segments (stock_id, quarter);

-- RLS: allow all access (same pattern as other tables)
ALTER TABLE public.xbrl_filings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xbrl_metrics_quarterly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xbrl_segments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xbrl_notes             ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to xbrl_filings"           ON public.xbrl_filings           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to xbrl_metrics_quarterly" ON public.xbrl_metrics_quarterly FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to xbrl_segments"          ON public.xbrl_segments          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to xbrl_notes"             ON public.xbrl_notes             FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.xbrl_metrics_quarterly IS
  'Sprint 2: Official quarterly financials from NSE structured results API. Values in Lakhs (NSE native unit).';
COMMENT ON TABLE public.xbrl_filings IS
  'Sprint 2: Audit trail for each official financial data fetch — stores raw API response for reprocessing.';
