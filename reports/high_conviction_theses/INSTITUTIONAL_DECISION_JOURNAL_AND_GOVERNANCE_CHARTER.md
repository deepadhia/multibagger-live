# Institutional Decision Journal & Engine Governance Charter

**Effective Date**: August 18, 2026  
**Status**: ENGINE STATUS: FROZEN BY DEFAULT 🔒  
*(No modifications permitted unless one of the four formally defined governance triggers A–D is satisfied).*  
**Scope**: High-Conviction Fundamental Thesis Engine, Valuation Asymmetry Layer, & Quarterly Decision Journal

---

## 1. Engine Freeze & Modification Governance Triggers

The core engineering architecture is **frozen by default**. No new scoring engines, AI prompts, ranking heuristics, momentum indicators, technical filters, or automated backtesters may be constructed.

Modifications to the underlying codebase are strictly prohibited **except under four explicit governance triggers**:

### 🔴 Condition A: Proven Decision-Process Failure
- A capital decision is eligible for modification review when subsequent evidence demonstrates that the decision was **inconsistent with the information, valuation state, thesis evidence, management commitments, or explicit risk rules that were already available at the exact checkpoint date ($T_0$).**
- *Critical Epistemic Constraint*: Subsequent price/earnings outcomes may be used to identify the failure, but **must not themselves constitute proof that the original decision was wrong.** A bad short-term price outcome following a sound, rule-compliant underwriting decision is market noise, not an engineering defect. Conversely, a flawed decision that got bailed out by market speculation remains a process defect.

### Condition B: Repeated Structural Failure Pattern
- A recurring failure pattern observed across $\ge 5$ separate equities (e.g., systematic inability to detect a specific balance-sheet contagion across the universe, or recurring intermediate overvaluation multiple compressions).

### Condition C: Data-Quality & Epistemic Corruption
- Factual errors in statutory data: wrong EPS, inaccurate filing dates, forward leakage, or flawed management commitment extraction.

### Condition D: Epistemic Unexplainability
- The system produces an action whose causal derivation cannot be mathematically or logically reconstructed from the input metrics.

---

## 2. Objective Decision Evaluation Rubric (Decoupling Process from Outcome)

To enforce institutional intellectual honesty, every historical audit and future quarterly review must strictly grade decisions against the $T_0$ process rubric, with subsequent outcomes recorded separately:

### Table 2A: T0 Decision-Process Quality Rubric (Evaluated Immediately at $T_0$)

| Process Verdict | Canonical Epistemic Definition |
| :--- | :--- |
| 🟢 **Correct Process** | The decision was **fully consistent with $T_0$ evidence, valuation state, thesis state, and explicit governance rules.** |
| 🟡 **Acceptable Process** | The decision was **defensible and rule-compliant**, but the $T_0$ evidence supported another permitted action more strongly under the documented decision framework. |
| 🔴 **Wrong Process** | The decision **violated an explicit rule, ignored a material $T_0$ contradiction, or produced an action inconsistent with its stated inputs.** |

### Table 2B: Investment Outcome Maturity Status (Tracked Over Time)

| Outcome Status | Canonical Definition |
| :--- | :--- |
| **4Q Realized** | Full 4-quarter forward price return, max drawdown, and EPS compounding verified. |
| **2Q Realized (Pending 4Q)** | 2 quarters of forward data observed; awaiting full 4Q horizon. |
| **1Q Realized (Pending 4Q)** | 1 quarter of forward data observed; awaiting full 4Q horizon. |
| **PENDING (Current Checkpoint)** | Checkpoint at latest quarter; forward market outcome active and pending. |

