ALTER TABLE public.xbrl_metrics_quarterly
  ADD COLUMN IF NOT EXISTS receivable_days   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS inventory_days    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS net_cash          NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS cfo_pat_ratio     NUMERIC(8,4);

COMMENT ON COLUMN public.xbrl_metrics_quarterly.receivable_days IS 'Receivables / Quarterly Revenue * 90';
COMMENT ON COLUMN public.xbrl_metrics_quarterly.inventory_days IS 'Inventory / Quarterly Revenue * 90';
COMMENT ON COLUMN public.xbrl_metrics_quarterly.net_cash IS 'Cash & Bank - Borrowings';
COMMENT ON COLUMN public.xbrl_metrics_quarterly.cfo_pat_ratio IS 'CFO / PAT';
