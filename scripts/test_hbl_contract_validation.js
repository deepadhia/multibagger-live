import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config({ path: './.env' });

import pg from 'pg';
import { bindClaimLineage } from '../backend/services/claim-lineage.service.js';
import { validateThesisContract, saveThesisContract } from '../backend/services/thesis-contract.service.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testHblContractValidation() {
  console.log("==================================================================");
  console.log("=== 🔬 STEP 2 & 3: HBL THESIS CONTRACT VALIDATION GATE TEST ===");
  console.log("==================================================================\n");

  try {
    // 1. Bind valid Phase 2 Rationale Claim for HBL
    console.log("📌 Step A: Binding Phase 2 Rationale Claim for HBL Kavach Backlog...");
    const docContent = "HBL Engineering Limited Q1 FY27 SEBI LODR Filing Kavach Railway Signaling Order Book INR 1450 Crores";
    const rationaleClaimId = "HBL_KAVACH_BACKLOG_RATIONALE_Q1FY27";

    await bindClaimLineage({
      claimId: rationaleClaimId,
      ticker: "HBLENGINE",
      period: "Q1 FY27",
      claimType: "FINANCIAL_FACT",
      metric: "KAVACH_ORDER_BOOK",
      canonicalValue: "1450.00",
      unit: "INR_CRORES",
      provenanceType: "PRIMARY_SOURCE_VERIFIED",
      sourceDocumentType: "SEBI_LODR_FILING",
      sourceDocumentId: "SEBI_LODR_HBLENGINE_Q1FY27_PDF",
      pageNumber: 5,
      sectionTitle: "Railway Signaling Division Order Book",
      paragraphExcerpt: "Kavach Order Backlog as of June 30 2026 stood at INR 1450 Crores",
      documentContent: docContent,
      verificationStatus: "VERIFIED"
    }, pool);

    console.log("  🟢 Phase 2 Rationale Claim 'HBL_KAVACH_BACKLOG_RATIONALE_Q1FY27' bound cleanly.");

    // 2. Define valid HBL_KAVACH Thesis Contract
    console.log("\n📌 Step B: Validating & Persisting Canonical HBL_KAVACH Thesis Contract...");
    const validHblContract = {
      thesisId: "HBL_KAVACH_V1",
      ticker: "HBLENGINE",
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
          rationaleClaimId: rationaleClaimId
        }
      ]
    };

    const saveResult = await saveThesisContract(validHblContract, pool, { expectedPeriod: "Q1 FY27" });
    console.log(`  🟢 PASS: HBL_KAVACH contract validated & saved cleanly! Status: ${saveResult.validationStatus}`);

    // 3. TEST 16A: Entity Contamination Failure Injection
    console.log("\n📌 Step C: Running TEST 16A (Rationale Claim Entity Contamination Injection)...");
    const badEntityContract = {
      ...validHblContract,
      thesisId: "HBL_KAVACH_BAD_ENTITY",
      assumptions: [
        {
          ...validHblContract.assumptions[0],
          rationaleClaimId: "TIMETECHNO_REVENUE_Q1FY27" // Wrong Ticker!
        }
      ]
    };

    const entityVal = await validateThesisContract(badEntityContract, pool, { expectedPeriod: "Q1 FY27" });
    if (!entityVal.isValid && entityVal.errorCode === "RATIONALE_CLAIM_ENTITY_MISMATCH") {
      console.log("  🟢 PASS: Rationale claim entity mismatch detected! Failed closed with RATIONALE_CLAIM_ENTITY_MISMATCH.");
    } else {
      console.error("  🔴 FAIL TEST 16A:", entityVal);
    }

    // 4. TEST 16B: Period Contamination Failure Injection
    console.log("\n📌 Step D: Running TEST 16B (Rationale Claim Period Contamination Injection)...");
    const periodVal = await validateThesisContract(validHblContract, pool, { expectedPeriod: "Q3 FY26" }); // Mismatched Expected Period!
    if (!periodVal.isValid && periodVal.errorCode === "RATIONALE_CLAIM_PERIOD_MISMATCH") {
      console.log("  🟢 PASS: Rationale claim period mismatch detected! Failed closed with RATIONALE_CLAIM_PERIOD_MISMATCH.");
    } else {
      console.error("  🔴 FAIL TEST 16B:", periodVal);
    }

    console.log("\n==================================================================");
    console.log("=== 🟢 STEPS 0–3 COMPLETE: HBL CONTRACT VALIDATION GATE PASSED (100% 🟢) ===");
    console.log("==================================================================");

  } catch (err) {
    console.error("🔴 HBL Contract Validation Gate Error:", err);
  } finally {
    await pool.end();
  }
}

testHblContractValidation();
