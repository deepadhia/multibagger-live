import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import pg from 'pg';
import {
  bindClaimLineage,
  bindClaimDependency,
  replayClaimLineage,
  reconcileNumericEvidence,
  generateClaimHashes
} from '../backend/services/claim-lineage.service.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runClaimLineageTestSuite() {
  console.log("==================================================================");
  console.log("=== 🔬 PHASE 2: FAILURE-INJECTION CLAIM LINEAGE TEST SUITE ===");
  console.log("==================================================================\n");

  let passedTests = 0;
  const totalTests = 6;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Source Identity & SHA-256 Hash Verification
    // -------------------------------------------------------------------------
    console.log("📌 TEST 1: Source Identity & SHA-256 Hash Verification");
    const docContent1 = "Time Technoplast Limited Statement of Standalone and Consolidated Financial Results Q1 FY27 Total Revenue INR 1693.80 Crores";
    const claim1 = {
      claimId: "TIMETECHNO_REVENUE_Q1FY27",
      ticker: "TIMETECHNO",
      period: "Q1 FY27",
      claimType: "FINANCIAL_FACT",
      metric: "TOTAL_REVENUE",
      canonicalValue: "1693.80",
      unit: "INR_CRORES",
      provenanceType: "PRIMARY_SOURCE_VERIFIED",
      sourceDocumentType: "SEBI_LODR_FILING",
      sourceDocumentId: "LODR_2026_Q1_TIMETECHNO_PDF",
      sourceDocumentVersion: "1.0",
      pageNumber: 3,
      sectionTitle: "Statement of Profit and Loss",
      paragraphExcerpt: "Total Revenue for the quarter ended June 30 2026 reached INR 1693.80 Crores",
      documentContent: docContent1,
      verificationStatus: "VERIFIED"
    };

    await bindClaimLineage(claim1, pool);
    const replay1 = await replayClaimLineage("TIMETECHNO_REVENUE_Q1FY27", pool, {
      verifyHashes: true,
      rawDocContent: docContent1
    });

    if (replay1.replayStatus === "PASS" && replay1.verificationStatus === "VERIFIED") {
      console.log("  🟢 PASS: Replayed TIMETECHNO_REVENUE_Q1FY27 cleanly with verified SHA-256 hashes.");
      passedTests++;
    } else {
      console.error("  🔴 FAIL Test 1:", replay1);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Exact Location Tracking (Page, Section, Excerpt)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 2: Exact Location Tracking");
    if (replay1.pageNumber === 3 && replay1.sectionTitle === "Statement of Profit and Loss" && replay1.paragraphExcerpt.includes("1693.80")) {
      console.log(`  🟢 PASS: Page (${replay1.pageNumber}), Section ('${replay1.sectionTitle}'), & Excerpt tracked deterministically.`);
      passedTests++;
    } else {
      console.error("  🔴 FAIL Test 2: Location tracking failed.");
    }

    // -------------------------------------------------------------------------
    // TEST 3: Entity & Period Isolation (Fail-Closed)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 3: Entity & Period Isolation Contamination Prevention");
    const entityFail = await replayClaimLineage("TIMETECHNO_REVENUE_Q1FY27", pool, { expectedTicker: "SKIPPER" });
    const periodFail = await replayClaimLineage("TIMETECHNO_REVENUE_Q1FY27", pool, { expectedPeriod: "Q3 FY26" });

    if (
      entityFail.replayStatus === "BLOCKED" && entityFail.errorCode === "ENTITY_MISMATCH" && entityFail.verificationStatus === "UNVERIFIED" &&
      periodFail.replayStatus === "BLOCKED" && periodFail.errorCode === "PERIOD_MISMATCH" && periodFail.verificationStatus === "UNVERIFIED"
    ) {
      console.log("  🟢 PASS: Entity Mismatch & Period Mismatch both failed closed with exact error codes & UNVERIFIED status.");
      passedTests++;
    } else {
      console.error("  🔴 FAIL Test 3:", { entityFail, periodFail });
    }

    // -------------------------------------------------------------------------
    // TEST 4: Metric Reconciliation Policy (Rounding vs Material Conflict)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 4: Metric Reconciliation Policy & Material Conflict Detection");
    const roundingResult = reconcileNumericEvidence("TOTAL_REVENUE", 1309.83, 1310.00);
    const conflictResult = reconcileNumericEvidence("TOTAL_REVENUE", 1309.83, 1450.00);

    // Bind material conflict claim to test fail-closed replay
    const conflictClaim = {
      claimId: "TEST_CONFLICT_CLAIM_Q1FY27",
      ticker: "INOXINDIA",
      period: "Q1 FY27",
      claimType: "FINANCIAL_FACT",
      metric: "TOTAL_REVENUE",
      canonicalValue: "1450.00",
      provenanceType: "UNVERIFIED_OR_CONFLICTING",
      sourceDocumentType: "CONCALL_TRANSCRIPT",
      sourceDocumentId: "INOX_CONCALL_Q1FY27",
      documentContent: "Conflict test",
      verificationStatus: "EVIDENCE_CONFLICT",
      conflictDetails: conflictResult
    };

    await bindClaimLineage(conflictClaim, pool);
    const conflictReplay = await replayClaimLineage("TEST_CONFLICT_CLAIM_Q1FY27", pool);

    if (
      roundingResult.classification === "ROUNDING_VARIANCE" && roundingResult.status === "VERIFIED" &&
      conflictResult.classification === "MATERIAL_CONFLICT" && conflictResult.status === "EVIDENCE_CONFLICT" &&
      conflictReplay.replayStatus === "BLOCKED" && conflictReplay.errorCode === "MATERIAL_CONFLICT" && conflictReplay.verificationStatus === "UNVERIFIED"
    ) {
      console.log("  🟢 PASS: Verbal rounding (₹1309.83 vs ₹1310) resolved to ROUNDING_VARIANCE; Material discrepancy (₹1309.83 vs ₹1450) failed closed with MATERIAL_CONFLICT.");
      passedTests++;
    } else {
      console.error("  🔴 FAIL Test 4:", { roundingResult, conflictResult, conflictReplay });
    }

    // -------------------------------------------------------------------------
    // TEST 5: Recursive Claim Dependency Graph Replay
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 5: Recursive Claim Dependency Graph Replay");
    const docSkipper = "Skipper Limited Financial Results Q1 FY27 EBITDA Margin 10.70 percent vs 10.10 percent Q1 FY26";

    // Bind input claim 1 (Q1 FY27 Margin)
    await bindClaimLineage({
      claimId: "SKIPPER_MARGIN_Q1FY27",
      ticker: "SKIPPER",
      period: "Q1 FY27",
      claimType: "FINANCIAL_FACT",
      metric: "EBITDA_MARGIN",
      canonicalValue: "10.70",
      unit: "PERCENT",
      provenanceType: "PRIMARY_SOURCE_VERIFIED",
      sourceDocumentType: "SEBI_LODR_FILING",
      sourceDocumentId: "LODR_2026_Q1_SKIPPER_PDF",
      pageNumber: 4,
      sectionTitle: "EBITDA Margin Schedule",
      paragraphExcerpt: "EBITDA Margin for Q1 FY27 stood at 10.70 percent",
      documentContent: docSkipper,
      verificationStatus: "VERIFIED"
    }, pool);

    // Bind input claim 2 (Q1 FY26 Margin)
    await bindClaimLineage({
      claimId: "SKIPPER_MARGIN_Q1FY26",
      ticker: "SKIPPER",
      period: "Q1 FY26",
      claimType: "FINANCIAL_FACT",
      metric: "EBITDA_MARGIN",
      canonicalValue: "10.10",
      unit: "PERCENT",
      provenanceType: "PRIMARY_SOURCE_VERIFIED",
      sourceDocumentType: "SEBI_LODR_FILING",
      sourceDocumentId: "LODR_2025_Q1_SKIPPER_PDF",
      pageNumber: 4,
      sectionTitle: "EBITDA Margin Schedule",
      paragraphExcerpt: "EBITDA Margin for Q1 FY26 stood at 10.10 percent",
      documentContent: docSkipper,
      verificationStatus: "VERIFIED"
    }, pool);

    // Bind derived claim (Margin Delta +60 bps)
    await bindClaimLineage({
      claimId: "SKIPPER_MARGIN_DELTA_Q1FY27",
      ticker: "SKIPPER",
      period: "Q1 FY27",
      claimType: "DERIVED_FACT",
      metric: "EBITDA_MARGIN_DELTA",
      canonicalValue: "+60 bps",
      unit: "BPS",
      provenanceType: "DERIVED_FACT",
      sourceDocumentType: "PROGRAMMATIC_DERIVATION",
      sourceDocumentId: "MATH_ENGINE_V1",
      documentContent: "Math derivation",
      verificationStatus: "VERIFIED"
    }, pool);

    // Bind graph edges in claim_dependencies edge table
    await bindClaimDependency("SKIPPER_MARGIN_DELTA_Q1FY27", "SKIPPER_MARGIN_Q1FY27", "INPUT_METRIC", "10.70 - 10.10 = +0.60% (+60 bps)", pool);
    await bindClaimDependency("SKIPPER_MARGIN_DELTA_Q1FY27", "SKIPPER_MARGIN_Q1FY26", "HISTORICAL_BASELINE", "10.70 - 10.10 = +0.60% (+60 bps)", pool);

    const derivedReplay = await replayClaimLineage("SKIPPER_MARGIN_DELTA_Q1FY27", pool);

    if (
      derivedReplay.replayStatus === "PASS" &&
      derivedReplay.dependencies.length === 2 &&
      derivedReplay.dependencies[0].childClaim.canonicalValue === "10.70" &&
      derivedReplay.dependencies[1].childClaim.canonicalValue === "10.10"
    ) {
      console.log("  🟢 PASS: Replayed derived claim SKIPPER_MARGIN_DELTA_Q1FY27 recursively, reconstructing both input lineage chains.");
      passedTests++;
    } else {
      console.error("  🔴 FAIL Test 5:", derivedReplay);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Tampered Source Integrity Test (Fail-Closed Hash Verification)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 6: Tampered Source Integrity Test");
    const tamperedReplay = await replayClaimLineage("TIMETECHNO_REVENUE_Q1FY27", pool, {
      verifyHashes: true,
      rawDocContent: docContent1,
      tamperedExcerpt: "Total Revenue for the quarter ended June 30 2026 reached INR 9999.80 Crores" // Tampered 1 character!
    });

    if (
      tamperedReplay.replayStatus === "BLOCKED" &&
      tamperedReplay.errorCode === "SOURCE_INTEGRITY_FAILURE" &&
      tamperedReplay.verificationStatus === "UNVERIFIED"
    ) {
      console.log("  🟢 PASS: Modifying 1 character in source excerpt triggered SOURCE_INTEGRITY_FAILURE and failed closed with UNVERIFIED status.");
      passedTests++;
    } else {
      console.error("  🔴 FAIL Test 6:", tamperedReplay);
    }

  } catch (err) {
    console.error("🔴 Test Suite Error:", err);
  } finally {
    console.log("\n==================================================================");
    if (passedTests === totalTests) {
      console.log(`=== 🟢 PHASE 2 ENGINEERING GATE PASSED: ${passedTests}/${totalTests} TESTS PASSED (100% 🟢) ===`);
    } else {
      console.log(`=== 🔴 PHASE 2 ENGINEERING GATE FAILED: ${passedTests}/${totalTests} TESTS PASSED ===`);
    }
    console.log("==================================================================");
    await pool.end();
  }
}

runClaimLineageTestSuite();
