-- Update strategic_evolution template
UPDATE public.prompt_templates
SET template = 'Review the following institutional notes before updating:
• Strategic Evolution
• Strategic Accountability
• Institutional Debate
• Current Institutional Status

Do not rewrite unchanged initiatives.

Only update sections where new evidence materially changes the long-term strategic view.

Retain historical context from previous Strategic Evolution notes.

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

   Execution Momentum
   Accelerating
   On Track
   Slowing
   Behind Schedule

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

   Probability of Strategic Success
   High
   Medium
   Low

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

Questions Waiting For Management',
updated_at = now()
WHERE name = 'strategic_evolution';

-- Update strategic_accountability template
UPDATE public.prompt_templates
SET template = 'Review all previous Strategic Accountability notes.

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

Financial Impact
Has this commitment created value?
Has it improved margins?
Cash flow?
Capital allocation?
Competitive position?

Lessons Learned
What does this commitment tell us about management quality?
Has management become more conservative?
More aggressive?
More realistic?

Finally summarize:

Biggest Promise Delivered

Biggest Delay

New Commitments

Promises Quietly Removed

Management Credibility Trend

Execution Confidence

Management Quality Assessment

Use evidence only.',
updated_at = now()
WHERE name = 'strategic_accountability';

-- Update institutional_debate template
UPDATE public.prompt_templates
SET template = 'Review:

Strategic Evolution

Strategic Accountability

Current Institutional Status

Latest Quarterly Documents

Primary Thesis Metrics

{{company_metrics}}

Evaluate every important thesis driver.

For each one discuss:

Bull Case

Supporting Evidence

Probability (%)

Bear Case

Supporting Evidence

Probability (%)

What would invalidate the Bull Case?

What would invalidate the Bear Case?

Leading Indicators to Monitor
Which metrics would tell us earliest whether the bull or bear case is playing out?

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

Evidence Only',
updated_at = now()
WHERE name = 'institutional_debate';
