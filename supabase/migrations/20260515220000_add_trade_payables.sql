-- Add Trade Payables and derived Working Capital metrics to xbrl_metrics_quarterly
ALTER TABLE public.xbrl_metrics_quarterly
  ADD COLUMN IF NOT EXISTS trade_payables        NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS payable_days           NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS working_capital_days   NUMERIC(10,2);

COMMENT ON COLUMN public.xbrl_metrics_quarterly.trade_payables IS 'Total Trade Payables (Current) from XBRL/NSE';
COMMENT ON COLUMN public.xbrl_metrics_quarterly.payable_days IS 'Derived: (Trade Payables / Revenue) * 90';
COMMENT ON COLUMN public.xbrl_metrics_quarterly.working_capital_days IS 'Derived: ((Receivables + Inventory - Payables) / Revenue) * 90';
