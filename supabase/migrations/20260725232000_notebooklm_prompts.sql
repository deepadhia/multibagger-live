-- Add key_thesis_metrics column to stocks table
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS key_thesis_metrics TEXT;

-- Create prompt_templates table
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  template TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on prompt_templates
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (all permissions) to match other tables if needed
DROP POLICY IF EXISTS "Allow all access to prompt_templates" ON public.prompt_templates;
CREATE POLICY "Allow all access to prompt_templates" ON public.prompt_templates FOR ALL USING (true) WITH CHECK (true);

-- Insert the 4 prompt templates
INSERT INTO public.prompt_templates (name, title, template) VALUES
(
  'strategic_evolution',
  'Strategic Evolution Prompt',
  'Review the following institutional notes before updating:
• Strategic Evolution
• Strategic Accountability
• Institutional Debate
• Current Institutional Status

Analyze:
• Latest Quarterly Results
• Investor Presentation
• Concall Transcript (if available)

Primary Thesis Metrics
{{company_metrics}}

Identify ALL strategic initiatives discussed by management.

For every initiative, create the following sections:

1. Initiative Name

2. Original Objective

3. Timeline
• When announced
• Original target
• Current stage

4. Execution Progress

5. Evidence Timeline
Quarter-by-quarter evidence supporting your conclusion.

6. Financial Impact

7. Competitive Impact

8. Success Criteria
Specific measurable milestones.

9. Failure Triggers
What would invalidate or weaken this initiative?

10. Next Milestone

11. Key Risks

12. Current Status
Completed
Ongoing
Delayed
Cancelled

Separate initiatives into:

Completed Strategic Initiatives

Ongoing Strategic Initiatives

Finally provide:

• Biggest Strategic Success

• Biggest Strategic Concern

• Structural Change Since Last Quarter

• Monitoring Metrics

• Next Quarter Watchlist

• Strategic Confidence
High / Medium / Low

Support every conclusion using evidence.
If concall is unavailable finish with:

Questions Waiting For Management'
),
(
  'strategic_accountability',
  'Strategic Accountability Prompt',
  'Review all previous Strategic Accountability notes.

Analyze the latest Results,
Investor Presentation,
Concall Transcript.

Primary Thesis Metrics

{{company_metrics}}

Identify every commitment made by management.

For every commitment provide:

1. Original Guidance

2. Evidence Timeline

3. Current Status

Delivered

Partially Delivered

Delayed

Dropped

Modified

4. Reason for Outcome

5. Evidence

6. Probability of Completion

High

Medium

Low

7. Impact on Management Credibility

Finally summarize:

Biggest Promise Delivered

Biggest Delay

New Commitments

Promises Quietly Removed

Management Credibility Trend

Execution Confidence

Management Quality Assessment

Use evidence only.'
),
(
  'institutional_debate',
  'Institutional Debate Prompt',
  'Review:

Strategic Evolution

Strategic Accountability

Current Institutional Status

Latest Quarterly Documents

Primary Thesis Metrics

{{company_metrics}}

Evaluate every important thesis driver.

For each one discuss:

Bull Case

Bear Case

Evidence Supporting Bull

Evidence Supporting Bear

Structural vs Temporary

Probability Bull Case Wins

Probability Bear Case Wins

Catalysts That Increase Conviction

Catalysts That Reduce Conviction

Questions Still Unanswered

Finally summarize:

Central Institutional Debate

Most Important Unknown

Current Thesis

Strengthening

Stable

Weakening

Probability Long-term Thesis Succeeds

Evidence Only'
),
(
  'current_institutional_status',
  'Current Institutional Status Prompt',
  'Review:

Strategic Evolution

Strategic Accountability

Institutional Debate

Latest Quarterly Documents

Primary Thesis Metrics

{{company_metrics}}

For EACH metric determine:

Current Value

QoQ Trend

YoY Trend

Structural or Temporary

Impact on Investment Thesis

Create a Metric Scorecard

🟢 Improving

🟡 Stable

🔴 Deteriorating

Then summarize:

Investment Thesis Status

Strengthening

Unchanged

Weakening

Conviction Level

High

Medium

Low

Biggest Positive Development

Biggest Emerging Risk

Management Credibility

Key Questions Remaining

Top 5 Metrics For Next Quarter

Institutional Conclusion

Do NOT give Buy/Sell/Hold recommendations.

Base conclusions entirely on evidence.'
)
ON CONFLICT (name) DO UPDATE 
SET title = EXCLUDED.title, template = EXCLUDED.template, updated_at = now();

-- Pre-seed key_thesis_metrics for the 10 priority companies
UPDATE public.stocks SET key_thesis_metrics = 'EBITDA/kg, FDC Mix, Small Packs, B2C Revenue, Capacity Utilization, Export Growth, Operating Cash Flow, Net Debt, Working Capital' WHERE ticker = 'CCL';
UPDATE public.stocks SET key_thesis_metrics = 'EBITDA/MT, Value-added Mix, Lead, Aluminium, Plastic, Scrap Procurement, Capacity Utilization, OCF, ROCE' WHERE ticker = 'GRAVITA';
UPDATE public.stocks SET key_thesis_metrics = 'Order Book, Order Inflow, Book-to-Bill, Sangli Project, Export Share, Receivable Days, Capacity Utilization, OCF' WHERE ticker = 'QPEL';
UPDATE public.stocks SET key_thesis_metrics = 'Value-added Products, Composite LPG Cylinders, CNG Cascades, IBC Business, Capacity Utilization, EBITDA Margin, OCF, Debt' WHERE ticker = 'TIMETECHNO';
UPDATE public.stocks SET key_thesis_metrics = 'Kavach Revenue, Kavach Order Book, Railway Electronics, Battery Business, Defence, Export Revenue, EBITDA Margin, OCF' WHERE ticker = 'HBL';
UPDATE public.stocks SET key_thesis_metrics = 'Data Center MW, MW Leased, Rental Income, Residential Sales, Collections, Land Bank, Net Debt' WHERE ticker = 'ANANTRAJ';
UPDATE public.stocks SET key_thesis_metrics = 'Order Book, Order Inflow, LNG Business, Cryogenic Tanks, Export Revenue, Capacity Utilization, EBITDA Margin' WHERE ticker = 'INOXINDIA';
UPDATE public.stocks SET key_thesis_metrics = 'NGP Mix, Export Revenue, Customer Wins, Content per Vehicle, EBITDA Margin, ROCE, OCF' WHERE ticker = 'SJS';
UPDATE public.stocks SET key_thesis_metrics = 'T&D Order Book, Execution Rate, Polymer Business, Capacity Utilization, Receivable Days, EBITDA Margin, OCF' WHERE ticker = 'SKIPPER';
UPDATE public.stocks SET key_thesis_metrics = 'Advanced Product Mix, Content per Vehicle, EV Revenue, New Program Wins, Export Revenue, EBITDA Margin, ROCE, OCF' WHERE ticker = 'LUMAXTECH';