```text
┌────────────────────────────────────────────────────────────────────────────┐
│              PROCESS VS OUTCOME SEPARATION MATRIX                          │
├─────────────────────────┬──────────────────────────────────────────────────┤
│ Dimension A             │ Was the decision justified by the evidence,      │
│ DECISION-PROCESS QUALITY│ valuation state, and risk rules available at T0? │
├─────────────────────────┼──────────────────────────────────────────────────┤
│ Dimension B             │ What happened afterward across 1Q, 2Q, and 4Q    │
│ INVESTMENT OUTCOME      │ (forward return, max drawdown, EPS compounding)? │
└─────────────────────────┴──────────────────────────────────────────────────┘
```

- **Sound Process $\to$ Adverse Short-Term Outcome**: (e.g., strong thesis, attractive valuation, but stock suffers $-20\%$ drawdown due to temporary market clearing) $\ne$ **Wrong Decision**. Graded `🟢 Correct Process` if underwriting was sound.
- **Flawed Process $\to$ Favorable Outcome**: (e.g., holding through an extreme $85\times$ P/E bubble with zero expectation gap because the stock kept climbing) $\ne$ **Correct Decision**. Graded as a process defect requiring review.

---

## 3. The $T_0$ Evidence Lock Control

To ensure absolute historical integrity and eliminate hindsight bias, every quarterly checkpoint enforces a permanent **$T_0$ Evidence Lock**:

```text
                           T0 CHECKPOINT DATE
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
         [ DECISION RECORD ]               [ T0 EVIDENCE LOCK ]
         • Capital Action                  • Real Close Price & P/E
         • Allocation (bps)                • Reported XBRL Financials & EPS
         • Sizing Bounds                   • Management Commitments & Deadlines
         • Action Narrative                • Thesis Causal Bucket States
                  │                        • Documented Valuation Ceiling
                  │                        • Expected CAGR & Expectation Gap
                  │                                 │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                         [ SUBSEQUENT REALITY ]
                         • 1Q / 2Q / 4Q Realized Price Returns
                         • Actual Statutory EPS Growth & ROCE
                         • Observed Milestone Delivery Dates
                         • Realized Maximum Drawdown
                                   │
                                   ▼
                     [ POST-MORTEM AUDIT VERDICT ]
                     • Process Quality (T0 Justification)
                     • Investment Outcome (Forward Tracking)
```

**Immutable Rule**: Post-$T_0$ evidence or hindsight price movements must **never modify the original $T_0$ Evidence Lock record**.

---

## 4. Position Sizing, Valuation Hierarchy & Capital Governance Rules

The declared allocation bands are **human-defined policy risk constraints**, not empirically optimized parameters:

| Action Code | Portfolio Sizing Policy | Position Allocation Band | Governance & Capital Execution Rules |
| :--- | :--- | :---: | :--- |
| **`ACCUMULATE_CONVICTION`** | **Full Weight Accumulation** | **6.0% – 10.0%** (Max Target: 10%) | **Mandatory Capital Rule**: An intact thesis and attractive valuation are necessary but *not sufficient* for ADD. The committee must additionally establish that observed price/multiple changes are consistent with thesis progression rather than unresolved expectation clearing or emerging contradiction. Deploy **150–250 bps** per quarter.<br>**Hard Max Cap Rule**: Incremental deployment is *always capped at the portfolio maximum (10.0%)*. No quarterly ADD may cause a position to exceed its 10.0% target allocation (e.g. if current weight is 9.0%, an ADD signal requests only the residual +100 bps). |
| **`CORE_HOLD`** | **Let Winners Run (Zero New Capital)** | **Held at Current Weight** (Cap at 15%) | **0 bps** incremental capital. Cease purchases. Reinvest cash flows elsewhere. Do not trim unless P/E exceeds the documented company-specific ceiling or thesis breaks. |
| **`PRUDENT_TRIM`** | **Systematic De-Risking** | **Reduce by 25% – 50%** (Trim to $\le 4.0\%$) | **Valuation Ceiling Hierarchy**: Valuation ceilings are *thesis-specific and documented at $T_0$* (e.g., LUMAX $50\times$, INOX $45\times$, TIMETECHNO $25\times$). The universal $80\times / 90\times$ thresholds serve as *extreme-bubble fallbacks* and do not override a lower company-specific ceiling.<br>**Observation Zone**: Intermediate overvaluation ($40\times–75\times$) remains under active observation. Sell **25%** if $\text{P/E} > 80\times$, sell an additional **25%** if multiple expands to $90\times$ without matching EPS acceleration. |
| **`PAUSE_ADDITIONS`** | **Capital Gate Closed** | **Freeze Position Weight** | **0 bps** incremental capital. Retain core position until unverified metric or milestone delay resolves. |
| **`SYSTEMATIC_EXIT`** | **Complete Capital Liquidation** | **0.0% (Immediate Liquidation)** | **100% exit within 2 trading sessions** upon `BROKEN` status. Zero tolerance for structural failure or cash trap deterioration. |

