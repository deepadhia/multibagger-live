/**
 * Permanent Regression Test Suite for Canonical Fiscal Quarter Utility
 * 
 * Verifies:
 *   1. Quarter ordering: Q1_FY26 < Q2_FY26 < Q3_FY26 < Q4_FY26 < Q1_FY27
 *   2. Strict recency: Q1_FY27 > Q4_FY26
 *   3. Latest quarter detection from arbitrary unsorted lists
 *   4. Mathematical offsets (YoY -4, QoQ -1, Forward +1)
 *   5. Multi-format parsing normalization (Q1_FY27, FY27-Q1, Q1 FY27, Jun 2026, FY2027-Q1)
 */

import {
  parseFiscalQuarter,
  compareFiscalQuarters,
  compareFiscalQuartersDesc,
  sortFiscalQuarters,
  latestQuarter,
  getQuarterOffset,
  isBefore,
  isAfter,
  isEqual
} from '../utils/fiscal-quarter.js';

export function runFiscalQuarterRegressionTests() {
  console.log('========================================================================');
  console.log('🧪 RUNNING CANONICAL FISCAL QUARTER REGRESSION TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Strict Ordering across FY26 -> FY27
  console.log('--- 1. Chronological Sequence & Transitivity ---');
  assert(compareFiscalQuarters('Q1_FY26', 'Q2_FY26') < 0, 'Q1_FY26 < Q2_FY26');
  assert(compareFiscalQuarters('Q2_FY26', 'Q3_FY26') < 0, 'Q2_FY26 < Q3_FY26');
  assert(compareFiscalQuarters('Q3_FY26', 'Q4_FY26') < 0, 'Q3_FY26 < Q4_FY26');
  assert(compareFiscalQuarters('Q4_FY26', 'Q1_FY27') < 0, 'Q4_FY26 < Q1_FY27 (Cross-year boundary)');
  assert(compareFiscalQuarters('Q3_FY26', 'Q1_FY27') < 0, 'Q3_FY26 < Q1_FY27 (Eliminates ASCII 3 > 1 string trap)');
  assert(compareFiscalQuarters('Q1_FY27', 'Q4_FY26') > 0, 'Q1_FY27 > Q4_FY26 (Recency invariant)');

  // 2. Helper predicates
  console.log('\n--- 2. Helper Predicates (isBefore, isAfter, isEqual) ---');
  assert(isBefore('Q4_FY26', 'Q1_FY27'), 'isBefore("Q4_FY26", "Q1_FY27") === true');
  assert(isAfter('Q1_FY27', 'Q4_FY26'), 'isAfter("Q1_FY27", "Q4_FY26") === true');
  assert(isEqual('Q1_FY27', 'FY27-Q1'), 'isEqual("Q1_FY27", "FY27-Q1") === true');
  assert(!isBefore('Q1_FY27', 'Q4_FY26'), 'isBefore("Q1_FY27", "Q4_FY26") === false');

  // 3. Latest Quarter Detection
  console.log('\n--- 3. Latest Quarter Selection ---');
  const unsorted1 = ['Q3_FY26', 'Q1_FY27', 'Q4_FY26', 'Q1_FY26', 'Q2_FY26'];
  assert(latestQuarter(unsorted1) === 'Q1_FY27', 'latestQuarter([Q3_FY26, Q1_FY27, Q4_FY26...]) === "Q1_FY27"');
  
  const sortedAsc = sortFiscalQuarters(unsorted1, false);
  assert(JSON.stringify(sortedAsc) === JSON.stringify(['Q1_FY26', 'Q2_FY26', 'Q3_FY26', 'Q4_FY26', 'Q1_FY27']), 'sortFiscalQuarters(ascending) produces strictly ordered sequence');

  // 4. Offsets & Math
  console.log('\n--- 4. Quarter Offsets (QoQ / YoY) ---');
  assert(getQuarterOffset('Q1_FY27', -1) === 'Q4_FY26', 'getQuarterOffset("Q1_FY27", -1) === "Q4_FY26"');
  assert(getQuarterOffset('Q1_FY27', -4) === 'Q1_FY26', 'getQuarterOffset("Q1_FY27", -4) === "Q1_FY26" (YoY prior quarter)');
  assert(getQuarterOffset('Q4_FY26', +1) === 'Q1_FY27', 'getQuarterOffset("Q4_FY26", +1) === "Q1_FY27" (Next fiscal year)');
  assert(getQuarterOffset('Q2_FY26', -1) === 'Q1_FY26', 'getQuarterOffset("Q2_FY26", -1) === "Q1_FY26"');

  // 5. Multi-Representation Normalization
  console.log('\n--- 5. Multi-Format Normalization ---');
  const formatsQ1FY27 = ['Q1_FY27', 'FY27-Q1', 'Q1 FY27', 'Jun 2026', 'FY2027-Q1', 'Q1-FY27'];
  for (const f of formatsQ1FY27) {
    const p = parseFiscalQuarter(f);
    assert(p.key === 2701 && p.label === 'Q1_FY27', `Format "${f}" -> key: 2701, label: "Q1_FY27" (actual: ${p.key}, ${p.label})`);
  }

  const formatsQ4FY26 = ['Q4_FY26', 'FY26-Q4', 'Q4 FY26', 'Mar 2026', 'FY2026-Q4', 'Q4-FY26'];
  for (const f of formatsQ4FY26) {
    const p = parseFiscalQuarter(f);
    assert(p.key === 2604 && p.label === 'Q4_FY26', `Format "${f}" -> key: 2604, label: "Q4_FY26" (actual: ${p.key}, ${p.label})`);
  }

  console.log('\n========================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    throw new Error(`Fiscal quarter regression test failed with ${failed} failures.`);
  }

  return { passed, failed };
}

if (process.argv[1]?.endsWith('test-fiscal-quarters.js') || process.argv[1]?.endsWith('fiscal-quarter.test.js')) {
  try {
    runFiscalQuarterRegressionTests();
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }
}
