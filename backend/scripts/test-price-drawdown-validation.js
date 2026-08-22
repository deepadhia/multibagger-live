/**
 * Test Suite: 18-Stock Price Drawdown & Alpha Validation Invariants
 * 
 * Verifies:
 *   1. 100% Portfolio Universe Coverage (18/18 stocks)
 *   2. Drawdown Avoidance Bounds:
 *      - ELECON drawdown avoided >= 30%
 *      - SHAKTIPUMP drawdown avoided >= 25%
 *   3. Operational Lead Alpha Bounds:
 *      - TIMETECHNO total cycle return >= +50%
 *      - GRAVITA total cycle return >= +50%
 *      - CCL total cycle return >= +50%
 *   4. Zero Ranking Layer Mutations (18/18 ranking invariance preserved)
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
import { pool } from '../db/pool.js';
import { generatePriceDrawdownValidation } from './generate-price-drawdown-validation.js';

async function runPriceDrawdownTests() {
  console.log('\n========================================================================');
  console.log('🧪 RUNNING INVARIANT TEST SUITE: PRICE DRAWDOWN & ALPHA VALIDATION');
  console.log('========================================================================\n');

  // 1. Run validation
  await generatePriceDrawdownValidation();

  const jsonPath = path.resolve('reports/thesis_board/price-drawdown-validation.json');
  assert(fs.existsSync(jsonPath), 'JSON validation file must exist');

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const results = data.validationResults;

  // Test 1: 18/18 Coverage
  assert.strictEqual(results.length, 18, 'Must cover exactly 18 stocks');
  console.log('  ✓ [PASS] Invariant 1: 100% portfolio coverage (18/18 stocks verified)');

  // Test 2: Drawdown Avoidance
  const elecon = results.find(r => r.ticker === 'ELECON');
  assert(elecon, 'ELECON must exist');
  assert.strictEqual(elecon.verdict, 'EARLY_WARNING');
  const eleconAvoided = parseFloat(elecon.drawdownAvoidedPct);
  assert(eleconAvoided >= 30, `ELECON drawdown avoided must be >= 30% (got ${eleconAvoided}%)`);

  const shakti = results.find(r => r.ticker === 'SHAKTIPUMP');
  assert(shakti, 'SHAKTIPUMP must exist');
  const shaktiAvoided = parseFloat(shakti.drawdownAvoidedPct);
  assert(shaktiAvoided >= 25, `SHAKTIPUMP drawdown avoided must be >= 25% (got ${shaktiAvoided}%)`);
  console.log(`  ✓ [PASS] Invariant 2: Drawdown avoidance validated (ELECON: ${elecon.drawdownAvoidedPct}, SHAKTIPUMP: ${shakti.drawdownAvoidedPct})`);

  // Test 3: Operational Lead Alpha Capture
  const timetechno = results.find(r => r.ticker === 'TIMETECHNO');
  assert(timetechno, 'TIMETECHNO must exist');
  assert.strictEqual(timetechno.verdict, 'OPERATIONAL_LEAD');
  assert(parseFloat(timetechno.totalCycleReturnPct) >= 50, 'TIMETECHNO total return must be >= 50%');

  const gravita = results.find(r => r.ticker === 'GRAVITA');
  assert(gravita, 'GRAVITA must exist');
  assert.strictEqual(gravita.verdict, 'OPERATIONAL_LEAD');
  assert(parseFloat(gravita.totalCycleReturnPct) >= 50, 'GRAVITA total return must be >= 50%');

  const ccl = results.find(r => r.ticker === 'CCL');
  assert(ccl, 'CCL must exist');
  assert.strictEqual(ccl.verdict, 'OPERATIONAL_LEAD');
  assert(parseFloat(ccl.totalCycleReturnPct) >= 50, 'CCL total return must be >= 50%');
  console.log(`  ✓ [PASS] Invariant 3: Operational lead alpha validated (TIMETECHNO: ${timetechno.totalCycleReturnPct}, GRAVITA: ${gravita.totalCycleReturnPct}, CCL: ${ccl.totalCycleReturnPct})`);

  // Test 4: Ranking Layer Invariance
  const defaultBefore = path.resolve('reports/kpi_shadow/ranking_before.json');
  const defaultAfter = path.resolve('reports/kpi_shadow/ranking_after.json');
  if (fs.existsSync(defaultBefore) && fs.existsSync(defaultAfter)) {
    const before = JSON.parse(fs.readFileSync(defaultBefore, 'utf-8'));
    const after = JSON.parse(fs.readFileSync(defaultAfter, 'utf-8'));
    assert.deepStrictEqual(before, after, 'Ranking layer must be 100% frozen (0 mutations)');
    console.log('  ✓ [PASS] Invariant 4: Zero ranking mutations (18/18 ranking invariance preserved)');
  }

  console.log('\n════════════════════════════════════════════════════════════════════════');
  console.log('🎉 ALL PRICE DRAWDOWN & ALPHA VALIDATION INVARIANT TESTS PASSED!');
  console.log('════════════════════════════════════════════════════════════════════════\n');
}

runPriceDrawdownTests()
  .then(() => pool.end())
  .catch(err => {
    console.error('❌ Test failed:', err);
    pool.end();
    process.exit(1);
  });
