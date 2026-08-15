-- Migration: Phase 4C.6 Semantic Ranges and Commitment Chains
-- Adds support for target ranges (target_min, target_max), commitment chain tracking, and refined execution outcomes.

ALTER TABLE management_execution_ledger 
ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'SCALAR' CHECK (target_type IN ('SCALAR', 'RANGE', 'MILESTONE', 'OBSERVATION')),
ADD COLUMN IF NOT EXISTS target_min NUMERIC,
ADD COLUMN IF NOT EXISTS target_max NUMERIC,
ADD COLUMN IF NOT EXISTS parent_commitment_id UUID REFERENCES management_execution_ledger(id),
ADD COLUMN IF NOT EXISTS revision_type TEXT CHECK (revision_type IN ('ORIGINAL_GUIDANCE', 'REITERATED', 'REVISED_UP', 'REVISED_DOWN', 'DELAYED_TIMELINE'));

-- Update check constraint on commitment_type to include current states and achievements
ALTER TABLE management_execution_ledger 
DROP CONSTRAINT IF EXISTS management_execution_ledger_commitment_type_check;

ALTER TABLE management_execution_ledger 
ADD CONSTRAINT management_execution_ledger_commitment_type_check 
CHECK (
    commitment_type IN (
        'MEASURABLE_COMMITMENT',
        'MEASURABLE_GUIDANCE',
        'TIMELINE_COMMITMENT',
        'CAPACITY_CAPEX_COMMITMENT',
        'ORDER_EXECUTION_EXPECTATION',
        'MANAGEMENT_CURRENT_STATE',
        'MANAGEMENT_REPORTED_ACHIEVEMENT',
        'NARRATIVE_COMMENTARY',
        'NON_TESTABLE_COMMENTARY'
    )
);

-- Update check constraint on execution_outcome to include range outcomes
ALTER TABLE management_execution_ledger 
DROP CONSTRAINT IF EXISTS management_execution_ledger_execution_outcome_check;

ALTER TABLE management_execution_ledger 
ADD CONSTRAINT management_execution_ledger_execution_outcome_check 
CHECK (
    execution_outcome IN (
        'ACHIEVED',
        'WITHIN_GUIDANCE',
        'BELOW_GUIDANCE',
        'ABOVE_GUIDANCE',
        'PARTIALLY_ACHIEVED',
        'MISSED',
        'DELAYED',
        'IN_PROGRESS',
        'NOT_YET_TESTABLE',
        'CONFLICTING',
        'NOT_A_COMMITMENT'
    )
);
