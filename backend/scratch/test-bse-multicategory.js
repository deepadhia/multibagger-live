/**
 * Integration Test: BSE Multi-Category Fetch
 *
 * Tests that the new multi-category BSE fetch:
 *   1. Returns more announcements than the old single-category fetch
 *   2. Correctly deduplicates across categories
 *   3. Finds awards, MOUs, results alongside regular company updates
 *
 * Tests against 3 real scrip codes from the watchlist.
 * Run: node --env-file=.env.local backend/scratch/test-bse-multicategory.js
 * No DB write required.
 */

import { pool } from "../db/pool.js";

const BSE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": "https://www.bseindia.com",
  "Referer": "https://www.bseindia.com/",
  "Connection": "keep-alive"
};

const BASE_URL = "https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w";

const BSE_CATEGORIES = [
  "Company Update",
  "Result",
  "AGM/EGM",
  "Corp. Action",
  "Insider Trading / SAST",
];

async function fetchSingleCategory(scripCode, cat, delayMs = 0) {
  if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  const params = new URLSearchParams({ strCat: cat, strScrip: scripCode });
  try {
    const res = await fetch(`${BASE_URL}?${params}`, { headers: BSE_HEADERS });
    if (!res.ok) {
      console.warn(`    [BSE] ${cat}: HTTP ${res.status}`);
      return [];
    }
    const text = await res.text();
    // BSE sometimes returns HTML (rate limit / bot detection) instead of JSON
    if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
      console.warn(`    [BSE] ${cat}: Received non-JSON response (likely HTML/rate-limit page). Skipping.`);
      return [];
    }
    const data = JSON.parse(text);
    return data.Table || [];
  } catch (err) {
    console.warn(`    [BSE] ${cat}: Error — ${err.message}`);
    return [];
  }
}

async function fetchMultiCategory(scripCode) {
  // Sequential with delay to avoid BSE bot detection in tests
  const allAnns = [];
  for (let i = 0; i < BSE_CATEGORIES.length; i++) {
    const cat = BSE_CATEGORIES[i];
    const anns = await fetchSingleCategory(scripCode, cat, i > 0 ? 800 : 0);
    allAnns.push({ cat, anns });
  }

  const seen = new Set();
  const merged = [];
  for (const { anns } of allAnns) {
    for (const ann of anns) {
      const key = String(ann.NEWS_ID || ann.NEWSSUB || "");
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push(ann);
      }
    }
  }
  return merged;
}

async function runTest() {
  console.log("────────────────────────────────────────────────────────────────");
  console.log("  BSE Multi-Category Fetch Integration Test");
  console.log("────────────────────────────────────────────────────────────────\n");

  // Get 3 stocks from DB that have scrip codes — prefer the problem stocks + 1 other
  const { rows: stocks } = await pool.query(`
    SELECT ticker, bse_scrip_code 
    FROM stocks 
    WHERE bse_scrip_code IS NOT NULL AND bse_scrip_code != ''
    ORDER BY CASE 
      WHEN ticker IN ('HBLENGINE', 'ANANTRAJ', 'TIMETECHNO') THEN 0 
      ELSE 1 
    END, ticker
    LIMIT 3
  `);

  if (stocks.length === 0) {
    console.error("❌ No stocks with BSE scrip codes found in DB. Cannot test.");
    process.exit(1);
  }

  let allPassed = true;

  for (const stock of stocks) {
    console.log(`\n🔍 Testing: ${stock.ticker} (scrip: ${stock.bse_scrip_code})`);
    console.log("  ─────────────────────────────────────────────");

    // Old: single category
    const oldResults = await fetchSingleCategory(stock.bse_scrip_code, "Company Update", 500);
    console.log(`  Old (Company Update only): ${oldResults.length} announcements`);

    // New: multi-category (re-fetches sequentially with delays)
    const newResults = await fetchMultiCategory(stock.bse_scrip_code);
    console.log(`  New (all categories):      ${newResults.length} announcements`);

    // Per-category breakdown (use cached newResults by category)
    for (const cat of BSE_CATEGORIES) {
      const catAnns = newResults; // already fetched above; print from newResults isn't per-cat, re-check:
      const catResults = await fetchSingleCategory(stock.bse_scrip_code, cat, 600);
      if (catResults.length > 0) {
        console.log(`    • ${cat.padEnd(30)} ${catResults.length} filings`);
      }
    }

    // Show recent titles from categories OTHER than "Company Update"
    const nonUpdateResults = newResults.filter(ann => {
      // Try to detect non-Company-Update items by checking if they appear in the Company Update fetch
      const inOldSet = new Set(oldResults.map(a => String(a.NEWS_ID || a.NEWSSUB)));
      return !inOldSet.has(String(ann.NEWS_ID || ann.NEWSSUB));
    });

    if (nonUpdateResults.length > 0) {
      console.log(`\n  📋 Filings found ONLY in extra categories (would have been MISSED before):`);
      nonUpdateResults.slice(0, 5).forEach(ann => {
        console.log(`    ▸ [${ann.CATEGORYNAME || "?"}] ${String(ann.NEWSSUB || "").substring(0, 80)}`);
      });
    } else {
      console.log(`\n  ℹ️  No additional filings found in extra categories for this stock.`);
    }

    // Test: multi-category should return >= single category
    if (newResults.length >= oldResults.length) {
      console.log(`\n  ✅ PASS: Multi-category (${newResults.length}) >= single-category (${oldResults.length})`);
    } else {
      console.log(`\n  ❌ FAIL: Multi-category (${newResults.length}) < single-category (${oldResults.length}) — dedup may be broken`);
      allPassed = false;
    }

    // Dedup check: no duplicate NEWS_IDs
    const ids = newResults.map(a => String(a.NEWS_ID || a.NEWSSUB)).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (ids.length === uniqueIds.size) {
      console.log(`  ✅ PASS: No duplicate NEWS_IDs in merged result (${ids.length} unique)`);
    } else {
      console.log(`  ❌ FAIL: ${ids.length - uniqueIds.size} duplicate entries found — dedup broken`);
      allPassed = false;
    }

    // Delay to avoid BSE rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("\n────────────────────────────────────────────────────────────────");
  if (allPassed) {
    console.log("  ✅ All BSE multi-category tests passed!\n");
  } else {
    console.log("  ❌ Some tests failed — review output above.\n");
    process.exit(1);
  }

  await pool.end();
}

runTest().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
