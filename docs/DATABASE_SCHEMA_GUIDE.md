# MBIQ — Database Schema & Feature Guide

This document provides a detailed mapping of the database tables, their significance, and how they relate to the core features of the Multibagger-live platform.

---

## 1. Core Stock Data

### `stocks`
- **Significance**: The master list of all tracked companies.
- **Key Columns**: `ticker`, `company_name`, `sector`, `industry`, `screener_slug`, `investment_thesis`.
- **Usecase**: Central registry for all other data points. The `investment_thesis` is critical for AI-powered announcement classification.

### `prices`
- **Significance**: Historical daily price data.
- **Key Columns**: `stock_id`, `ticker`, `price_date`, `close_price`.
- **Usecase**: Powering charts and calculating real-time portfolio value.

---

## 2. Official Financial Intelligence (The Truth Layer)

### `xbrl_filings`
- **Significance**: Tracking metadata of official XBRL filings fetched from the NSE.
- **Key Columns**: `ticker`, `quarter`, `filing_date`, `source_url`, `status`.
- **Usecase**: Audit trail for when and where financial data was sourced.

### `xbrl_metrics_quarterly`
- **Significance**: **The High-Fidelity Truth Layer.** Standardized P&L and Balance Sheet metrics extracted from XBRL.
- **Key Columns**: `revenue_from_ops`, `ebitda`, `pat`, `finance_cost`, `revenue_growth_yoy`, `pat_growth_yoy`.
- **Usecase**: Primary source for the Decision Engine's Section G (Data Table) and Section B (Trend Analysis). Values are stored in Lakhs and converted to Crores in the UI.

### `xbrl_segments` & `xbrl_notes`
- **Significance**: Deep-dive data extracted from specific XBRL tables.
- **Key Columns**: `segment_name`, `revenue`, `profit_loss`, `note_type`, `description`.
- **Usecase**: (V12.1 Future) Segment-level analysis to see which business units are driving growth.

---

## 3. Sentiment & Qualitative Data

### `transcripts`
- **Significance**: Raw text from Earnings Call transcripts.
- **Key Columns**: `stock_id`, `quarter`, `year`, `transcript_text`.
- **Usecase**: Source text for AI analysis. Quarters here indicate available "Qualitative" data even if XBRL hasn't been fetched yet.

### `transcript_analysis`
- **Significance**: AI-processed insights from transcripts.
- **Key Columns**: `stock_id`, `quarter`, `summary`, `key_takeaways`, `sentiment_score`.
- **Usecase**: Powering the detail page's "AI Insights" section.

### `management_promises`
- **Significance**: Tracking specific quantitative commitments made by management.
- **Key Columns**: `promise_text`, `target_deadline`, `status` (kept/broken/pending).
- **Usecase**: The "Promise Ledger" feature that holds management accountable over multiple years.

---

## 4. Decision Engine & Snapshots

### `quarterly_snapshots`
- **Significance**: **The "Time-Travel" Archive.** Stores the full state of an AI decision for a specific quarter.
- **Key Columns**: `quarter`, `actionable_verdict`, `conviction_score`, `summary`.
- **Usecase**: Allows users to see exactly why they bought/sold a stock in the past, based on the data available *at that time*.

### `stock_tracking_profiles`
- **Significance**: User-specific configuration for how a stock should be tracked.
- **Key Columns**: `tracking_status`, `conviction_level`, `alert_thresholds`.
- **Usecase**: Customizing the experience for individual portfolios.

---

## 5. Event & Secondary Data

### `corporate_announcements`
- **Significance**: Real-time news feed from BSE/NSE.
- **Key Columns**: `title`, `summary`, `impact` (Positive/Negative), `is_earnings_release`, `result_date`.
- **Usecase**: Triggering Telegram alerts and detecting upcoming earnings result dates.

### `shareholding`
- **Significance**: Tracking Promoter, FII, and DII ownership trends.
- **Key Columns**: `quarter`, `promoters`, `fiis`, `diis`, `pledged`.
- **Usecase**: Powering the Ownership Trend analysis in the prompt and UI.

### `financial_metrics`
- **Significance**: Secondary financial data (Screener.in fallback).
- **Key Columns**: `pe_ratio`, `industry_pe`, `market_cap`, `dividend_yield`.
- **Usecase**: Providing valuation context and TTM (Trailing Twelve Months) fallbacks for Balance Sheet items.

---

## 6. Utilities & Tracking

### `filing_drive_links`
- **Significance**: Mapping stocks/quarters to their backed-up PDF files in Google Drive.
- **Key Columns**: `quarter`, `drive_web_link`.
- **Usecase**: Direct "View PDF" links in the stock detail page.

### `bulk_deals` & `insider_trades`
- **Significance**: Tracking large-scale market transactions.
- **Usecase**: Detecting if institutional investors or promoters are buying/selling in the open market.

### `sector_indices`
- **Significance**: Benchmarking stock performance against its relevant Nifty sector.
- **Usecase**: Visualizing relative strength in charts.
