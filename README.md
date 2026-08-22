# 🏛️ MULTIBAGGER LIVE — QUARTERLY FUNDAMENTAL THESIS WATCHDOG

```text
========================================================================================
 STATUS: FROZEN GOVERNANCE V1.0 (PRODUCTION THESIS WATCHDOG)
========================================================================================

PRODUCT DEFINITION:
A point-in-time research system that tracks whether the fundamental thesis of each 
portfolio/watchlist company is strengthening, intact, weakening, or broken based on 
quarterly financials, management execution, order book/business developments, 
balance-sheet changes, and previously stated commitments.

CORE OPERATING QUESTION:
"If I were deciding whether to own this company today, is the original reason
I bought it MORE credible, EQUALLY credible, or LESS credible than 3 months ago?"

WHAT THIS IS:
• Point-in-time fundamental thesis watchdog & quarterly governance assistant
• Systematic business deterioration filter & downside guardrail
• Historical point-in-time evidence reconstruction and audit tool
• Clear separation between Business Thesis State and Valuation Context

WHAT THIS IS NOT:
• NOT an automated algorithmic trading engine
• NOT a stop-loss / trailing-exit price generator
• NOT a price-timing or entry/exit optimizer
• NOT a historical backtest optimization toy

THE TWO INDEPENDENT LENSES:
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ 1. BUSINESS THESIS STATE (Did the reason I own this company change?)                 │
│    • 🟢 STRENGTHENING: Specific evidence supporting the core growth catalyst surged.  │
│    • 🟢 INTACT: Original thesis is working; no material deterioration.               │
│    • 🟡 WATCH: Temporary margin friction, 1-quarter noise, or evidence quality gap.  │
│    • 🟠 AT RISK: Multiple structural pillars deteriorating (e.g. margin collapse).   │
│    • 🔴 BROKEN: Original thesis demonstrably invalidated.                            │
│    • ⚪ INSUFFICIENT EVIDENCE: Missing statutory disclosure (Never invent data).     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ 2. VALUATION CONTEXT (What expectations are already priced in?)                      │
│    • Cheap / Deep Value Dislocation                                                  │
│    • Fair / Re-rated Multiple                                                        │
│    • Expensive / Priced for Perfection                                               │
│    • Vulnerable / Multiple Squeeze                                                   │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ 3. HUMAN CAPITAL ALLOCATION DECISION                                                 │
│    • Strengthening + Fair/Cheap  ➔ Consider adding capital                           │
│    • Strengthening + Expensive   ➔ Hold core position; do not chase at ATH           │
│    • Intact + Fair/Cheap         ➔ Maintain core allocation to compound              │
│    • At Risk                     ➔ Stop adding capital; review for turnaround        │
│    • Broken                      ➔ Exit candidate                                    │
└──────────────────────────────────────────────────────────────────────────────────────┘
========================================================================================
```

---

## 🚀 Core Architecture: The 4 Ingestion Engines & Quarterly Watchdog

The platform operates on 4 specialized data pipelines and a point-in-time comparison engine:

```text
               Exchange Disclosures (LODR / Concalls / XBRL)
                                     │
                                     ▼
                             Point-in-Time Data
                                     │
                                     ▼
                        Evidence Extraction Engines
                 (NIM Llama 3.1 + Financial Validator)
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  1. Fundamental Thesis Engine                           │
        │     "Is the original reason for owning the company      │
        │      more, equally, or less credible than 3 months ago?"│
        │     🟢 Strengthening / 🟢 Intact                         │
        │     🟡 Watch / 🟠 At Risk / 🔴 Broken                    │
        │     Confidence: 🟢 High / 🟡 Needs Validation           │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  2. Valuation Context (Context Only, Not a Signal)      │
        │     "What expectations are already priced in?"          │
        │     (e.g., Deep Value, Fair, Priced for Perfection)     │
        └────────────────────────────┬────────────────────────────┘
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  3. Human Capital Allocation Decision                   │
        │     • Add / Hold Core / Gate New Capital / Review Exit  │
        └─────────────────────────────────────────────────────────┘
```

---

## 🖥️ Server Deployment & Nightly Reconciliation Cron

The platform runs continuously on the production Oracle Cloud Server. All scheduled crons run **on the server**, not on GitHub Actions.

