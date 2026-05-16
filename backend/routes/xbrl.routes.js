import express from "express";
import { fetchAndStoreXbrlMetrics, getXbrlMetricsForPrompt } from "../services/xbrl.service.js";
import { pool } from "../db/pool.js";

export const xbrlRouter = express.Router();

/**
 * POST /api/xbrl/fetch
 * Fetch NSE quarterly results for a stock and store in xbrl_metrics_quarterly.
 * Body: { stock_id, ticker } or { ticker } (auto-resolves stock_id)
 */
xbrlRouter.post("/api/xbrl/fetch", async (req, res) => {
  try {
    let { stock_id, ticker } = req.body || {};
    if (!ticker) return res.status(400).json({ ok: false, error: "ticker required" });

    // Auto-resolve stock_id if not provided
    if (!stock_id) {
      const r = await pool.query(
        "SELECT id, bse_scrip_code FROM stocks WHERE UPPER(TRIM(ticker)) = $1",
        [ticker.toUpperCase().trim()]
      );
      if (!r.rows[0]) return res.status(404).json({ ok: false, error: `Stock not found: ${ticker}` });
      stock_id = r.rows[0].id;
      const bse_scrip_code = r.rows[0].bse_scrip_code;
      const result = await fetchAndStoreXbrlMetrics({ stock_id, ticker, bse_scrip_code });
      return res.json(result);
    }

    const r = await pool.query("SELECT bse_scrip_code FROM stocks WHERE id = $1", [stock_id]);
    const bse_scrip_code = r.rows[0]?.bse_scrip_code;
    const result = await fetchAndStoreXbrlMetrics({ stock_id, ticker, bse_scrip_code });
    return res.json(result);
  } catch (err) {
    console.error("[XBRL fetch]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/xbrl/fetch-all
 * Fetch XBRL data for all watchlist stocks.
 * Body: { tickers?: string[] } — if omitted, fetches for all stocks with bse_scrip_code
 */
xbrlRouter.post("/api/xbrl/fetch-all", async (req, res) => {
  try {
    const { tickers } = req.body || {};
    let stockRows;
    if (Array.isArray(tickers) && tickers.length > 0) {
      const upper = tickers.map(t => t.toUpperCase().trim());
      const r = await pool.query(
        "SELECT id, ticker, bse_scrip_code FROM stocks WHERE UPPER(TRIM(ticker)) = ANY($1)",
        [upper]
      );
      stockRows = r.rows;
    } else {
      const r = await pool.query("SELECT id, ticker, bse_scrip_code FROM stocks ORDER BY ticker");
      stockRows = r.rows;
    }

    const results = [];
    for (const stock of stockRows) {
      try {
        const result = await fetchAndStoreXbrlMetrics({
          stock_id: stock.id,
          ticker: stock.ticker,
          bse_scrip_code: stock.bse_scrip_code,
        });
        results.push({ ticker: stock.ticker, ...result });
      } catch (err) {
        results.push({ ticker: stock.ticker, ok: false, error: err.message });
      }
    }

    const succeeded = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    return res.json({ ok: true, total: results.length, succeeded, failed, results });
  } catch (err) {
    console.error("[XBRL fetch-all]", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/xbrl/metrics/:stockId
 * Get all quarterly metrics for a stock, newest first.
 */
xbrlRouter.get("/api/xbrl/metrics/:stockId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM xbrl_metrics_quarterly WHERE stock_id = $1 ORDER BY period_end_date DESC",
      [req.params.stockId]
    );

    // Calculate Alpha Signals for each quarter
    const enrichedRows = rows.map((row, idx) => {
      const signals = calculateAlphaSignals(rows, idx);
      return { ...row, alpha_signals: signals };
    });

    return res.json(enrichedRows);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/xbrl/:stockId/:quarter
 * Get a single quarter's XBRL data.
 */
xbrlRouter.get("/api/xbrl/:stockId/:quarter", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM xbrl_metrics_quarterly WHERE stock_id = $1 AND quarter = $2 ORDER BY source",
      [req.params.stockId, req.params.quarter]
    );
    return res.json({ ok: true, data: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/xbrl/:stockId
 * List all stored XBRL quarters for a stock.
 */
xbrlRouter.get("/api/xbrl/:stockId", async (req, res) => {
  try {
    const rows = await getXbrlMetricsForPrompt(req.params.stockId, null);
    return res.json({ ok: true, quarters: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

