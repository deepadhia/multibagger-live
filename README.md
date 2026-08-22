# MULTIBAGGER LIVE — PORTFOLIO INTELLIGENCE & THESIS GOVERNANCE PLATFORM

```text
========================================================================================
 STATUS: FROZEN / PRODUCTION RESEARCH TOOL (CERTIFIED HISTORICAL REPLAY)
========================================================================================

PURPOSE:
Quarterly investment thesis monitoring and ADD / HOLD / REVIEW / EXIT decision support.

WHAT THIS IS:
• Point-in-time thesis governance assistant
• Systematic fundamental deterioration filter & downside guardrail
• Historical point-in-time evidence reconstruction and audit tool

WHAT THIS IS NOT:
• Automated algorithmic trading system
• Guaranteed market-timing alpha generator (p = 0.357, fail to reject null)
• Standalone investment advice

HISTORICAL VALIDATION & PROVENANCE:
• Evaluation Period: 2024-01-01 → 2026-08-18 (653 Trading Sessions)
• Universe: 20 Focus Indian Midcap / Smallcap Compounders
• Verification: 55/55 Layer-2 Independent Gates | 25/25 Mutation Tests PASS
• Layer-3 Decision Quality: 20/20 Independent Verification Gates PASS
• Acceptance Suite: 8/8 Fundamental Investment Archetypes PASS
• Regression Suite: SJS Walter Pack M&A Denominator Flaw 100% PASS

PRIMARY STRENGTH:
Fundamental thesis monitoring & early multibagger discovery (64.2% ADD accuracy, 61.5% HOLD accuracy).

PRIMARY WEAKNESS:
Premature TRIM/GATE decisions on cyclical single-quarter margin dips (37.5% accuracy; ₹74.86L opportunity cost).

OPERATING RULES:
1. ADD / HOLD = Actionable fundamental research signals.
2. TRIM / REVIEW = Flag for mandatory human review; DO NOT execute automatic sales.
3. EXIT / KILL = Structural thesis invalidation only (e.g. governance failure, persistent multi-quarter margin collapse).
4. UNKNOWN = Insufficient point-in-time data; DO NOTHING (never convert UNKNOWN → HOLD).

NO FURTHER MODEL / INFRASTRUCTURE DEVELOPMENT PLANNED
UNTIL SUFFICIENT NEW LIVE QUARTERLY DATA ACCUMULATES.
========================================================================================
```

---

## 🚀 Core Architecture Overview

The platform operates on an institutional evidence architecture designed to prevent hallucination, eliminate lookahead bias, and separate business reality from stock price fluctuations.

```text
       QUARTERLY FILING / AGM / CONCALL TRANSCRIPT
                            ↓
                    MANAGEMENT CLAIM
  (Exact Quote, Lineage, Thesis Driver, Expected Timeframe, Measurable Target)
                            ↓
  ┌───────────────────────────────────────────────────┐
  │ EPISTEMIC GUARDRAIL: Claim ≠ Operating Reality    │
  │ (Management optimism CANNOT increase conviction)  │
  └─────────────────────────┬─────────────────────────┘
                            ↓
               PRIMARY OPERATING AUDIT
  (Revenue, PAT, Margins, Spreads, Order Intake, Capacity Intimation, Cash Flow)
                            ↓
            CLAIM-TO-DELIVERY RECONCILIATION
  (NEW ➔ REAFFIRMED ➔ DELIVERED ➔ DELAYED ➔ MISSED ➔ WITHDRAWN/CHANGED)
                            ↓
  ┌───────────────────────────────────────────────────┐
  │ LONGITUDINAL CLAIM CREDIBILITY LEDGER             │
  │ • Single Temporary Miss + Plausible Rationale     │
  │ • Repeated Misses + Shifting Excuses = Decay      │
  └─────────────────────────┬─────────────────────────┘
                            ↓
  ┌───────────────────────────────────────────────────┐
  │ 4-QUESTION DECISION JOURNAL FRAMEWORK             │
  │ 1. Is the underlying thesis intact?               │
  │ 2. Is the market punishment reason resolving?     │
  │ 3. Are management milestones being delivered?     │
  │ 4. Does current valuation leave asymmetry?        │
  └─────────────────────────┬─────────────────────────┘
                            ↓
              CANONICAL EVIDENCE STATES
  • 🟢 ADD (Accumulate / Underwrite)
  • 🟢 HOLD (Thesis Intact — Allow Compounding)
  • 🟡 REVIEW / TRIM (Manual Inspection Flag)
  • 🔴 EXIT / KILL (Structural Invalidation)
```

