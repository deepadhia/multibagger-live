# SYSTEM CONTRACT V1: High-Conviction Long-Term Investment Intelligence Engine

**Status**: FROZEN ARCHITECTURAL CONTRACT & CANONICAL SPECIFICATION  
**Scope**: Production Decision Support & Asymmetric Long-Term Mispricing Discovery  
**Author**: Antigravity Quantitative Engineering Core  

---

## 1. Prime Directive & Objective Function

The core objective of this system is **NOT** to be a short-term trading engine, technical momentum scanner, or formulaic financial screener.

The sole objective function is:
> **Given strictly Point-in-Time information knowable at time $T_0$, determine whether the market price is asymmetrically mispriced relative to the business quality, earnings trajectory, management execution credibility, and cash generation power — and subsequently track whether the fundamental business thesis is STRENGTHENING, remaining INTACT, coming UNDER PRESSURE, or being STRUCTURALLY FALSIFIED across successive quarterly filings.**

---

## 2. Canonical Pipeline Architecture

The system operates across a single, unidirectional canonical pipeline:

```text
                           RAW DATA (Filings, Concalls, Prices)
                                             │
                                             ▼
                                  [GATE 1: PIT TRUTH]
                 (Filing Date, Announce Date, Zero Forward-Leaking Bias)
                                             │
                                             ▼
                            [GATE 2: EVIDENCE & PROVENANCE]
                   (Required vs Observed Evidence, Coverage Metric)
                                             │
                                             ▼
                          [GATE 3: 5 ORTHOGONAL CAUSAL BUCKETS]
                    (DEMAND ⊗ EXECUTION ⊗ ECONOMICS ⊗ CASH ⊗ MGMT)
                                             │
                                             ▼
                        [GATE 4: TWO-DIMENSIONAL DECOUPLING]
                        ┌────────────────────┴────────────────────┐
                        ▼                                         ▼
              [THESIS HEALTH STATE]                     [VALUATION STATE]
             • STRENGTHENING                           • ATTRACTIVE
             • INTACT                                  • REASONABLE
             • UNDER_PRESSURE                          • FULL
             • BROKEN                                  • EXTREME
                        │                                         │
                        └────────────────────┬────────────────────┘
                                             ▼
                                  [CAPITAL ACTION SYNTHESIS]
                                  • ACCUMULATE_CONVICTION
                                  • CORE_HOLD
                                  • PAUSE_ADDITIONS
                                  • PRUDENT_TRIM
                                  • SYSTEMATIC_EXIT
                                             │
                                             ▼
                               [LONGITUDINAL REPLAY & AUDIT]
                                (Lead Time, Drawdowns, Retention)
```

---

## 3. Core Structural Invariants (Non-Negotiable)

### Invariant 1: Strict Point-in-Time Epistemic Boundary
- No metric, statement, or price timestamped $> T_n$ may enter a decision made at $T_n$.
- All financial metrics must use the official statutory exchange filing date (`filing_date`), not the period end date (`period_end_date`).
- Zero lookahead bias.

### Invariant 2: Complete Decoupling of Business Quality from Market Valuation
- **`THESIS_HEALTH`** is a pure fundamental property of the operating enterprise:
  $$\text{Thesis Health} = f(\text{Demand}, \text{Execution}, \text{Economics}, \text{Cash}, \text{Management Credibility})$$
- **`VALUATION_STATE`** is a market pricing property:
  $$\text{Valuation State} = g(\text{Market Price}, \text{Current Normalized Earnings}, \text{Realistic Multi-Year Trajectory}, \text{Expectation Gap})$$
- An expensive stock **NEVER** invalidates an outstanding business thesis. It triggers a `PRUDENT_TRIM`, not a `BROKEN` thesis classification.

### Invariant 3: Causal Bucket Orthogonality (Anti-Double-Counting)
- Evidence must be aggregated across 5 independent causal pillars:
  1. `DEMAND`: Order intake, backlog, market share, customer additions.
  2. `EXECUTION`: Capacity commissioning, volume ramp-up, product mix conversion.
  3. `ECONOMICS`: Gross margin expansion, EBITDA operating leverage, ROCE.
  4. `CASH`: CFO/PAT cash conversion, working capital cycle, debt containment.
  5. `MANAGEMENT`: Milestone delivery, conservative guidance vs divergent rhetoric.
- Multiple confirmations or milestones within a single bucket are rewarded once per bucket ($+0.05$ max per unique bucket).

