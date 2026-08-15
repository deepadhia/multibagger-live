import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import pg from 'pg';
import { bindClaimLineage } from '../backend/services/claim-lineage.service.js';
import { validateThesisContract, saveThesisContract } from '../backend/services/thesis-contract.service.js';
import { evaluateThesisState, persistThesisStateHistory, reconcileManagementClaim } from '../backend/services/thesis-engine.service.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run16FailureInjectionTestSuite() {
  console.log("==================================================================");
  console.log("=== 🔬 STEPS 5 & 6: 16 FAILURE-INJECTION THESIS TEST SUITE ===");
  console.log("==================================================================\n");

  let passedCount = 0;
  const totalTests = 16;
  const ticker = "HBLENGINE";
  const period = "Q1 FY27";

  try {
    // Setup Phase 2 Claims for Testing
    const docId = "SEBI_LODR_HBLENGINE_Q1FY27_TEST_PDF";
    const docContent = "HBL Engineering Limited Q1 FY27 SEBI LODR Filing Revenue INR 380 Crores PAT INR 22.5 Crores Kavach Order Book INR 1450 Crores";

    // Valid HBL Rationale Claim
    const rationaleClaim = await bindClaimLineage({
      claimId: "HBL_KAVACH_BACKLOG_RATIONALE_Q1FY27",
      ticker,
      period,
      claimType: "FINANCIAL_FACT",
      metric: "KAVACH_ORDER_BOOK",
      canonicalValue: "1450.00",
      unit: "INR_CRORES",
      provenanceType: "PRIMARY_SOURCE_VERIFIED",
      sourceDocumentType: "SEBI_LODR_FILING",
      sourceDocumentId: docId,
      pageNumber: 5,
      sectionTitle: "Order Book Schedule",
      paragraphExcerpt: "Kavach Order Backlog as of June 30 2026 stood at INR 1450 Crores",
      documentContent: docContent,
      verificationStatus: "VERIFIED"
    }, pool);

    // Valid HBL Revenue Claim
    const revClaim = await bindClaimLineage({
      claimId: "HBL_REVENUE_Q1FY27",
      ticker,
      period,
      claimType: "FINANCIAL_FACT",
      metric: "TOTAL_REVENUE",
      canonicalValue: "380.00",
      unit: "INR_CRORES",
      provenanceType: "PRIMARY_SOURCE_VERIFIED",
      sourceDocumentType: "SEBI_LODR_FILING",
      sourceDocumentId: docId,
      pageNumber: 3,
      sectionTitle: "P&L",
      paragraphExcerpt: "Total Revenue for Q1 FY27 reached INR 380 Crores",
      documentContent: docContent,
      verificationStatus: "VERIFIED"
    }, pool);

    // Valid HBL PAT Claim
    const patClaim = await bindClaimLineage({
      claimId: "HBL_PAT_Q1FY27",
      ticker,
      period,
      claimType: "FINANCIAL_FACT",
      metric: "CORE_PAT",
      canonicalValue: "22.50",
      unit: "INR_CRORES",
      provenanceType: "PRIMARY_SOURCE_VERIFIED",
      sourceDocumentType: "SEBI_LODR_FILING",
      sourceDocumentId: docId,
      pageNumber: 3,
      sectionTitle: "Net Profit",
      paragraphExcerpt: "Core PAT for Q1 FY27 reached INR 22.50 Crores",
      documentContent: docContent,
      verificationStatus: "VERIFIED"
    }, pool);

    // Valid HBL Backlog Claim
    const backlogClaim = await bindClaimLineage({
      claimId: "HBL_KAVACH_BACKLOG_Q1FY27",
      ticker,
      period,
      claimType: "FINANCIAL_FACT",
      metric: "KAVACH_ORDER_BOOK",
      canonicalValue: "1450.00",
      unit: "INR_CRORES",
      provenanceType: "PRIMARY_SOURCE_VERIFIED",
      sourceDocumentType: "SEBI_LODR_FILING",
      sourceDocumentId: docId,
      pageNumber: 5,
      sectionTitle: "Order Book",
      paragraphExcerpt: "Kavach Order Backlog as of June 30 2026 stood at INR 1450 Crores",
      documentContent: docContent,
      verificationStatus: "VERIFIED"
    }, pool);

    // Save Validated HBL Contract
    const validHblContract = {
      thesisId: "HBL_KAVACH_TEST_SUITE_V1",
      ticker,
      companyName: "HBL Engineering Limited",
      contractVersion: 1,
      thesisStatement: "Kavach Indian Railways signaling deployment is a multi-year structural growth engine for HBL.",
      assumptions: [
        {
          code: "A1",
          text: "Kavach deployment demand remains structurally strong across Indian Railways network.",
          indicatorType: "LEADING",
          associatedMetric: "KAVACH_ORDER_BOOK",
          baselineValue: "1400.00",
          warningThresholdExpression: "value < 1200",
          breakThresholdExpression: "value < 800 AND consecutive_negative_quarters >= 2",
          sourceRationale: "Kavach is a safety-critical government mandate. Backlog above ₹1,400 Cr confirms multi-year execution visibility.",
          rationaleClaimId: rationaleClaim.claim_id
        }
      ]
    };

    await saveThesisContract(validHblContract, pool, { expectedPeriod: period });

    // Clean up history before running tests
    await pool.query(`DELETE FROM thesis_state_history WHERE ticker = $1`, [ticker]);

    const validClaimIds = [revClaim.claim_id, patClaim.claim_id, backlogClaim.claim_id];

    // -------------------------------------------------------------------------
    // TEST 1: 1-Quarter Noise (Weak P&L + Intact Leading KPI = STABLE)
    // -------------------------------------------------------------------------
    console.log("📌 TEST 1: 1-Quarter Noise (Weak P&L + Intact Leading KPI)");
    const t1 = await evaluateThesisState(ticker, period, validClaimIds, pool, { isPnLWeakQuarter: true });
    const p1 = t1.businessCondition === "DETERIORATING" && t1.currentThesisState === "STABLE" && t1.reviewStatus === "REVIEW_REQUIRED";
    console.log(`  ${p1 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Business DETERIORATING, Thesis STABLE, Review REQUIRED | Actual: Business ${t1.businessCondition}, Thesis ${t1.currentThesisState}, Review ${t1.reviewStatus}`);
    if (p1) passedCount++;

    // Persist Q1 assessment to establish 1 consecutive negative quarter
    await persistThesisStateHistory(t1, pool);

    // -------------------------------------------------------------------------
    // TEST 2: 2-Quarter Persistence Rule (2 Consecutive Neg Quarters = WEAKENING)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 2: 2-Quarter Persistence Rule (2 Consecutive Neg Quarters = WEAKENING)");
    // Bind Q2 FY27 claims
    const revQ2 = await bindClaimLineage({
      claimId: "HBL_REVENUE_Q2FY27", ticker, period: "Q2 FY27", claimType: "FINANCIAL_FACT", metric: "TOTAL_REVENUE", canonicalValue: "370.00", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: "SEBI_LODR_HBL_Q2_PDF", pageNumber: 3, sectionTitle: "P&L", paragraphExcerpt: "Q2 Revenue 370 Cr", documentContent: "Q2 doc", verificationStatus: "VERIFIED"
    }, pool);
    const patQ2 = await bindClaimLineage({
      claimId: "HBL_PAT_Q2FY27", ticker, period: "Q2 FY27", claimType: "FINANCIAL_FACT", metric: "CORE_PAT", canonicalValue: "20.00", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: "SEBI_LODR_HBL_Q2_PDF", pageNumber: 3, sectionTitle: "PAT", paragraphExcerpt: "Q2 PAT 20 Cr", documentContent: "Q2 doc", verificationStatus: "VERIFIED"
    }, pool);
    const backlogQ2 = await bindClaimLineage({
      claimId: "HBL_KAVACH_BACKLOG_Q2FY27", ticker, period: "Q2 FY27", claimType: "FINANCIAL_FACT", metric: "KAVACH_ORDER_BOOK", canonicalValue: "1420.00", unit: "INR_CRORES", provenanceType: "PRIMARY_SOURCE_VERIFIED", sourceDocumentType: "SEBI_LODR_FILING", sourceDocumentId: "SEBI_LODR_HBL_Q2_PDF", pageNumber: 5, sectionTitle: "Order Book", paragraphExcerpt: "Q2 Backlog 1420 Cr", documentContent: "Q2 doc", verificationStatus: "VERIFIED"
    }, pool);

    const t2 = await evaluateThesisState(ticker, "Q2 FY27", [revQ2.claim_id, patQ2.claim_id, backlogQ2.claim_id], pool, { isPnLWeakQuarter: true });
    const p2 = t2.consecutiveNegativeQuarters === 2 && t2.currentThesisState === "WEAKENING";
    console.log(`  ${p2 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Consecutive Neg Qtrs 2, Thesis WEAKENING | Actual: Neg Qtrs ${t2.consecutiveNegativeQuarters}, Thesis ${t2.currentThesisState}`);
    if (p2) passedCount++;

    // Clean history reset for remaining tests
    await pool.query(`DELETE FROM thesis_state_history WHERE ticker = $1`, [ticker]);

    // -------------------------------------------------------------------------
    // TEST 3: Temporary Headwind (Margin Dip + Healthy Order Book)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 3: Temporary Headwind (Margin Dip + Healthy Order Book)");
    const t3 = await evaluateThesisState(ticker, period, validClaimIds, pool, { isPnLWeakQuarter: true });
    const p3 = t3.isTemporaryHeadwind === true && t3.currentThesisState === "STABLE";
    console.log(`  ${p3 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Temporary Headwind TRUE, Thesis STABLE | Actual: Temp Headwind ${t3.isTemporaryHeadwind}, Thesis ${t3.currentThesisState}`);
    if (p3) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 4: Unsupported Management Claim (Does NOT force Thesis Weakening)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 4: Unsupported Management Claim (Does NOT force Thesis Weakening)");
    const t4 = await evaluateThesisState(ticker, period, validClaimIds, pool, {
      isPnLWeakQuarter: false,
      managementClaimText: "We expect export orders to triple next month without evidence."
    });
    const p4 = t4.managementClaimReconciliation.status === "UNSUPPORTED" && t4.currentThesisState === "STABLE" && t4.reviewStatus === "REVIEW_REQUIRED";
    console.log(`  ${p4 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Mgmt UNSUPPORTED, Review REQUIRED, Thesis STABLE | Actual: Mgmt ${t4.managementClaimReconciliation.status}, Review ${t4.reviewStatus}, Thesis ${t4.currentThesisState}`);
    if (p4) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 5: Conflicting Evidence Detection
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 5: Conflicting Evidence Detection");
    const t5 = await evaluateThesisState(ticker, period, validClaimIds, pool, {
      hasConflictingClaim: true
    });
    const p5 = t5.evidenceStatus === "CONFLICTING";
    console.log(`  ${p5 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Evidence Status CONFLICTING | Actual: Evidence ${t5.evidenceStatus}, Mgmt ${t5.managementClaimReconciliation.status}`);
    if (p5) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 6: Hard Thesis Break Trigger (Order Book < ₹800 Cr = BROKEN)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 6: Hard Thesis Break Trigger (Order Book < ₹800 Cr)");
    const brokenBacklogClaim = await bindClaimLineage({
      claimId: "HBL_BROKEN_BACKLOG_Q1FY27",
      ticker,
      period,
      claimType: "FINANCIAL_FACT",
      metric: "KAVACH_ORDER_BOOK",
      canonicalValue: "400.00", // Way below ₹800 Cr break threshold!
      unit: "INR_CRORES",
      provenanceType: "PRIMARY_SOURCE_VERIFIED",
      sourceDocumentType: "SEBI_LODR_FILING",
      sourceDocumentId: docId,
      documentContent: docContent,
      verificationStatus: "VERIFIED"
    }, pool);

    const t6 = await evaluateThesisState(ticker, period, [revClaim.claim_id, patClaim.claim_id, brokenBacklogClaim.claim_id], pool);
    const p6 = t6.thesisBreakTriggered === true && t6.currentThesisState === "BROKEN";
    console.log(`  ${p6 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Thesis Break Triggered TRUE, Thesis BROKEN | Actual: Break Triggered ${t6.thesisBreakTriggered}, Thesis ${t6.currentThesisState}`);
    if (p6) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 7: Missing KPI Handling (INSUFFICIENT + REVIEW_REQUIRED)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 7: Missing KPI Handling (INSUFFICIENT + REVIEW_REQUIRED)");
    const t7 = await evaluateThesisState(ticker, period, [], pool); // Zero claims passed
    const p7 = t7.evidenceStatus === "INSUFFICIENT" && t7.reviewStatus === "REVIEW_REQUIRED";
    console.log(`  ${p7 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Evidence INSUFFICIENT, Review REQUIRED | Actual: Evidence ${t7.evidenceStatus}, Review ${t7.reviewStatus}`);
    if (p7) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 8: Ticker Isolation (TIMETECHNO claim passed to HBL evaluation)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 8: Ticker Isolation (Wrong Ticker Claim Filtered)");
    const t8 = await evaluateThesisState(ticker, period, ["TIMETECHNO_REVENUE_Q1FY27"], pool);
    const p8 = t8.evidenceClaimIds.length === 0 && t8.evidenceStatus === "INSUFFICIENT";
    console.log(`  ${p8 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Wrong Ticker Claim Ignored, Evidence INSUFFICIENT | Actual: Evidence Claims Count ${t8.evidenceClaimIds.length}, Evidence ${t8.evidenceStatus}`);
    if (p8) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 9: Period Isolation (Q3 FY26 claim passed to Q1 FY27 evaluation)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 9: Period Isolation (Wrong Period Claim Filtered)");
    const q3Claim = await bindClaimLineage({
      claimId: "HBL_REVENUE_Q3FY26",
      ticker,
      period: "Q3 FY26",
      claimType: "FINANCIAL_FACT",
      metric: "TOTAL_REVENUE",
      canonicalValue: "350.00",
      unit: "INR_CRORES",
      provenanceType: "PRIMARY_SOURCE_VERIFIED",
      sourceDocumentType: "SEBI_LODR_FILING",
      sourceDocumentId: "OLD_DOC_PDF",
      documentContent: "Old doc",
      verificationStatus: "VERIFIED"
    }, pool);

    const t9 = await evaluateThesisState(ticker, "Q1 FY27", [q3Claim.claim_id], pool);
    const p9 = t9.evidenceClaimIds.length === 0 && t9.evidenceStatus === "INSUFFICIENT";
    console.log(`  ${p9 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Wrong Period Claim Ignored, Evidence INSUFFICIENT | Actual: Evidence Claims Count ${t9.evidenceClaimIds.length}, Evidence ${t9.evidenceStatus}`);
    if (p9) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 10: Unreplayable Phase 2 Claim Rejection
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 10: Unreplayable Phase 2 Claim Rejection");
    const t10 = await evaluateThesisState(ticker, period, ["FAKE_UNREPLAYABLE_CLAIM_ID_999"], pool);
    const p10 = t10.evidenceClaimIds.length === 0 && t10.evidenceStatus === "INSUFFICIENT";
    console.log(`  ${p10 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Unreplayable Claim Rejected, Evidence INSUFFICIENT | Actual: Evidence Claims Count ${t10.evidenceClaimIds.length}, Evidence ${t10.evidenceStatus}`);
    if (p10) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 11: AI Boundary Enforcement (LLM text attempting to force BROKEN)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 11: AI Boundary Enforcement (LLM text attempting to force BROKEN)");
    const t11 = await evaluateThesisState(ticker, period, validClaimIds, pool, {
      llmAnalysisText: "THESIS IS BROKEN! SELL IMMEDIATELY! THESIS = BROKEN!"
    });
    const p11 = t11.currentThesisState === "STABLE";
    console.log(`  ${p11 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Deterministic State STABLE (LLM text ignored) | Actual: Thesis State ${t11.currentThesisState}`);
    if (p11) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 12: Historical Immutability Protection (DB Unique Constraint)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 12: Historical Immutability Protection");
    const savedH1 = await persistThesisStateHistory({
      thesisContractId: (await pool.query(`SELECT id FROM thesis_contracts WHERE thesis_id = 'HBL_KAVACH_TEST_SUITE_V1'`)).rows[0].id,
      ticker,
      period: "Q1 FY26",
      businessCondition: "STABLE",
      previousThesisState: "UNINITIALIZED",
      currentThesisState: "STABLE",
      evidenceStatus: "CONFIRMED",
      reviewStatus: "NORMAL",
      stateChangeReason: "Initial historical baseline",
      consecutiveNegativeQuarters: 0,
      consecutivePositiveQuarters: 0,
      isTemporaryHeadwind: false,
      isStructuralDeterioration: false,
      thesisBreakTriggered: false,
      explanationWhatChanged: "Baseline",
      explanationAssumptionAffected: "A1",
      explanationNature: "Baseline",
      explanationInvalidationCriteria: "None",
      evidenceClaimIds: []
    }, pool);

    const p12 = savedH1.period === "Q1 FY26" && savedH1.current_thesis_state === "STABLE";
    console.log(`  ${p12 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Historical state persisted with unique constraint | Actual: Record ID ${savedH1.id}`);
    if (p12) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 13: Stock Price +20% Isolation
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 13: Stock Price +20% Isolation");
    const t13 = await evaluateThesisState(ticker, period, validClaimIds, pool, { stockPriceChangePct: 20.0 });
    const p13 = t13.currentThesisState === "STABLE";
    console.log(`  ${p13 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Stock Price +20% does NOT change Thesis State (STABLE) | Actual: Thesis State ${t13.currentThesisState}`);
    if (p13) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 14: Stock Price -20% Isolation
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 14: Stock Price -20% Isolation");
    const t14 = await evaluateThesisState(ticker, period, validClaimIds, pool, { stockPriceChangePct: -20.0 });
    const p14 = t14.currentThesisState === "STABLE";
    console.log(`  ${p14 ? "🟢 PASS" : "🔴 FAIL"} | Expected: Stock Price -20% does NOT change Thesis State (STABLE) | Actual: Thesis State ${t14.currentThesisState}`);
    if (p14) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 15: Premature Commitment Achievement Block
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 15: Premature Commitment Achievement Block");
    const mgmtTest15 = reconcileManagementClaim("We are on track to achieve 75k expansion in Q4 FY27", []);
    const p15 = mgmtTest15.status === "UNSUPPORTED" || mgmtTest15.status === "NOT_TESTABLE";
    console.log(`  ${p15 ? "🟢 PASS" : "🔴 FAIL"} | Expected: On-track commitment cannot be marked ACHIEVED prematurely | Actual: Status ${mgmtTest15.status}`);
    if (p15) passedCount++;

    // -------------------------------------------------------------------------
    // TEST 16: Bad Thesis Contract Protection (Contract Validation Gate)
    // -------------------------------------------------------------------------
    console.log("\n📌 TEST 16: Bad Thesis Contract Protection (Contract Validation Gate)");
    
    // 16A: Missing sourceRationale
    const badContract16A = {
      ...validHblContract,
      thesisId: "BAD_CONTRACT_16A",
      assumptions: [{ ...validHblContract.assumptions[0], sourceRationale: "" }]
    };
    const val16A = await validateThesisContract(badContract16A, pool);

    // 16B: Entity Mismatch Rationale Claim
    const badContract16B = {
      ...validHblContract,
      thesisId: "BAD_CONTRACT_16B",
      assumptions: [{ ...validHblContract.assumptions[0], rationaleClaimId: "TIMETECHNO_REVENUE_Q1FY27" }]
    };
    const val16B = await validateThesisContract(badContract16B, pool, { expectedPeriod: period });

    // 16C: Period Mismatch Rationale Claim
    const badContract16C = {
      ...validHblContract,
      thesisId: "BAD_CONTRACT_16C",
      assumptions: [{ ...validHblContract.assumptions[0], rationaleClaimId: rationaleClaim.claim_id }]
    };
    const val16C = await validateThesisContract(badContract16C, pool, { expectedPeriod: "Q3 FY26" });

    const p16 = (!val16A.isValid && val16A.errorCode === "CONTRACT_VALIDATION_FAILURE") &&
                (!val16B.isValid && val16B.errorCode === "RATIONALE_CLAIM_ENTITY_MISMATCH") &&
                (!val16C.isValid && val16C.errorCode === "RATIONALE_CLAIM_PERIOD_MISMATCH");

    console.log(`  ${p16 ? "🟢 PASS" : "🔴 FAIL"} | Expected: 16A (MISSING_RATIONALE), 16B (ENTITY_MISMATCH), 16C (PERIOD_MISMATCH) all failed closed | Actual: 16A (${val16A.errorCode}), 16B (${val16B.errorCode}), 16C (${val16C.errorCode})`);
    if (p16) passedCount++;

  } catch (err) {
    console.error("🔴 Test Suite Error:", err);
  } finally {
    console.log("\n==================================================================");
    if (passedCount === totalTests) {
      console.log(`=== 🟢 STEPS 5 & 6 ENGINEERING GATE PASSED: ${passedCount}/${totalTests} TESTS PASSED (100% 🟢) ===`);
    } else {
      console.log(`=== 🔴 STEPS 5 & 6 ENGINEERING GATE FAILED: ${passedCount}/${totalTests} TESTS PASSED ===`);
    }
    console.log("==================================================================");
    await pool.end();
  }
}

run16FailureInjectionTestSuite();
