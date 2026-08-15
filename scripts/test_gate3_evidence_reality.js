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

async function runGate3EvidenceRealityVerification() {
  console.log("==================================================================");
  console.log("=== 🔬 GATE 3: EVIDENCE REALITY VERIFICATION SUITE ===");
  console.log("==================================================================\n");

  let passedCount = 0;
  const totalTests = 4;
  const ticker = "HBLENGINE";
  const period = "Q1 FY27";
  const docId = "SEBI_LODR_HBLENGINE_Q1FY27_G3_PDF";

  try {
    // Setup Phase 2 Claims
    const rationaleClaim = await bindClaimLineage({
      claimId: "HBL_G3_RATIONALE_Q1FY27", ticker, period, claimType: "FINANCIAL_FACT", metric: "KAVACH_ORDER_BOOK", canonicalValue: "1450.00", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: docId, pageNumber: 5, sectionTitle: "Order Book", paragraphExcerpt: "Kavach Backlog 1450 Cr", documentContent: "Doc text", verificationStatus: "VERIFIED"
    }, pool);

    const revClaim = await bindClaimLineage({
      claimId: "HBL_G3_REV_Q1FY27", ticker, period, claimType: "FINANCIAL_FACT", metric: "TOTAL_REVENUE", canonicalValue: "380.00", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: docId, pageNumber: 3, sectionTitle: "P&L", paragraphExcerpt: "Revenue 380 Cr", documentContent: "Doc text", verificationStatus: "VERIFIED"
    }, pool);

    const patClaim = await bindClaimLineage({
      claimId: "HBL_G3_PAT_Q1FY27", ticker, period, claimType: "FINANCIAL_FACT", metric: "CORE_PAT", canonicalValue: "22.50", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: docId, pageNumber: 3, sectionTitle: "PAT", paragraphExcerpt: "PAT 22.5 Cr", documentContent: "Doc text", verificationStatus: "VERIFIED"
    }, pool);

    const backlogClaim = await bindClaimLineage({
      claimId: "HBL_G3_BACKLOG_Q1FY27", ticker, period, claimType: "FINANCIAL_FACT", metric: "KAVACH_ORDER_BOOK", canonicalValue: "1450.00", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: docId, pageNumber: 5, sectionTitle: "Order Book", paragraphExcerpt: "Kavach Backlog 1450 Cr", documentContent: "Doc text", verificationStatus: "VERIFIED"
    }, pool);

    // Primary Order Volatility Claim (Historical Intake Variability)
    const volatilityClaim = await bindClaimLineage({
      claimId: "HBL_G3_VOLATILITY_Q1FY27", ticker, period, claimType: "FINANCIAL_FACT", metric: "QUARTERLY_ORDER_INTAKE_VARIABILITY", canonicalValue: "STD_DEV_180_CR", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: docId, pageNumber: 7, sectionTitle: "Historical Order Intake Volatility", paragraphExcerpt: "Historical quarterly order wins fluctuated between 80 Cr and 450 Cr", documentContent: "Volatility doc", verificationStatus: "VERIFIED"
    }, pool);

    await saveThesisContract({
      thesisId: "HBL_G3_CONTRACT_V1", ticker, companyName: "HBL Engineering Limited", contractVersion: 1, thesisStatement: "Kavach signaling growth.", assumptions: [
        { code: "A1", text: "Kavach demand strong.", indicatorType: "LEADING", associatedMetric: "KAVACH_ORDER_BOOK", baselineValue: "1400.00", warningThresholdExpression: "value < 1200", breakThresholdExpression: "value < 800", sourceRationale: "Kavach safety mandate.", rationaleClaimId: rationaleClaim.claim_id }
      ]
    }, pool, { expectedPeriod: period });

    // -------------------------------------------------------------------------
    // TEST G3.1: Lumpiness Precision Test (Backlog Health != Lumpiness Proof)
    // -------------------------------------------------------------------------
    console.log("📌 TEST G3.1: Lumpiness Precision Test (Backlog Health vs Volatility Evidence)");
    
    // Test A: Backlog alone -> PARTIALLY_SUPPORTED
    const reconA = reconcileManagementClaimAgainstEvidence("Kavach orders are lumpy.", [backlogClaim]);
    const passA = reconA.status === "PARTIALLY_SUPPORTED";
    console.log(`  Subtest A (Backlog Alone): ${passA ? "🟢 PASS" : "🔴 FAIL"} | Status: ${reconA.status} (${reconA.rationale})`);

    // Test B: Backlog + Historical Order Volatility Claim -> SUPPORTED
    const reconB = reconcileManagementClaimAgainstEvidence("Kavach orders are lumpy.", [backlogClaim, volatilityClaim]);
    const passB = reconB.status === "SUPPORTED";
    console.log(`  Subtest B (Backlog + Volatility): ${passB ? "🟢 PASS" : "🔴 FAIL"} | Status: ${reconB.status} (${reconB.rationale})`);

    if (passA && passB) passedCount++;

    // -------------------------------------------------------------------------
    // TEST G3.2: Narrative Shift Precision Test (Cautious Signal vs Explicit Cut)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST G3.2: Narrative Shift Precision Test (Cautious Signal vs Explicit Cut)");
    
    // Subtest A: Cautious shift without explicit quantitative cut -> EXPLANATION_CHANGED
    const shiftA = await detectManagementNarrativeShift(
      rationaleClaim.claim_id, null, "GUIDANCE_REDUCED", "Cautious commentary on H2 order timing", ticker, period, "Q4 FY26", pool, { hasExplicitQuantitativeCut: false }
    );
    const passShiftA = shiftA.shift_category === "EXPLANATION_CHANGED";
    console.log(`  Subtest A (Cautious Signal): ${passShiftA ? "🟢 PASS" : "🔴 FAIL"} | Categorized as '${shiftA.shift_category}' (not premature GUIDANCE_REDUCED)`);

    // Subtest B: Explicit quantitative cut -> GUIDANCE_REDUCED
    const shiftB = await detectManagementNarrativeShift(
      rationaleClaim.claim_id, null, "GUIDANCE_REDUCED", "Guidance target cut from 500 Cr to 400 Cr", ticker, period, "Q4 FY26", pool, { hasExplicitQuantitativeCut: true }
    );
    const passShiftB = shiftB.shift_category === "GUIDANCE_REDUCED";
    console.log(`  Subtest B (Quantitative Cut): ${passShiftB ? "🟢 PASS" : "🔴 FAIL"} | Categorized as '${shiftB.shift_category}'`);

    if (passShiftA && passShiftB) passedCount++;

    // -------------------------------------------------------------------------
    // TEST G3.3: 7-Step Management Completeness Pipeline Verification
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST G3.3: 7-Step Management Evidence Completeness Pipeline");
    const gateEval = evaluateManagementEvidenceCompleteness(ticker, period);
    const passPipeline = gateEval.pipeline.sourceAvailable && gateEval.pipeline.sourceProcessed && gateEval.pipeline.materialClaimsExtracted && gateEval.pipeline.claimsLineageBound && gateEval.pipeline.evidenceTested && gateEval.completenessStatus === "COMPLETE";

    console.log(`  Pipeline Verification: ${passPipeline ? "🟢 PASS" : "🔴 FAIL"} | Status: ${gateEval.completenessStatus}`);
    if (passPipeline) passedCount++;

    // -------------------------------------------------------------------------
    // TEST G3.4: Real-World HBL Q1 FY27 Reality Evaluation
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST G3.4: Real-World HBL Q1 FY27 Reality Evaluation");
    const tHbl = await evaluateThesisState(ticker, period, [revClaim.claim_id, patClaim.claim_id, backlogClaim.claim_id, volatilityClaim.claim_id], pool, {
      isPnLWeakQuarter: true,
      managementClaimText: "Kavach orders are lumpy."
    });

    const passHbl = tHbl.businessCondition === "DETERIORATING" &&
                     tHbl.currentThesisState === "STABLE" &&
                     tHbl.evidenceStatus === "MIXED" &&
                     tHbl.reviewStatus === "REVIEW_REQUIRED";

    console.log(`  HBL Output: ${passHbl ? "🟢 PASS" : "🔴 FAIL"} | Business: ${tHbl.businessCondition}, Thesis: ${tHbl.currentThesisState}, Evidence: ${tHbl.evidenceStatus}, Review: ${tHbl.reviewStatus}`);
    if (passHbl) passedCount++;

  } catch (err) {
    console.error("🔴 Gate 3 Test Error:", err);
  } finally {
    console.log("\n==================================================================");
    if (passedCount === totalTests) {
      console.log(`=== 🟢 GATE 3 EVIDENCE REALITY GATE PASSED: ${passedCount}/${totalTests} TESTS PASSED (100% 🟢) ===`);
    } else {
      console.log(`=== 🔴 GATE 3 EVIDENCE REALITY GATE FAILED: ${passedCount}/${totalTests} TESTS PASSED ===`);
    }
    console.log("==================================================================");
    await pool.end();
  }
}

runGate3EvidenceRealityVerification();
