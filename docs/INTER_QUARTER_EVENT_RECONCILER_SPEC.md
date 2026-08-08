# Feature Enhancement Spec: Inter-Quarter Event & Order Win Reconciler

**Document Version:** 1.0.0  
**Status:** PROPOSED (Scheduled for Implementation Post-Batch Extraction)  
**Target Component:** `backend/workers/interquarter-reconciler.js` & `backend/services/announcement.service.js`  
**Created Date:** August 5, 2026  

---

## 1. Executive Summary & Business Objective

Management forward-looking commitments made during quarterly earnings calls (e.g., *"We target ₹1,000 Cr order inflows over the next 60 days"* or *"Deoli plant expansion will be commissioned in Q4"*) are frequently fulfilled mid-quarter via **SEBI Regulation 30 Corporate Announcements** filed on BSE/NSE.

Currently, commitment status reconciliation primarily triggers when quarterly financial results land (every 90 days). This enhancement introduces a **Real-Time Inter-Quarter Event Reconciler** that:
1. Ingests live SEBI Regulation 30 material disclosures as they land on BSE/NSE.
2. Matches announcements against `Pending` management commitments using hybrid quantitative-ledger and LLM semantic evidence matching.
3. Automatically transitions commitment statuses (e.g., `Pending` → `Achieved` / `Partially Achieved`), appends direct quote evidence from the official BSE filing, updates management credibility, and dispatches real-time Telegram alerts.

---

## 2. Target SEBI Regulation 30 Event Classifications

The reconciler listens to the live announcement stream and filters for specific material disclosure categories under SEBI (LODR) Regulations:

| SEBI Regulation 30 Category | Target Commitment Types | Example Match |
|---|---|---|
| **Award of Contracts / Order Wins** | Order Book, Order Intake, Revenue Guidance | *"Bagged ₹650 Cr Transmission Line order from PGCIL"* ➔ Matched against Q3 guidance: *"Targeting ₹500 Cr+ orders"* |
| **Plant Commissioning / Capacity Addition** | Capex Completion, Capacity Expansion, Factory Launch | *"Commissioned 25,000 MT Deoli Tower Plant"* ➔ Matched against *"Tower capacity expansion by Q4"* |
| **Debt Prepayment / De-leveraging** | Debt Target, Interest Expense Reduction | *"Prepaid ₹200 Cr long-term bank debt"* ➔ Matched against *"Target debt-free by FY26"* |
| **Joint Venture / Product Approval** | New Product Rollout, JV Commercialization | *"Received PESO approval for Type-IV CNG Cascades"* ➔ Matched against *"Launch Type-IV cylinders"* |

---

## 3. Database Schema Enhancements

### 3.1 New Table: `interquarter_events`
Stores raw parsed material disclosures linked to official BSE/NSE filing URLs.

```sql
CREATE TABLE IF NOT EXISTS interquarter_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'ORDER_WIN', 'CAPEX_COMMISSIONING', 'DEBT_REDUCTION', 'PRODUCT_LAUNCH'
    announcement_title TEXT NOT NULL,
    filing_url TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    quantitative_value NUMERIC(15, 2), -- e.g. 650.00 (in Crores)
    raw_summary TEXT,
    matched_commitment_id UUID REFERENCES management_commitments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.2 New Table: `interquarter_order_ledger`
Tracks running cumulative totals for order intake commitments across a single quarter/financial year.

```sql
CREATE TABLE IF NOT EXISTS interquarter_order_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    ticker VARCHAR(20) NOT NULL,
    commitment_id UUID NOT NULL REFERENCES management_commitments(id) ON DELETE CASCADE,
    target_amount NUMERIC(15, 2) NOT NULL, -- Target order inflow amount
    accumulated_amount NUMERIC(15, 2) DEFAULT 0.00, -- Running sum of order wins
    fulfillment_percentage NUMERIC(5, 2) DEFAULT 0.00, -- (accumulated / target) * 100
    is_fulfilled BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. Reconciliation Engine Logic (Hybrid Approach)

The engine handles two distinct matching paths:

