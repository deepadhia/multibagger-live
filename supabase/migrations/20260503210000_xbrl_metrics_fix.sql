ALTER TABLE public.xbrl_metrics_quarterly
  ADD COLUMN IF NOT EXISTS receivables          NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS inventory            NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS borrowings           NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS cash_and_bank        NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS cfo                  NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS capex                NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS equity               NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS source_preferred     TEXT DEFAULT 'api',
  ADD COLUMN IF NOT EXISTS xml_confidence_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reconciliation_logs  JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS segments             JSONB DEFAULT '[]';

-- Update uniqueness to reflect dual engine approach
-- We previously had UNIQUE (stock_id, quarter, source)
-- But now we want one 'canonical' row per quarter that merges sources.
-- I'll drop the old unique constraint and add a new one on (stock_id, quarter)
ALTER TABLE public.xbrl_metrics_quarterly DROP CONSTRAINT IF EXISTS xbrl_metrics_quarterly_stock_id_quarter_source_key;
ALTER TABLE public.xbrl_metrics_quarterly ADD CONSTRAINT xbrl_metrics_quarterly_stock_id_quarter_key UNIQUE (stock_id, quarter);
