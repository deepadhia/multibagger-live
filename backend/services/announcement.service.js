import crypto from "crypto";
import { pool } from "../db/pool.js";

const HIGH_KEYWORDS = [
  "order", "contract", "work order", "order win", "loa", "letter of award",
  "tender", "project", "agreement", "strategic",
  "acquisition", "merger", "demerger",
  "expansion", "capacity expansion", "capex", "investment",
  "fund raising", "qip",
  "results", "financial results", "earnings", "guidance", "outlook",
  "margin", "ebitda", "profit warning",
  "delay", "default", "downgrade",
  "resignation", "auditor resignation",
  "fraud", "investigation",
  "insolvency", "nclt"
];

const LOW_KEYWORDS = [
  "loss of share certificate", "duplicate certificate",
  "intimation", "closure of trading window",
  "compliance certificate",
  "regulation 30", "regulation 39",
  "voting results", "scrutinizer report",
  "agm notice", "postal ballot"
];

const MEDIUM_KEYWORDS = [
  "dividend", "interim dividend", "final dividend",
  "board meeting", "committee meeting",
  "credit rating", "reaffirmation",
  "investor meeting", "analyst call", "presentation",
  "allotment of shares", "esop"
];

/**
 * First-pass keyword filter to ignore routine filings.
 */
export function shouldProcessAnnouncement(title) {
  const t = String(title || "").toLowerCase();

  if (LOW_KEYWORDS.some(k => t.includes(k))) return false;
  if (HIGH_KEYWORDS.some(k => t.includes(k))) return true;
  if (MEDIUM_KEYWORDS.some(k => t.includes(k))) return true; // Process for silent logging

  return false; 
}

/**
 * Resets announcements stuck in 'pending' for too long.
 */
export async function resetStuckPending(timeoutMs = 15 * 60 * 1000) {
  const timeoutSec = Math.floor(timeoutMs / 1000);
  await pool.query(
    `UPDATE corporate_announcements 
     SET status = 'failed' 
     WHERE status = 'pending' 
     AND processed_at < NOW() - interval '${timeoutSec} seconds'`
  );
}

/**
 * Fetches recent announcements from BSE API for a specific scrip code.
 * @param {string} scripCode 
 */
export async function fetchBseAnnouncements(scripCode) {
  if (!scripCode) return [];

  const url = `https://api.bseindia.com/BseIndiaAPI/api/AnnSubCategoryGetData/w`;
  const params = new URLSearchParams({
    strCat: "Company Update",
    strScrip: scripCode
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Origin": "https://www.bseindia.com",
      "Referer": "https://www.bseindia.com/",
      "Connection": "keep-alive"
    },
  });

  if (!response.ok) {
    console.error(`BSE API failed for ${scripCode}:`, response.status);
    return [];
  }

  const data = await response.json();
  // BSE API usually returns { Table: [...] }
  return data.Table || [];
}

/**
 * Fetches NSE session cookies.
 */
let nseCookies = "";
async function getNseCookies() {
  if (nseCookies) return nseCookies;
  const res = await fetch("https://www.nseindia.com/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    nseCookies = setCookie.split(";")[0];
  }
  return nseCookies;
}

/**
 * Fetches recent announcements from NSE API for a specific symbol.
 */
export async function fetchNseAnnouncements(symbol) {
  if (!symbol) return [];
  const cookies = await getNseCookies();
  
  const url = `https://www.nseindia.com/api/corporate-announcements`;
  const params = new URLSearchParams({
    index: "equities",
    symbol: symbol
  });

  const response = await fetch(`${url}?${params.toString()}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Referer": `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`,
      "Cookie": cookies
    },
  });

  if (!response.ok) {
    console.error(`NSE API failed for ${symbol}:`, response.status);
    return [];
  }

  const data = await response.json();
  const lookbackDays = new Date();
  lookbackDays.setDate(lookbackDays.getDate() - 30);

  // NSE returns an array directly. Filter for last 30 days to avoid history bloat.
  return (data || [])
    .filter(ann => {
      const annDate = new Date(ann.sort_date || ann.an_dt || ann.dt);
      return annDate >= lookbackDays;
    })
    .map(ann => ({
      NEWS_ID: ann.seq_id || ann.desc, 
      NEWSSUB: ann.desc,
      DT_TM: ann.sort_date || ann.an_dt,
      SOURCE: "NSE"
    }));
}

/**
 * Generates a unique hash for an announcement to prevent duplicates 
 * when source_id (NEWS_ID) is missing or unreliable.
 */
export function generateAnnouncementHash(ticker, title, timestamp) {
  const data = `${ticker}:${title}:${timestamp}`;
  return crypto.createHash("md5").update(data).digest("hex");
}

/**
 * Checks if an announcement has already been processed in the DB.
 */
export async function isAnnouncementProcessed(ticker, sourceId, titleHash) {
  const result = await pool.query(
    `SELECT id FROM corporate_announcements 
     WHERE ticker = $1 AND (source_id = $2 OR title_hash = $3)`,
    [ticker, sourceId, titleHash]
  );
  return result.rows.length > 0;
}

/**
 * Saves a processed announcement to the database.
 */
export async function saveAnnouncement({
  stock_id, ticker, source_id, title_hash, title, raw_text, priority, impact, confidence, summary, status, sent_to_telegram, is_earnings_release
}) {
  await pool.query(
    `INSERT INTO corporate_announcements 
      (stock_id, ticker, source_id, title_hash, title, raw_text, priority, impact, confidence, summary, status, sent_to_telegram, is_earnings_release, processed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
    [stock_id, ticker, source_id, title_hash, title, raw_text, priority, impact, confidence, summary, status, sent_to_telegram, is_earnings_release]
  );
}

/**
 * Validates date format YYYY-MM-DD.
 */
export function isValidDate(dateStr) {
  if (!dateStr) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * Updates the result date for a specific stock with validation guards.
 */
export async function updateStockResultDate(stockId, resultDate, confidence) {
  if (!isValidDate(resultDate) || confidence !== "HIGH") {
    console.warn(`[DATE] Skipped update for stock ${stockId}: Invalid date or low confidence.`);
    return;
  }

  const existingRes = await pool.query(
    "SELECT next_results_date FROM stocks WHERE id = $1",
    [stockId]
  );
  const existing = existingRes.rows[0]?.next_results_date;
  
  // Format existing date to YYYY-MM-DD for comparison if it's a Date object
  const existingStr = existing ? new Date(existing).toISOString().split('T')[0] : null;

  if (resultDate !== existingStr) {
    await pool.query(
      "UPDATE stocks SET next_results_date = $1 WHERE id = $2",
      [resultDate, stockId]
    );
    console.log(`[DATE] Updated result date for ${stockId}: ${existingStr || 'none'} -> ${resultDate}`);
  }
}

/**
 * Checks if a heartbeat is needed for today.
 */
export async function isHeartbeatNeeded() {
  const res = await pool.query("SELECT value FROM system_settings WHERE key = 'last_heartbeat_at'");
  const lastHeartbeat = res.rows[0]?.value;
  const today = new Date().toISOString().split('T')[0];
  return lastHeartbeat !== today;
}

/**
 * Marks today's heartbeat as sent.
 */
export async function markHeartbeatSent() {
  const today = new Date().toISOString().split('T')[0];
  await pool.query(
    "UPDATE system_settings SET value = $1, updated_at = NOW() WHERE key = 'last_heartbeat_at'",
    [JSON.stringify(today)]
  );
}