### Path A: Discrete Milestone Matcher (Plant Launches, Debt Paydown, Approvals)
1. **Trigger:** Announcement categorized as `CAPEX_COMMISSIONING`, `DEBT_REDUCTION`, or `PRODUCT_LAUNCH`.
2. **Query:** Fetch all `Pending` commitments for the ticker where `metric` relates to plant expansion, debt, or product launch.
3. **LLM Verification (`runNimPrompt`):** LLM evaluates if the announcement provides exact empirical evidence of commitment completion.
4. **Action:**
   - Update `management_commitments.status` = `'Achieved'`
   - Update `management_commitments.evidence_summary` = `Direct Quote: "[BSE Filing Title]" - URL`
   - Update `management_commitments.credibility_impact` = `'positive'`
   - Dispatch Telegram alert.

### Path B: Cumulative Order Book Ledger Matcher (Order Inflow Sums)
1. **Trigger:** Announcement categorized as `ORDER_WIN` with quantitative value $V$ (e.g. ₹650 Cr).
2. **Ledger Update:** Add $V$ to `interquarter_order_ledger.accumulated_amount`.
3. **Percentage Check:**
   - If `accumulated_amount` < `target_amount`: Mark commitment `status` = `'Partially Achieved'`, update `fulfillment_percentage`.
   - If `accumulated_amount` >= `target_amount`: Mark commitment `status` = `'Achieved'`, set `is_fulfilled` = `TRUE`.
4. **Action:** Update DB & send progress milestone alert.

---

## 5. Sample Telegram Alert Output

```text
🎯 INTER-QUARTER COMMITMENT ACHIEVED

Stock: Transrail Lighting Ltd (TRANSRAILL)
Event Type: SEBI Regulation 30 (Order Win Disclosure)

Original Concall Commitment:
• Statement: "Targeting Rs. 10,000 Cr to 11,000 Cr new order intake in FY26"
• Source: Q4 FY26 Concall Transcript (June 2026)

Inter-Quarter Filing Match:
• Announcement: "Bagged new orders worth Rs. 650 Crores in Transmission & Distribution"
• Filing Date: 05-Aug-2026
• Cumulative Progress: Rs. 10,450 Cr / Rs. 10,000 Cr (104.5% Fulfilled)

Status Updated: PENDING ➔ ACHIEVED ✅
Management Credibility: Positive Impact (+1)
```

---

## 6. AGM & Chairman Speech Ingestion Pipeline

Annual General Meetings (AGMs) are a critical source of 3–5 year strategic vision statements, capital allocation rules, and shareholder Q&A disclosures.

### 6.1 Ingestion Sources under SEBI Regulation 30/44:
- `Proceeding of Annual General Meeting (AGM)`
- `Chairman Speech / AGM Presentation`
- `Voting Results & Scrutinizer Report` (SEBI Reg 44)

### 6.2 Target Extraction Scope:
1. **Long-Term Strategic Commitments:** 3–5 year revenue CAGR targets, capex allocation guidelines, new product line entries.
2. **Shareholder Q&A Disclosures:** Direct quotes from Chairman/MD addressing debt paydown timelines, litigation, client concentration, and dividend payout policy.
3. **Key Shareholder Resolutions:** Track voting outcomes on QIP borrowing limits, stock splits, ESOP allocations, and auditor appointments.

---

## 7. Implementation Checklist (Post-Batch Extraction)

- [ ] Create DB migration for `interquarter_events` and `interquarter_order_ledger`.
- [ ] Implement Regulation 30 event classification parser in `announcement.service.js`.
- [ ] Add SEBI Reg 30/44 AGM Transcript & Chairman Speech filtering.
- [ ] Create worker service `backend/workers/interquarter-reconciler.js`.
- [ ] Integrate with NVIDIA NIM Llama 70B semantic evidence verifier.
- [ ] Integrate AGM disclosures into the 4 Institutional Synthesis prompts (`strategic_evolution`, `strategic_accountability`).
- [ ] Add real-time Telegram notification builder for order wins & milestone achievements.
- [ ] Add unit tests verifying order sum ledger, AGM commitments, and milestone status transitions.