---

## 🏛️ Key System Layers

### 1. V12 High-Conviction Truth Layer
- **Deep XBRL Hybrid Engine**: Ingests official exchange XML/PDF filings, extracting balance sheet drivers (**Trade Receivables, Inventory, Borrowings, Cash & Bank, Operating Cash Flow, Capex, Gross Block**).
- **Canonical Normalization**: Standardizes and scales all metrics to Crores with mathematical reconciliation checks.
- **Strict Point-in-Time Causality**: All decisions at timestamp $T_S$ are strictly bound to evidence published at $T_E \le T_S$ (Zero Lookahead Invariant).

### 2. 4-Layer Institutional Falsification Engine
- **Layer 1 (Evidence Layer)**: Ingests LODR filings, concall transcripts, and investor presentations with immutable provenance.
- **Layer 2 (Falsification Layer)**: Hard kill-switch triggering structural exit when foundational thesis drivers break.
- **Layer 3 (Root-Cause Deduplication)**: Consolidates correlated downstream symptoms (e.g. Plant Delay + Revenue Delay + OPM Compression) into a single root cause rather than double-penalizing.
- **Layer 4 (Management Credibility & Anti-Bias Audit)**: Tracks historical commitment fulfillment per management team. Teams with repeated guidance misses incur Credibility Decay Penalties (`CREDIBILITY_DECAY -30%`).

### 3. Version B Valuation Expectations Engine
- **Lens 1 (Historical Distribution)**: Evaluates point-in-time trailing P/E against rolling 3Y/5Y/7Y distributions with strict listing depth guards ($<500$ days $\rightarrow$ `INSUFFICIENT_HISTORY`).
- **Lens 2 (Market-Implied Expectations)**: Computes the exact 3-year EPS CAGR required by the current stock price across terminal exit multiples (25x, 30x, 35x).
- **Expectation Asymmetry**: Evaluates $\text{Evidence Growth} - \text{Market-Implied CAGR}$ to govern sizing and prevent premature exits on high-growth M&A compounders (e.g. SJS Walter Pack integration).

---

## 🧪 Production Test & Verification Suites

The repository contains 5 canonical, zero-dependency Node.js verification suites:

```bash
# 1. Final 8-Archetype Investment Acceptance Test Suite (8/8 PASS)
node scripts/test_8_archetypal_acceptance_cases.js

# 2. SJS Walter Pack M&A Denominator Flaw Regression Test (4/4 PASS)
node scripts/test_sjs_walter_pack_valuation_regression.js

# 3. Layer-2 Independent Certifier (55 Gates | 25 Mutations PASS)
node scripts/certify_historical_replay.js

# 4. Layer-3 Research Quality Certifier (20 Gates PASS)
node scripts/certify_research_quality.js

# 5. Master 18-Phase Forensic Replay & Reconciliation Pipeline
node scripts/run_forensic_replay_and_verify.js
```

---

## 💻 Tech Stack & Local Setup

### Tech Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js / Express + Supabase (Postgres with RLS)
- **Data Pipelines**: Official NSE/BSE XBRL Engine + PDF Transcript Map-Reduce Parser
- **Charts & Visualization**: Recharts + TanStack React Query

### Prerequisites
- Node.js (v18+)
- Supabase CLI & Docker

### Setup Instructions
```bash
# 1. Install dependencies
npm install

# 2. Start local Supabase instance
supabase start

# 3. Configure environment
# Copy .env.example to .env.local and update SUPABASE keys

# 4. Run development server
npm run dev
```

---

## 📋 Database Architecture

Key database tables with Row Level Security (RLS) enabled:

| Table | Description |
| :--- | :--- |
| `stocks` | Portfolio universe with thesis & tracking directives |
| `prices` | Daily corporate-action adjusted price history |
| `xbrl_filings` | Statutory quarterly & annual exchange filing records |
| `xbrl_metrics_quarterly` | Deep normalized XBRL balance sheet & P&L metrics |
| `financial_results` | Consolidated quarterly financial performance |
| `financial_metrics` | Multi-year annual financial metrics (ROCE, ROE, FCF) |
| `management_promises` | Tracked management commitments & fulfillment status |
| `transcript_analysis` | Concall transcript extraction & credibility scoring |
| `corporate_announcements` | Real-time BSE/NSE corporate actions and LODR filings |

---

## 📄 License & Status

**Status**: FROZEN / PRODUCTION RESEARCH TOOL  
**Epistemic Classification**: `HISTORICAL_SIMULATION_CERTIFIED`  
**License**: Private / Proprietary