---

## 5. The 9-Step Quarterly Decision Journal Workflow

At each subsequent quarterly earnings release, the investment committee executes this standard 9-step ledger entry:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│              QUARTERLY INSTITUTIONAL DECISION JOURNAL LEDGER            │
├──────────────────────────────────────────────────────────────────────────┤
│ 1. Company & Ticker       : [e.g. LUMAXTECH]                             │
│ 2. What We Believed (T0)  : [Initial Underwritten Core Thesis & CAGR]    │
│ 3. Supporting Evidence    : [Observed Statutory XBRL & Concall Delivery] │
│ 4. Falsification Triggers : [Explicit Break Thresholds & Ceilings]      │
│ 5. Engine Decision (T0)   : [ACCUMULATE / CORE_HOLD / TRIM / EXIT / PAUSE│
│ 6. Why Allocate Capital Now?: [Thesis strengthening? Earnings leverage? │
│                             Valuation dislocation? Why not wait 1Q?]    │
│ 7. Actual Committee Action: [Capital Deployed / Weight Adjusted in Bps] │
│ 8. Subsequent Reality     : [1Q / 2Q / 4Q Operating & Price Outcome]     │
│ 9. Post-Mortem Assessment : [Process Quality: 🟢 Correct / 🟡 Acceptable]│
│                             [Investment Outcome: Forward Return / Max DD]│
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Active Forward Monitoring Cohort (15 Pending Checkpoints: Q4 FY26 – Q1 FY27)

The following 15 decisions currently have status `⚫ PENDING — insufficient forward horizon (pending 4Q realization)` and form the active forward monitoring cohort:

| Ticker | Checkpoint Quarter | Checkpoint Date | Real Price | P/E | Action Taken | Primary Metric Under Active Observation |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`ANANTRAJ`** | `Q4_FY26` | 2026-05-20 | ₹488.70 | 19.5x | `ACCUMULATE` | 50 MW Data Center Phase 2 lease conversion & annuity EBITDA |
| **`ANANTRAJ`** | `Q1_FY27` | 2026-08-17 | ₹627.55 | 23.7x | `ACCUMULATE` | 100 MW operational IT load commissioning |
| **`TIMETECHNO`** | `Q1_FY27` | 2026-08-17 | ₹189.61 | 10.2x | `ACCUMULATE` | Type-IV composite cylinder dispatches & net-debt zero milestone |
| **`GRAVITA`** | `Q4_FY26` | 2026-05-20 | ₹1615.30 | 26.9x | `ACCUMULATE` | Mundra aluminum/rubber vertical scale & VAP $>60\%$ |
| **`GRAVITA`** | `Q1_FY27` | 2026-08-17 | ₹1821.70 | 28.5x | `ACCUMULATE` | RMIL copper synergy realization & lead EBITDA/MT |
| **`CCL`** | `Q4_FY26` | 2026-05-20 | ₹1096.00 | 28.1x | `ACCUMULATE` | Domestic B2C branded coffee run-rate ($>₹500\text{ Cr}$) |
| **`CCL`** | `Q1_FY27` | 2026-08-17 | ₹1130.40 | 26.3x | `ACCUMULATE` | Vietnam Phase 2 volume absorption & blended EBITDA/kg |
| **`INOXINDIA`** | `Q4_FY26` | 2026-05-20 | ₹1449.20 | 38.6x | `ACCUMULATE` | Savli Phase 2 container expansion dispatches |
| **`INOXINDIA`** | `Q1_FY27` | 2026-08-17 | ₹1950.80 | 48.8x | `ACCUMULATE` | Order backlog conversion from record ₹1,686 Cr |
| **`HBLENGINE`** | `Q4_FY26` | 2026-05-20 | ₹767.65 | 19.7x | `ACCUMULATE` | Western DFC Kavach commissioning |
| **`HBLENGINE`** | `Q1_FY27` | 2026-08-17 | ₹674.60 | 16.1x | `ACCUMULATE` | Multi-thousand km Indian Railways Kavach rollout dispatches |
| **`JYOTICNC`** | `Q4_FY26` | 2026-05-20 | ₹669.95 | 29.8x | `ACCUMULATE` | Localized component integration & ₹3,650 Cr backlog conversion |
| **`JYOTICNC`** | `Q1_FY27` | 2026-08-17 | ₹857.95 | 35.7x | `ACCUMULATE` | New generation 5-axis commercial deliveries |
| **`SKIPPER`** | `Q4_FY26` | 2026-05-20 | ₹464.15 | 17.5x | `ACCUMULATE` | Working capital cycle compression ($<75\text{ days}$) |
| **`SKIPPER`** | `Q1_FY27` | 2026-08-17 | ₹530.70 | 18.3x | `ACCUMULATE` | Global grid HVDC transmission dispatches |

---

## 7. Institutional Decision Journal Entries (Active Process Defect Candidates)

### 📌 Case #1: `TRANSRAILL` (Transrail Lighting) — Q2 FY26 Checkpoint Audit (Condition A Candidate)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               DECISION JOURNAL ENTRY: TRANSRAIL LIGHTING (TRANSRAILL)                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Checkpoint Date        : Q2 FY26 (November 2025)                                    │
│ 2. Available Evidence (T0): Revenue ₹1,561 Cr (+43% YoY), Order Book ₹14,654 Cr,      │
│                             EBITDA Margin 12.1% (>11% floor), P/E ~19.5x.              │
│ 3. Critical Contradiction : Statutory CFO turned -₹27.19 Cr (Negative), Total          │
│                             Borrowings increased from ₹604.9 Cr to ₹722.5 Cr (+19%),   │
│                             Receivables expanded to ₹1,474.6 Cr.                       │
│ 4. Frozen Engine Output   : ACCUMULATE_CONVICTION (Triggered by intact thesis & P/E).  │
│ 5. Post-Mortem Finding    : ⚠️ PROCESS QUALITY DEFECT CANDIDATE (Condition A).         │
│ 6. Empirical Observation  : The engine produced ACCUMULATE despite negative CFO,       │
│                             rising receivables, and increased borrowings. The precise   │
│                             causal contribution of each input remains under            │
│                             observation.                                               │
│ 7. Correct Committee Posture: PAUSE_ADDITIONS (0 bps fresh capital deployed; hold     │
│                             existing position while cash conversion normalizes).       │
│ 8. Structural Threshold   : Isolated Case #1. Remains under observation zone.          │
│                             Requires ≥5 independent companies exhibiting this pattern  │
│                             before triggering a formal Condition B engine review.      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Final Operational Mandate: The Engineering Machine Is Locked

The engineering build phase is officially closed. The system operates strictly as an institutional governance instrument. The goal is not to optimize entry/exit timing, build momentum indicators, or invent new scores, but to **faithfully record $T_0$ evidence, enforce root-cause falsification, and verify multi-year capital compounding against quarterly statutory reality.**
