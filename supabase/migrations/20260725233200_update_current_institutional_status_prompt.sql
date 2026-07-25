-- Update current_institutional_status prompt template with final version improvements
UPDATE public.prompt_templates
SET template = 'Review:

• Strategic Evolution
• Strategic Accountability
• Institutional Debate
• Previous Current Institutional Status
• Latest Quarterly Results
• Investor Presentation
• Concall Transcript (if available)

Primary Thesis Metrics

{{company_metrics}}

For EACH thesis metric evaluate:

• Current Value (if disclosed)
• QoQ Trend
• YoY Trend
• Trend vs Management Guidance
• Structural or Temporary
• Impact on Investment Thesis
• Supporting Evidence

Create a Metric Scorecard with:

• Metric
• Status (🟢 Improving / 🟡 Stable / 🔴 Deteriorating)
• Reason
• Effect on Thesis

Then summarize:

1. Investment Thesis Status
   - Strengthening / Unchanged / Weakening
   - Explain why.

2. Conviction Level
   - High / Medium / Low
   - Explain the key drivers.

3. Biggest Positive Development

4. Biggest Emerging Risk

5. Management Credibility
   - Improved / Unchanged / Deteriorated
   - Evidence.

6. Key Questions Remaining

7. Top 5 Metrics to Monitor Next Quarter

8. Institutional Conclusion

Summarize:
• What changed since last quarter?
• Has conviction increased, decreased, or remained unchanged?
• Three key reasons.
• Evidence supporting the conclusion.

Do NOT give Buy/Sell/Hold recommendations.

Base every conclusion only on evidence from the documents.',
updated_at = now()
WHERE name = 'current_institutional_status';
