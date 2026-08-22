-- ============================================================
-- Add Himadri Speciality Chemical Ltd (HSCL) as a Core stock
-- Migration: 20260822180000_add_hscl_stock.sql
-- ============================================================
-- BSE Scrip Code: 500184
-- NSE Symbol    : HSCL
-- Screener Slug : HSCL  (/company/HSCL/consolidated/)
-- Category      : Core
-- Buy Price     : Rs.655
-- ============================================================
-- Idempotent: safe to run multiple times.
-- Uses INSERT ... SELECT ... WHERE NOT EXISTS because stocks.ticker
-- has no UNIQUE constraint in the base schema.
-- ============================================================

INSERT INTO public.stocks (
  id,
  company_name,
  ticker,
  sector,
  category,
  buy_price,
  investment_thesis,
  tracking_directives,
  metric_keys,
  screener_slug,
  bse_scrip_code,
  key_thesis_metrics
)
SELECT
  gen_random_uuid(),
  'Himadri Speciality Chemical',
  'HSCL',
  'Specialty Chemicals / Battery Materials',
  'Core',
  655,

  'Himadri is India''s only integrated carbon material company with a dominant position in Coal Tar Pitch (CTP) and Speciality Carbon Black (SCB). The core thesis is a structural transition from a commodity chemical supplier to a high-margin advanced material and battery-material compounder. Key catalysts: (1) Anode material supply for LFP/Na-ion battery cells - Himadri is building the first integrated carbon-based anode material plant in India; (2) continued penetration of export markets with Carbon Black displacing China in niche segments; (3) operational leverage as Coal Tar Distillation capacity scales with Coal Tar supply availability. The Birla Tyres JV (Birla Carbon) is a risk factor to watch - any supply diversion or pricing pressure from Birla Tyres could compress margins.',

  'COMPANY FOCUS (HSCL): I am tracking Himadri''s transformation from a commodity Carbon Materials supplier to a high-value Battery Anode Material and Speciality Chemical compounder.

PRIMARY METRICS TO EXTRACT (from Screener Insights + management commentary):
1. Sales Volume (MT) - track absolute volume and QoQ/YoY growth. Indicates capacity utilization.
2. Coal Tar Distillation Capacity (MTPA) - track announced vs. commissioned capacity. Any expansion or delay must be flagged.
3. EBITDA per Metric Ton (Rs./MT) - THE most critical margin metric. Flag any contraction vs. management target.
4. Speciality Carbon Black Capacity (MTPA) - track expansion milestones and actual ramp-up.
5. Total Carbon Black Capacity (MTPA) - combined capacity ceiling.
6. Number of Countries Exported To - proxy for product quality acceptance and pricing power in global markets.
7. R&D Spend (Rs. Crores) - flag any reduction; R&D underpins the anode material pivot.
8. R&D Expenditure (% of Turnover) - intensity ratio; must not fall below 1% if battery thesis is credible.
9. Birla Tyres Distributors and Dealers (Count) - track Birla Tyres JV health; a stalled distribution network flags off-take risk.

BATTERY ANODE MATERIAL PIVOT (highest importance):
- Extract any update on the Lithium-Ion Battery (LIB) anode material plant - location, capacity, commissioning timeline, CAPEX outlay.
- Extract any customer wins, MoUs, or supply agreements for anode materials (especially with domestic battery cell makers or EV OEMs).
- Flag if management avoids discussing the anode pivot or revises capacity timelines downward.

COAL TAR SUPPLY RISK:
- Himadri is dependent on Coal Tar (a steel industry byproduct). Extract any commentary on Coal Tar availability, pricing, or supply chain disruptions.
- Track if capacity utilization is constrained by Coal Tar supply vs. market demand.

RED FLAGS TO HUNT:
- EBITDA/MT contraction for 2 consecutive quarters without explanation.
- R&D spend falling as % of turnover while the battery pivot is being marketed.
- Anode material plant delays without clear revised timeline.
- Any pledge creation on promoter shares.
- Debt rising without corresponding CAPEX announcement for productive assets.',

  '[
    "sales_volume_mt",
    "coal_tar_distillation_capacity_mtpa",
    "ebitda_per_metric_ton_inr",
    "speciality_carbon_black_capacity_mtpa",
    "total_carbon_black_capacity_mtpa",
    "number_of_countries_exported",
    "rd_spend_inr_cr",
    "birla_tyres_distributors_dealers",
    "rd_expenditure_pct_turnover"
  ]'::jsonb,

  'HSCL',
  '500184',
  'Sales Volume (MT), Coal Tar Distillation Capacity (MTPA), EBITDA per Metric Ton (Rs./MT), Speciality Carbon Black Capacity (MTPA), Total Carbon Black Capacity (MTPA), Export Countries Count, R&D Spend (Rs. Cr), Birla Tyres Distributors & Dealers, R&D % of Turnover'

WHERE NOT EXISTS (
  SELECT 1 FROM public.stocks WHERE UPPER(TRIM(ticker)) = 'HSCL'
);
