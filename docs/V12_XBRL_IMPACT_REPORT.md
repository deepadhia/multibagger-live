# V12 XBRL Ingestion & Prompt Pipeline Impact Report

This document summarizes the architectural and analytical upgrades completed to transition the Decision Engine from V10/V11 speculative inference to the **V12 High-Conviction Truth Layer**.

## 1. What We Built (Architectural Upgrades)

### Official XBRL Data Ingestion (Layer 1)
- We bypassed fragile XML scraping and built a reliable ingestion pipeline targeting the official **NSE `results-comparision` API**.
- Implemented `xbrl.service.js` which natively extracts the exact top-line, bottom-line, and margin drivers directly from the exchange.
- Added 4 dedicated relational tables to permanently store this intelligence: `xbrl_filings`, `xbrl_metrics_quarterly`, `xbrl_segments`, and `xbrl_notes`.

### Canonical Normalization (Layer 2)
- Replaced ambiguous legacy field names (like `opm`) with structured canonical metrics (`revenue_from_ops`, `ebitda_margin_pct`, `pat`, `finance_cost`).
- Automated the conversion of the exchange's native values (Lakhs) into clean, human-readable Crores (divided by 100). 

### Validation Rules (Layer 3)
- Engineered automated validation logic to flag logical fallacies in corporate reporting (e.g. Total Expenses deviating from Income - PBT, PAT exceeding Revenue, or inverted EPS signs).
- Injected a `confidence` score for every imported quarter.

### Surgical Prompt Wiring
- **Section G (Official Results):** Added a dedicated table in the prompt strictly fed by the official XBRL data.
- **Section B (Trend):** Completely refactored the historical trend calculation to read *first* from the high-fidelity XBRL pipeline rather than the legacy AI snapshots.
- **Finance Cost Visibility:** Automatically surfaces the `Finance Cost Trend` directly in the prompt for leveraged industrial companies to evaluate debt pressure quickly.

### Priority Backfill Workflow
- Created `run-priority-backfill.js` to instantly populate the latest 4-5 quarters of official financial data and updated Screener fundamentals for the priority watchlist (`TIMETECHNO`, `SKIPPER`, `HBLPOWER`, `CCL`, `INOXINDIA`).

---

## 2. Impact on Analysis & AI Scoring

The transition to the V12 XBRL pipeline fundamentally changes how the AI scores stocks, eliminating multiple vectors of hallucination and false confidence.

### A. Eradication of Scale Hallucinations
Previously, the AI was fed raw values stored in Lakhs but often interpreted them as Crores. A PAT of `35.9 Cr` was being passed into the prompt as `3591.4`. The AI interpreted this as a massive structural explosion in profitability, artificially inflating Conviction Scores and leading to dangerous "Multibagger" ratings. By standardizing the formatters (`toDisplayCrores`), the AI now correctly evaluates growth mathematically.

### B. High-Fidelity Margin Trend Recognition
By utilizing the exact `ebitda_margin_pct` explicitly calculated from the exchange filings, the AI accurately differentiates between nominal revenue growth and actual margin resilience. The prompt explicitly feeds the exact momentum direction (e.g., `Stable / Slight Compression`).

### C. Prevention of Data Leakage (Time-Travel Purity)
The `CopyGeminiPrompt` UI has been fortified to strictly respect the `limitToQuarter` parameter for the new XBRL arrays. When testing the engine against historical quarters (e.g., Q1), the prompt guarantees that Q2 and Q3 results will not bleed into the context, ensuring backtested scores reflect reality.

### D. Clear Isolation of Missing Data
When balance sheet or cash flow data is missing (as is standard in Q1 and Q3 filings in India), the prompt explicitly labels it as `N/A` rather than allowing the AI to hallucinate values or assume severe deterioration.

## Conclusion
The system’s quarterly financial data layer is now materially more reliable and suitable for disciplined equity tracking. Major sources of scale errors, stale inference, and time-travel leakage have been significantly reduced, allowing V12 outputs to focus more on real business performance than data noise.
