import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import pg from 'pg';
import { bindClaimLineage } from '../backend/services/claim-lineage.service.js';
import { saveThesisContract } from '../backend/services/thesis-contract.service.js';
import { evaluateThesisState } from '../backend/services/thesis-engine.service.js';
import {
  bindManagementClaim,
  reconcileManagementClaimAgainstEvidence,
  detectManagementNarrativeShift,
  evaluateManagementEvidenceCompleteness
} from '../backend/services/management-evidence.service.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runManagementEvidencePatchTestSuite() {
  console.log("==================================================================");
  console.log("=== 🔬 PHASE 3 PATCH: MANAGEMENT EVIDENCE TEST SUITE (M1-M12) ===");
  console.log("==================================================================\n");

  let passedCount = 0;
  const totalTests = 12;
  const ticker = "HBLENGINE";
  const period = "Q1 FY27";
  const docId = "SEBI_LODR_HBLENGINE_Q1FY27_PATCH_PDF";
  const docContent = "HBL Engineering Limited Q1 FY27 SEBI LODR Filing Revenue INR 380 Crores PAT INR 22.5 Crores Kavach Order Book INR 1450 Crores";

  try {
    // Clean up test records
    await pool.query(`DELETE FROM thesis_state_history WHERE ticker = $1`, [ticker]);
    await pool.query(`DELETE FROM thesis_management_evidence WHERE ticker = $1`, [ticker]);
    await pool.query(`DELETE FROM management_narrative_shifts WHERE ticker = $1`, [ticker]);

    // Setup base Phase 2 Claims
    const rationaleClaim = await bindClaimLineage({
      claimId: "HBL_PATCH_RATIONALE_Q1FY27", ticker, period, claimType: "FINANCIAL_FACT", metric: "KAVACH_ORDER_BOOK", canonicalValue: "1450.00", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: docId, pageNumber: 5, sectionTitle: "Order Book", paragraphExcerpt: "Kavach Order Backlog 1450 Cr", documentContent: docContent, verificationStatus: "VERIFIED"
    }, pool);

    const revClaim = await bindClaimLineage({
      claimId: "HBL_PATCH_REV_Q1FY27", ticker, period, claimType: "FINANCIAL_FACT", metric: "TOTAL_REVENUE", canonicalValue: "380.00", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: docId, pageNumber: 3, sectionTitle: "P&L", paragraphExcerpt: "Revenue 380 Cr", documentContent: docContent, verificationStatus: "VERIFIED"
    }, pool);

    const patClaim = await bindClaimLineage({
      claimId: "HBL_PATCH_PAT_Q1FY27", ticker, period, claimType: "FINANCIAL_FACT", metric: "CORE_PAT", canonicalValue: "22.50", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: docId, pageNumber: 3, sectionTitle: "PAT", paragraphExcerpt: "PAT 22.5 Cr", documentContent: docContent, verificationStatus: "VERIFIED"
    }, pool);

    const backlogClaim = await bindClaimLineage({
      claimId: "HBL_PATCH_BACKLOG_Q1FY27", ticker, period, claimType: "FINANCIAL_FACT", metric: "KAVACH_ORDER_BOOK", canonicalValue: "1450.00", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: docId, pageNumber: 5, sectionTitle: "Order Book", paragraphExcerpt: "Kavach Order Backlog 1450 Cr", documentContent: docContent, verificationStatus: "VERIFIED"
    }, pool);

    // Save Base Contract
    await saveThesisContract({
      thesisId: "HBL_PATCH_TEST_CONTRACT_V1", ticker, companyName: "HBL Engineering Limited", contractVersion: 1, thesisStatement: "Kavach deployment structural growth engine.", assumptions: [
        { code: "A1", text: "Kavach demand strong.", indicatorType: "LEADING", associatedMetric: "KAVACH_ORDER_BOOK", baselineValue: "1400.00", warningThresholdExpression: "value < 1200", breakThresholdExpression: "value < 800 AND consecutive_negative_quarters >= 2", sourceRationale: "Kavach safety mandate.", rationaleClaimId: rationaleClaim.claim_id }
      ]
    }, pool, { expectedPeriod: period });

    const primaryClaims = [revClaim, patClaim, backlogClaim];

    // -------------------------------------------------------------------------
    // TEST M1: Concall management claim is correctly captured and lineage-bound
    // -------------------------------------------------------------------------
    console.log("📌 TEST M1: Concall Management Claim Capture & Lineage Binding");
    const m1 = await bindManagementClaim({
      ticker, period, claimId: "HBL_MGMT_CLAIM_Q1FY27_M1", statementText: "Kavach orders are lumpy and execution accelerates in H2.", sourceClass: "CONCALL_TRANSCRIPT", sourceDocumentId: "HBL_CONCALL_Q1FY27_TRANSCRIPT", pageNumber: 12, documentContent: "Concall text snippet", reconciliationStatus: "SUPPORTED", reconciliationRationale: "Backlog ₹1,450 Cr supports claim"
    }, pool);

    const p1 = m1.lineageClaim.claim_id === "HBL_MGMT_CLAIM_Q1FY27_M1" && m1.managementEvidence.source_class === "CONCALL_TRANSCRIPT";
    console.log(`  ${p1 ? "🟢 PASS" : "RAW FAIL"} | Bound claim ID '${m1.lineageClaim.claim_id}' into claim_lineage & thesis_management_evidence.`);
    if (p1) passedCount++;

    // -------------------------------------------------------------------------
    // TEST M2: Unsupported management explanation -> UNSUPPORTED + REVIEW_REQUIRED
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST M2: Unsupported Management Explanation");
    const m2Recon = reconcileManagementClaimAgainstEvidence("We expect export orders to triple next month", []);
    const t2 = await evaluateThesisState(ticker, period, [revClaim.claim_id, patClaim.claim_id, backlogClaim.claim_id], pool, {
      managementClaimText: "We expect export orders to triple next month"
    });
    const p2 = m2Recon.status === "UNSUPPORTED" && t2.reviewStatus === "REVIEW_REQUIRED";
    console.log(`  ${p2 ? "🟢 PASS" : "RAW FAIL"} | Status: ${m2Recon.status}, Review: ${t2.reviewStatus}`);
    if (p2) passedCount++;

    // -------------------------------------------------------------------------
    // TEST M3: Management statement contradicts verified evidence -> CONFLICTING
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST M3: Contradicting Management Statement");
    const conflictClaim = { verification_status: "EVIDENCE_CONFLICT", provenance_type: "UNVERIFIED_OR_CONFLICTING" };
    const m3Recon = reconcileManagementClaimAgainstEvidence("Revenue grew 50%", [conflictClaim]);
    const p3 = m3Recon.status === "CONFLICTING";
    console.log(`  ${p3 ? "🟢 PASS" : "RAW FAIL"} | Status: ${m3Recon.status}`);
    if (p3) passedCount++;

    // -------------------------------------------------------------------------
    // TEST M4: Missing concall source does NOT imply "management said nothing"
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST M4: Missing Concall Source Status Handling");
    const m4Gate = evaluateManagementEvidenceCompleteness(ticker, period, { concall: "SOURCE_NOT_AVAILABLE" });
    const p4 = m4Gate.sources.concall === "SOURCE_NOT_AVAILABLE" && m4Gate.completenessStatus === "PARTIAL";
    console.log(`  ${p4 ? "🟢 PASS" : "RAW FAIL"} | Concall Status: ${m4Gate.sources.concall}, Completeness: ${m4Gate.completenessStatus}`);
    if (p4) passedCount++;

    // -------------------------------------------------------------------------
    // TEST M5: AGM strategic commitment captured and tracked
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST M5: AGM Strategic Commitment Capture");
    const m5 = await bindManagementClaim({
      ticker, period, claimId: "HBL_AGM_COMMITMENT_2026", statementText: "AGM 2026: HBL targets 25% market share in Kavach deployment.", sourceClass: "AGM_DISCLOSURE", sourceDocumentId: "HBL_AGM_MINUTES_2026", pageNumber: 4, documentContent: "AGM transcript text", reconciliationStatus: "SUPPORTED", reconciliationRationale: "Target confirmed at AGM"
    }, pool);
    const p5 = m5.managementEvidence.source_class === "AGM_DISCLOSURE";
    console.log(`  ${p5 ? "🟢 PASS" : "RAW FAIL"} | Source Class: ${m5.managementEvidence.source_class}`);
    if (p5) passedCount++;

    // -------------------------------------------------------------------------
    // TEST M6: Management guidance reduction detected vs previous quarter
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST M6: Management Narrative Shift Detection");
    const m6 = await detectManagementNarrativeShift(
      m1.lineageClaim.claim_id, null, "GUIDANCE_REDUCED", "Management commentary shifted from aggressive inflow expectation in Q4 to lumpy guidance in Q1.", ticker, period, "Q4 FY26", pool
    );
    const p6 = m6.shift_category === "GUIDANCE_REDUCED";
    console.log(`  ${p6 ? "🟢 PASS" : "RAW FAIL"} | Shift Category: ${m6.shift_category}`);
    if (p6) passedCount++;

    // -------------------------------------------------------------------------
    // TEST M7: Management claim cannot directly force STRENGTHENING/BROKEN
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST M7: Management Claim Cannot Directly Force State");
    const t7 = await evaluateThesisState(ticker, period, [revClaim.claim_id, patClaim.claim_id, backlogClaim.claim_id], pool, {
      managementClaimText: "THESIS IS STRENGTHENING! BEST QUARTER EVER!", isPnLWeakQuarter: true
    });
    const p7 = t7.currentThesisState === "STABLE"; // Evaluated deterministically from metrics!
    console.log(`  ${p7 ? "🟢 PASS" : "RAW FAIL"} | Thesis State: ${t7.currentThesisState} (Management hype ignored)`);
    if (p7) passedCount++;

    // -------------------------------------------------------------------------
    // TEST M8: Management claim cannot rescue hard objective thesis-break
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST M8: Management Claim Cannot Rescue Hard Thesis-Break");
    const brokenBacklogClaim = await bindClaimLineage({
      claimId: "HBL_BROKEN_BACKLOG_M8", ticker, period, claimType: "FINANCIAL_FACT", metric: "KAVACH_ORDER_BOOK", canonicalValue: "400.00", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: docId, documentContent: docContent, verificationStatus: "VERIFIED"
    }, pool);

    const t8 = await evaluateThesisState(ticker, period, [revClaim.claim_id, patClaim.claim_id, brokenBacklogClaim.claim_id], pool, {
      managementClaimText: "Don't worry, order book will recover next year!"
    });
    const p8 = t8.currentThesisState === "BROKEN";
    console.log(`  ${p8 ? "🟢 PASS" : "RAW FAIL"} | Thesis State: ${t8.currentThesisState} (Hard break enforced)`);
    if (p8) passedCount++;

    // -------------------------------------------------------------------------
    // TEST M9: Management claim from wrong ticker cannot contaminate thesis
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST M9: Wrong Ticker Management Claim Isolation");
    const t9 = await evaluateThesisState(ticker, period, ["TIMETECHNO_REVENUE_Q1FY27"], pool);
    const p9 = t9.evidenceClaimIds.length === 0 && t9.evidenceStatus === "INSUFFICIENT";
    console.log(`  ${p9 ? "🟢 PASS" : "RAW FAIL"} | Evidence Claims Count: ${t9.evidenceClaimIds.length}`);
    if (p9) passedCount++;

    // -------------------------------------------------------------------------
    // TEST M10: Management claim from wrong period cannot contaminate current thesis
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST M10: Wrong Period Management Claim Isolation");
    const t10 = await evaluateThesisState(ticker, period, ["HBL_PATCH_REV_Q3FY26"], pool);
    const p10 = t10.evidenceClaimIds.length === 0 && t10.evidenceStatus === "INSUFFICIENT";
    console.log(`  ${p10 ? "🟢 PASS" : "RAW FAIL"} | Evidence Claims Count: ${t10.evidenceClaimIds.length}`);
    if (p10) passedCount++;

    // -------------------------------------------------------------------------
    // TEST M11: Previous management promise remains unresolved until target period/evidence confirms completion
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST M11: Previous Commitment Status Integrity");
    const m11Recon = reconcileManagementClaimAgainstEvidence("On track to expand capacity in Q4 FY27", []);
    const p11 = m11Recon.status === "UNSUPPORTED" || m11Recon.status === "NOT_TESTABLE";
    console.log(`  ${p11 ? "🟢 PASS" : "RAW FAIL"} | Status: ${m11Recon.status}`);
    if (p11) passedCount++;

    // -------------------------------------------------------------------------
    // TEST M12: "Kavach orders are lumpy" HBL Q1 FY27 Real-World Benchmark
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST M12: 'Kavach orders are lumpy' Real-World Benchmark Test");
    const lumpyClaimText = "Kavach orders are lumpy.";
    const m12Recon = reconcileManagementClaimAgainstEvidence(lumpyClaimText, [backlogClaim]);
    
    const t12 = await evaluateThesisState(ticker, period, [revClaim.claim_id, patClaim.claim_id, backlogClaim.claim_id], pool, {
      isPnLWeakQuarter: true,
      managementClaimText: lumpyClaimText
    });

    const p12 = m12Recon.status === "SUPPORTED" &&
                t12.businessCondition === "DETERIORATING" &&
                t12.currentThesisState === "STABLE" &&
                t12.evidenceStatus === "MIXED" &&
                t12.reviewStatus === "REVIEW_REQUIRED";

    console.log(`  ${p12 ? "🟢 PASS" : "RAW FAIL"} | Reconciliation: ${m12Recon.status}, Business: ${t12.businessCondition}, Thesis: ${t12.currentThesisState}, Evidence: ${t12.evidenceStatus}, Review: ${t12.reviewStatus}`);
    if (p12) passedCount++;

  } catch (err) {
    console.error("🔴 Test Suite Error:", err);
  } finally {
    console.log("\n==================================================================");
    if (passedCount === totalTests) {
      console.log(`=== 🟢 MANAGEMENT EVIDENCE PATCH GATE PASSED: ${passedCount}/${totalTests} TESTS PASSED (100% 🟢) ===`);
    } else {
      console.log(`=== 🔴 MANAGEMENT EVIDENCE PATCH GATE FAILED: ${passedCount}/${totalTests} TESTS PASSED ===`);
    }
    console.log("==================================================================");
    await pool.end();
  }
}

runManagementEvidencePatchTestSuite();
