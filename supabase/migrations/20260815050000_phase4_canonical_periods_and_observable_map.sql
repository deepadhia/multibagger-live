-- Migration: Phase 4C.10 Canonical Periods and Observable-Outcome Map
-- Adds canonical period fields, evidence completeness state, and next observable date to management_execution_ledger.

ALTER TABLE management_execution_ledger 
ADD COLUMN IF NOT EXISTS claim_publication_period TEXT,
ADD COLUMN IF NOT EXISTS actual_period TEXT,
ADD COLUMN IF NOT EXISTS next_observable_date TEXT,
ADD COLUMN IF NOT EXISTS evidence_completeness_state TEXT CHECK (
    evidence_completeness_state IN (
        'NOT_TESTABLE_YET',
        'TESTABLE_BUT_ACTUAL_MISSING',
        'VALIDATED_OUTCOME',
        'NOT_A_COMMITMENT'
    )
);