### 1. In-Process 24/7 Server Daemon (Recommended)
Starting the Express server automatically arms the in-process nightly scheduler ([`backend/services/nightly-scheduler.service.js`](file:///f:/Personal%20Projects/multibagger-live/backend/services/nightly-scheduler.service.js)):
```bash
# Start backend server via PM2 or node:
npm run server
# or in dev mode:
npm run server:dev
```

### 2. Standalone System Crontab (Server Crons)
If running via Linux system crontab on the production server (`crontab -e`):

```bash
# 🌙 1. Nightly Price Refresh & Ingestion Cron (Every night at 23:30 IST / 18:00 UTC)
30 23 * * * cd /path/to/multibagger-live && npm run reconcile:nightly >> /var/log/reconciliation.log 2>&1

# 🏛️ 2. Bi-Monthly / Quarterly Thesis Watchdog Review (Runs on the 15th of post-earnings months: Feb, May, Aug, Nov at 02:00 IST)
0 2 15 2,5,8,11 * cd /path/to/multibagger-live && npm run watchdog:quarterly >> /var/log/watchdog_quarterly.log 2>&1

# ⏱️ 3. Alternative: Bi-Monthly Schedule (Runs on the 1st of every 2nd month at 02:00 IST)
0 2 1 */2 * cd /path/to/multibagger-live && npm run watchdog:quarterly >> /var/log/watchdog_quarterly.log 2>&1
```

### 3. What the Server Executes Every Night at 23:30 IST
1. **Daily Price Refresh**: Refreshes closing prices and computes trailing 365-day Rolling 52W Highs/Lows in PostgreSQL.
2. **Asynchronous Gap Reconciler**: Ingests concall transcripts & presentations filed days after board results.
3. **Announcement & AGM Scanner**: Ingests LODR filings across NSE + BSE (`Analyst / Investor Meet`, `Company Update`, `Result`, etc.).
4. **Multi-Year Growth Catalyst Audit**: Identifies major order wins and 2-year revenue roadmaps.
5. **Idempotent Morning Digest**: Deduplicates alerts using SHA-256 hashes; sends a clean morning digest to Telegram with zero repetitions.

### 4. What the Server Executes During Quarterly/Bi-Monthly Reviews
1. **Driver Contract Evaluation**: Re-evaluates 3–6 explicit drivers per stock against freshly filed quarterly financials.
2. **Falsification Trigger Testing**: Tests live metrics against explicit threshold kill-switches (e.g. margin floors, volume milestones).
3. **Layer 4 Capital Allocation Matrix**: Filters universe by 52W high consolidation depth, unit margin quality (>10% EBITDA), and debt trends.
4. **Automated Regression Test Run**: Executes the 4-layer invariant test suite (Thesis State, Contracts, Replay, Drawdown Validation) to verify 100% compliance.

---

## 📊 Live Master Watchdog Report Generation

To generate the comprehensive 18-stock quarterly thesis review & capital allocation matrix at any time:
```bash
npm run watchdog:quarterly
```
This automatically updates:
- [`reports/thesis_board/CAPITAL_ALLOCATION_ACTIONABILITY_FRAMEWORK_18_STOCKS.md`](file:///f:/Personal%20Projects/multibagger-live/reports/thesis_board/CAPITAL_ALLOCATION_ACTIONABILITY_FRAMEWORK_18_STOCKS.md)
- [`reports/thesis_board/FALSIFIABLE_THESIS_TRACKING_FRAMEWORK.md`](file:///f:/Personal%20Projects/multibagger-live/reports/thesis_board/FALSIFIABLE_THESIS_TRACKING_FRAMEWORK.md)
- [`reports/thesis_board/DRIVER_LEVEL_THESIS_CONTRACTS_18_STOCKS.md`](file:///f:/Personal%20Projects/multibagger-live/reports/thesis_board/DRIVER_LEVEL_THESIS_CONTRACTS_18_STOCKS.md)
- [`reports/thesis_board/capital-allocation-actionability-framework.json`](file:///f:/Personal%20Projects/multibagger-live/reports/thesis_board/capital-allocation-actionability-framework.json)

---

## 🛡️ Verified Universe Data Quality

- **Total Files Audited**: 587 statutory filings across 20 focus compounders (`FY24-Q1` through `FY27-Q1`).
- **Binary Integrity**: 479 valid binary `%PDF` documents, 108 valid XBRL `<?xml` documents.
- **Data Quality**: 0 corrupted files, 0 zero-byte placeholders, 0 unparsed HTML error redirects.

---

## 🧪 Production Test & Verification Suites

The repository contains canonical, zero-dependency Node.js verification suites:

```bash
# 1. 4-Pipeline Live Ingestion Audit (News, Transcripts, XBRL, Order Wins)
node scripts/test_all_4_ingestion_pipelines.js

# 2. Negative Control Firewall (9/9 PASS)
node scripts/test_negative_control_firewall.js

# 3. Adversarial Integrity Suite (5/5 PASS)
node scripts/test_adversarial_integrity_suite.js

# 4. Binary Data Integrity & Corruption Audit (587/587 Files Verified)
node scratch/verify_sync_integrity.js
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
