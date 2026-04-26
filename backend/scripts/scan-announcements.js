import { 
  fetchBseAnnouncements, 
  fetchNseAnnouncements,
  shouldProcessAnnouncement, 
  generateAnnouncementHash, 
  isAnnouncementProcessed,
  saveAnnouncement,
  updateStockResultDate,
  resetStuckPending,
  isHeartbeatNeeded,
  markHeartbeatSent
} from "../services/announcement.service.js";
import { classifyAnnouncementWithNim } from "../services/nim.service.js";
import { sendAnnouncementAlert, sendTelegramMessage } from "../services/telegram.service.js";
import { pool } from "../db/pool.js";

/**
 * Retry wrapper for flaky APIs.
 */
async function withRetry(fn, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < retries) {
        const delay = 1000 * (i + 1);
        console.warn(`Retry ${i+1}/${retries} after error: ${e.message}. Waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

const MAX_ALERTS_PER_RUN = 5;

/**
 * Daily Heartbeat to confirm the system is alive.
 * Sent at ~9:30 AM (handled by cron or manual run check).
 */
async function sendHeartbeat() {
  const needed = await isHeartbeatNeeded();
  if (needed) {
    const today = new Date().toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    await sendTelegramMessage(`🟢 *System Heartbeat*\n\nScanner is active and monitoring watchlist.\nDate: ${today}`);
    await markHeartbeatSent();
    console.log("Heartbeat sent.");
  }
}

/**
 * Main Scanning Orchestrator
 */
export async function scan() {
  console.log("Starting Corporate Announcement Scan...");
  
  // 0. System Cleanup & Heartbeat
  await resetStuckPending();
  await sendHeartbeat();

  // 1. Get all stocks from DB
  const { rows: stocks } = await pool.query("SELECT id, ticker, bse_scrip_code FROM stocks");
  console.log(`Scanning ${stocks.length} stocks...`);

  let alertsSent = 0;

  for (const stock of stocks) {
    try {
      console.log(`Checking ${stock.ticker} (${stock.bse_scrip_code})...`);
      
      // 2. Fetch from BOTH BSE and NSE
      let bseList = [];
      let nseList = [];

      try {
        bseList = await fetchBseAnnouncements(stock.bse_scrip_code);
        console.log(`Found ${bseList.length} raw announcements for ${stock.ticker} (BSE)`);
      } catch (err) {
        console.error(`[ERROR] BSE fetch failed for ${stock.ticker}:`, err.message);
      }

      try {
        nseList = await fetchNseAnnouncements(stock.ticker);
        console.log(`Found ${nseList.length} raw announcements for ${stock.ticker} (NSE)`);
      } catch (err) {
        console.error(`[ERROR] NSE fetch failed for ${stock.ticker}:`, err.message);
      }

      // 3. Merge and Deduplicate by Title Hash
      const mergedMap = new Map();
      [...bseList, ...nseList].forEach(ann => {
        const title = ann.NEWSSUB;
        const timestamp = ann.DT_TM;
        const hash = generateAnnouncementHash(stock.ticker, title, timestamp);
        
        if (!mergedMap.has(hash)) {
          mergedMap.set(hash, { ...ann, hash });
        }
      });

      const uniqueAnnouncements = Array.from(mergedMap.values());
      console.log(`Merged to ${uniqueAnnouncements.length} unique announcements for ${stock.ticker}`);

      for (const ann of uniqueAnnouncements) {
        const title = ann.NEWSSUB;
        const hash = ann.hash;
        const sourceId = ann.NEWS_ID;
        const ticker = stock.ticker;

        // 4. Keyword Filter (Stage 1)
        if (!shouldProcessAnnouncement(title)) {
          continue;
        }

        // 5. Deduplicate against DB
        const processed = await isAnnouncementProcessed(ticker, sourceId, hash);
        if (processed) {
          continue;
        }

        console.log(`[NEW] Found potential announcement for ${ticker}: ${title}`);

        // 6. NVIDIA NIM AI Classify (Stage 2) with Retry
        let aiResult;
        try {
          // Passing title as both text and title for now as we don't scrape PDFs yet
          aiResult = await withRetry(() => classifyAnnouncementWithNim(ticker, title, title));
        } catch (err) {
          console.error(`AI Classification permanently failed for ${ticker}:`, err.message);
          continue;
        }

        // 7. Alert if High Priority
        let sentToTelegram = false;
        if (aiResult.priority === "HIGH" && aiResult.confidence === "HIGH") {
          if (alertsSent >= MAX_ALERTS_PER_RUN) {
            console.warn(`[LIMIT] Max alerts reached for this run. Skipping telegram for ${ticker}`);
          } else {
            try {
              await withRetry(() => sendAnnouncementAlert({
                ticker,
                title,
                priority: aiResult.priority,
                impact: aiResult.impact,
                summary: aiResult.summary,
                confidence: aiResult.confidence,
                key_data: aiResult.key_data,
                deep_dive_indicator: aiResult.deep_dive_indicator,
                result_date: aiResult.result_date
              }));
              sentToTelegram = true;
              alertsSent++;
            } catch (err) {
              console.error(`Telegram alert permanently failed for ${ticker}:`, err.message);
            }
          }
        }

        // 8. Save to DB
        await saveAnnouncement({
          stock_id: stock.id,
          ticker,
          source_id: sourceId,
          title_hash: hash,
          title,
          raw_text: title,
          priority: aiResult.priority,
          impact: aiResult.impact,
          confidence: aiResult.confidence,
          summary: aiResult.summary,
          status: sentToTelegram ? "sent" : "ignored",
          sent_to_telegram: sentToTelegram,
          is_earnings_release: aiResult.is_earnings_release || false
        });

        // 9. Update Result Date if found
        if (aiResult.result_date) {
          await updateStockResultDate(stock.id, aiResult.result_date, aiResult.confidence);
        }
      }
    } catch (err) {
      console.error(`Failed to scan ${stock.ticker}:`, err.message);
    }
  }

  console.log("Scan complete.");
}

// Check if run directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  scan().then(() => {
    console.log("Process finished.");
    process.exit(0);
  }).catch(err => {
    console.error("Fatal error during scan:", err);
    process.exit(1);
  });
}