### Invariant 4: Evidence Observability Contract
- Every thesis assumption $A_i$ must explicitly define:
  - `requiredEvidence`: Array of observable metric keys.
  - `observedEvidence`: Array of verified empirical values at $T_n$.
  - `coverage`: Ratio $\frac{|\text{observedEvidence}|}{|\text{requiredEvidence}|}$.
- If coverage $< 1.0$ and critical metrics are unobservable, status is **`UNKNOWN`** or **`WATCH`**, never presumed `CONFIRMED`.

### Invariant 5: Constrained Temporary vs Structural Deterioration Separation
- A cyclical margin dip or destocking slowdown with pristine balance sheet ($\text{Debt/Equity} \le 0.20$), clean cash conversion ($\text{CFO/PAT} \ge 0.8$, $\text{Receivable Days} \le 80$), and management milestone delivery is classified as **`TEMPORARY_SETBACK`** ($\to$ `INTACT` $\to$ `CORE_HOLD`), **NOT** thesis pressure or falsification.
- Structural falsification requires at least two orthogonal broken buckets, severe working capital collapse ($\text{CFO/PAT} < 0.20 \land \text{Receivable Days} > 150$), or confirmed management divergence alongside a broken operational bucket.

---

## 4. Canonical Valuation Thresholds

| Valuation State | Formal Definition & Trigger Thresholds |
| :--- | :--- |
| **`ATTRACTIVE`** | $\text{Expectation Gap} \ge +10.0\%$ (Significant asymmetry / margin of safety). |
| **`REASONABLE`** | $0.0\% \le \text{Expectation Gap} < +10.0\%$ (Fairly priced compounding). |
| **`FULL`** | $-30.0\% \le \text{Expectation Gap} < 0.0\%$ OR $P/E > \text{peCeiling} \times 1.20$ (Modest multiple stretch). |
| **`EXTREME`** | $P/E > 80.0x$ (Hard bubble ceiling) OR $\text{Expectation Gap} \le -30.0\%$ (Unattainable pricing). |

---

## 5. Derived Capital Decision Matrix

| Thesis Health | Valuation State | Derived Capital Action | Institutional Rationale |
| :--- | :--- | :---: | :--- |
| **`STRENGTHENING`** | **`ATTRACTIVE`** | **`ACCUMULATE_CONVICTION`** | Operating leverage expanding while market price offers strong margin of safety. |
| **`STRENGTHENING`** | **`REASONABLE`** | **`ACCUMULATE_CONVICTION`** | Steady fundamental compounding at fair valuation. |
| **`STRENGTHENING`** | **`FULL`** | **`CORE_HOLD`** | Business compounding fast; hold core position without chasing stretched multiple. |
| **`STRENGTHENING`** | **`EXTREME`** | **`PRUDENT_TRIM`** | Outstanding business, but price requires unattainable growth ($P/E > 80x$). Lock in gains. |
| **`INTACT`** | **`ATTRACTIVE` / `REASONABLE`** | **`CORE_HOLD`** | Steady compounding on track; maintain position. |
| **`INTACT`** | **`EXTREME`** | **`PRUDENT_TRIM`** | Multiple bubble without fundamental acceleration. |
| **`UNDER_PRESSURE`** | **`ATTRACTIVE` / `REASONABLE`** | **`PAUSE_ADDITIONS`** | Monitor temporary friction / capacity delay before allocating incremental capital. |
| **`UNDER_PRESSURE`** | **`EXTREME`** | **`PRUDENT_TRIM`** | Valuation stretched while execution is straining. |
| **`BROKEN`** | **ANY** | **`SYSTEMATIC_EXIT`** | Capital protection executed. Business compounding thesis invalidated. |

---

## 6. Forbidden Behaviors (P0 Violations)

1. ❌ **No Pre-Classified Test Inputs**: Zero trust in pre-supplied `status` strings. The blind inference path must evaluate raw evidence.
2. ❌ **No Unobserved Fallbacks**: Missing evidence must evaluate to `UNKNOWN`, never defaulting to `CONFIRMED`.
3. ❌ **No Manual Override Scripts**: Zero ad-hoc SQL updates or manual status overrides.
4. ❌ **No Static Ticker Branches**: Zero hardcoded `if (ticker === 'XYZ')` in backend scoring code.
5. ❌ **No Multi-Engine Architecture Proliferation**: No V3, V4, or parallel decision systems.
