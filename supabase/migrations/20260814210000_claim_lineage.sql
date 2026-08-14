-- Phase 2: Claim Lineage & Cryptographic Provenance Schema
CREATE TABLE IF NOT EXISTS claim_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id TEXT NOT NULL UNIQUE,
  ticker TEXT NOT NULL,
  period TEXT NOT NULL,
  claim_type TEXT NOT NULL CHECK (
    claim_type IN (
      'FINANCIAL_FACT',
      'MANAGEMENT_CLAIM',
      'DERIVED_FACT',
      'INDUSTRY_THESIS',
      'STRATEGIC_COMMITMENT'
    )
  ),
  
  -- Canonical Binding (Optional for narrative claims without a single numeric scalar)
  metric TEXT,
  canonical_value TEXT,
  unit TEXT,

  -- Provenance Classification
  provenance_type TEXT NOT NULL CHECK (
    provenance_type IN (
      'PRIMARY_SOURCE_VERIFIED',
      'SOURCE_VERIFIED_MANAGEMENT_CLAIM',
      'DERIVED_FACT',
      'INDUSTRY_MACRO_THESIS',
      'UNVERIFIED_OR_CONFLICTING'
    )
  ),
  source_document_type TEXT NOT NULL CHECK (
    source_document_type IN (
      'SEBI_LODR_FILING',
      'CONCALL_TRANSCRIPT',
      'INVESTOR_PRESENTATION',
      'PRESS_RELEASE',
      'PROGRAMMATIC_DERIVATION'
    )
  ),
  source_document_id TEXT NOT NULL,
  source_document_version TEXT NOT NULL DEFAULT '1.0',
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page_number INT,
  section_title TEXT,
  paragraph_excerpt TEXT,

  -- Cryptographic Integrity Hashes (SHA-256)
  source_document_hash TEXT NOT NULL,
  source_location_hash TEXT NOT NULL,

  -- Verification & Conflict Resolution
  verification_status TEXT NOT NULL CHECK (
    verification_status IN ('VERIFIED', 'EVIDENCE_CONFLICT', 'NOT_A_FINANCIAL_FACT', 'UNVERIFIED')
  ),
  confidence_reason TEXT,
  conflict_details JSONB,

  -- Immutable Claim Versioning
  claim_version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'INVALIDATED')),
  supersedes_claim_id TEXT REFERENCES claim_lineage(claim_id) ON DELETE SET NULL,

  -- Audit Timestamps
  lineage_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relational Claim Graph Edge Table for Derived Claim Lineage
CREATE TABLE IF NOT EXISTS claim_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_claim_id TEXT NOT NULL REFERENCES claim_lineage(claim_id) ON DELETE CASCADE,
  child_claim_id TEXT NOT NULL REFERENCES claim_lineage(claim_id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL CHECK (
    dependency_type IN ('INPUT_METRIC', 'HISTORICAL_BASELINE', 'FORMULA_COMPONENT')
  ),
  formula TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid lineage replay & graph traversal
CREATE INDEX IF NOT EXISTS idx_claim_lineage_ticker_period ON claim_lineage(ticker, period);
CREATE INDEX IF NOT EXISTS idx_claim_lineage_type ON claim_lineage(claim_type);
CREATE INDEX IF NOT EXISTS idx_claim_lineage_provenance ON claim_lineage(provenance_type);
CREATE INDEX IF NOT EXISTS idx_claim_lineage_hashes ON claim_lineage(source_document_hash, source_location_hash);
CREATE INDEX IF NOT EXISTS idx_claim_deps_parent ON claim_dependencies(parent_claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_deps_child ON claim_dependencies(child_claim_id);

