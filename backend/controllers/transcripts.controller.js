import {
  downloadTranscriptsPipeline,
  listDownloadedFilesForSymbol,
  resetTranscriptFilesByPeriod,
  resetAllTranscriptFiles,
  saveFilingDriveLinks,
  getAlreadyUploadedKeys,
  getSymbolDebugInfo,
  getScreenerLinksDebug,
  deleteFilingFile,
  resetAllFilesForSymbol,
} from "../services/transcripts.service.js";
import { uploadAnnouncementsToDrive, isDriveConfigured, getDriveStatus } from "../services/drive.service.js";
import { syncAnnouncementsForTicker } from "../services/announcement.service.js";
import { pool } from "../db/pool.js";

export async function downloadTranscriptsHandler(req, res) {
  const { window = "3q", symbols, stockIds, useWatchlist = true, onlyMissing = false, uploadAfterDownload = false } = req.body ?? {};

  try {
    const result = await downloadTranscriptsPipeline({
      window,
      symbols,
      stockIds,
      useWatchlist,
      onlyMissing: Boolean(onlyMissing),
      uploadAfterDownload: Boolean(uploadAfterDownload),
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("transcripts/download error:", err);
    if (err && err.code === "NO_SYMBOLS") {
      return res.status(400).json({ ok: false, error: err.message });
    }
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export async function listTranscriptFilesHandler(req, res) {
  try {
    const { symbol, files } = await listDownloadedFilesForSymbol(req.params.symbol);
    res.set("Cache-Control", "no-store");
    res.json({ ok: true, symbol, files });
  } catch (err) {
    console.error("transcripts/files error:", err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export async function uploadToDriveHandler(req, res) {
  try {
    const symbol = req.body?.symbol ? String(req.body.symbol).toUpperCase() : null;

    if (!isDriveConfigured()) {
      return res.status(503).json({
        ok: false,
        error: "Google Drive upload is not configured. See docs/GOOGLE_DRIVE_SETUP.md",
      });
    }

    const alreadyUploadedKeys = symbol ? await getAlreadyUploadedKeys(symbol) : null;
    const result = await uploadAnnouncementsToDrive(symbol, alreadyUploadedKeys);
    if (result.uploaded?.length > 0) {
      await saveFilingDriveLinks(result.uploaded);
    }
    res.json({
      ok: true,
      uploaded: result.uploaded.length,
      total: result.uploaded.length + (result.errors?.length || 0) + result.skipped,
      files: result.uploaded,
      errors: result.errors,
    });
  } catch (err) {
    console.error("transcripts/upload-to-drive error:", err);
    if (err?.code === "DRIVE_NOT_CONFIGURED") {
      return res.status(503).json({ ok: false, error: err.message });
    }
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export function driveStatusHandler(_req, res) {
  try {
    const { driveConfigured, needsConnect, isOAuthConfigured, oauthPath } = getDriveStatus();
    res.set("Cache-Control", "no-store");
    res.json({ 
      ok: true, 
      driveConfigured, 
      needsConnect: needsConnect || false,
      isOAuthConfigured: isOAuthConfigured || false,
      oauthPath
    });
  } catch {
    res.json({ ok: true, driveConfigured: false, needsConnect: false, isOAuthConfigured: false });
  }
}

/** GET /api/transcripts/debug/:symbol - inspect DB data for a ticker (e.g. TIMETECHNO). */
export async function debugSymbolHandler(req, res) {
  try {
    const symbol = req.params.symbol;
    const info = await getSymbolDebugInfo(symbol);
    if (info.error) {
      return res.status(500).json({ ok: false, ...info });
    }
    res.json({ ok: true, ...info });
  } catch (err) {
    console.error("transcripts/debug error:", err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/** GET /api/transcripts/debug/screener-links/:symbol - inspect what Screener scrape captured (earnings vs presentation vs concall). */
export function debugScreenerLinksHandler(req, res) {
  try {
    const symbol = req.params.symbol;
    const info = getScreenerLinksDebug(symbol);
    res.json({ ok: true, ...info });
  } catch (err) {
    console.error("transcripts/debug/screener-links error:", err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

export async function resetTranscriptsHandler(req, res) {
  try {
    const { period, symbol } = req.body ?? {};
    if (!["3m", "6m", "1y"].includes(period)) {
      return res.status(400).json({ ok: false, error: "period must be 3m, 6m, or 1y" });
    }
    const result = await resetTranscriptFilesByPeriod(period, symbol || null);
    res.json({
      ok: true,
      deleted: result.deleted,
      deletedFromDrive: result.deletedFromDrive ?? 0,
      errors: result.errors,
    });
  } catch (err) {
    console.error("transcripts/reset error:", err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/** POST /api/transcripts/reset-all - delete all local + Drive transcript/filing files for all symbols. */
export async function resetAllTranscriptsHandler(_req, res) {
  try {
    const result = await resetAllTranscriptFiles();
    res.json({
      ok: true,
      deleted: result.deleted,
      deletedFromDrive: result.deletedFromDrive ?? 0,
      errors: result.errors,
    });
  } catch (err) {
    console.error("transcripts/reset-all error:", err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/** DELETE a single filing: local file, Drive (if uploaded), and DB row. Body: { symbol, quarter, filename }. */
export async function deleteFilingHandler(req, res) {
  try {
    const { symbol, quarter, filename } = req.body ?? {};
    const result = await deleteFilingFile(symbol, quarter, filename);
    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.error });
    }
    res.json({
      ok: true,
      deletedLocal: result.deletedLocal,
      deletedFromDrive: result.deletedFromDrive,
    });
  } catch (err) {
    console.error("transcripts/delete-filing error:", err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/**
 * POST /api/transcripts/super-sync
 * Nuclear option: deletes all announcements, all files, then resyncs news and downloads all PDFs/XBRLs.
 */
export async function superSyncHandler(req, res) {
  const { stockId, ticker } = req.body ?? {};
  if (!stockId || !ticker) {
    return res.status(400).json({ ok: false, error: "stockId and ticker are required" });
  }

  const normalizedTicker = String(ticker).toUpperCase();

  try {
    // 1. Delete all corporate announcements for this stock
    await pool.query("DELETE FROM corporate_announcements WHERE stock_id = $1 OR ticker = $2", [stockId, normalizedTicker]);
    
    // 2. Delete all local files and Drive copies
    const resetResult = await resetAllFilesForSymbol(normalizedTicker);
    
    // 3. Sync Announcements (730 days lookback - FY2024+)
    const annSync = await syncAnnouncementsForTicker(stockId, normalizedTicker, 730);
    
    // 4. Download Filings (2y window) + XBRL Extraction (triggered inside pipeline)
    const pipelineResult = await downloadTranscriptsPipeline({
      symbols: [normalizedTicker],
      window: "2y",
      uploadAfterDownload: true
    });

    res.json({
      ok: true,
      message: `Super sync completed for ${normalizedTicker}`,
      deletedFiles: resetResult.deleted,
      deletedFromDrive: resetResult.deletedFromDrive,
      announcementsSynced: annSync.saved,
      pipeline: pipelineResult
    });
  } catch (err) {
    console.error("transcripts/super-sync error:", err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/**
 * POST /api/transcripts/bulk-super-sync
 * The "Big Red Button": wipes EVERY announcement and EVERY file for EVERY stock, then resyncs all.
 * Runs in background.
 */
export async function bulkSuperSyncHandler(_req, res) {
  try {
    // Return immediately because this will take a long time
    res.json({ ok: true, message: "Bulk Master Sync initiated in background. This will take several minutes." });

    (async () => {
      try {
        console.log("[BULK SYNC] Starting system-wide nuclear reset...");
        
        // 1. Wipe all corporate announcements
        await pool.query("DELETE FROM corporate_announcements");
        
        // 2. Wipe all local files and Drive copies for all symbols
        const resetResult = await resetAllTranscriptFiles();
        console.log(`[BULK SYNC] Reset done. Deleted ${resetResult.deleted} local files, ${resetResult.deletedFromDrive} Drive files.`);
        
        // 3. Get all tickers
        const { rows: stocks } = await pool.query("SELECT id, ticker FROM stocks");
        
        // 4. Sync Announcements for all (730 days - FY2024+)
        console.log(`[BULK SYNC] Syncing news for ${stocks.length} stocks...`);
        for (const stock of stocks) {
          try {
            await syncAnnouncementsForTicker(stock.id, stock.ticker, 730);
          } catch (e) {
            console.error(`[BULK SYNC] News sync failed for ${stock.ticker}:`, e.message);
          }
        }
        
        // 5. Download all filings + XBRL for all (2y window)
        console.log("[BULK SYNC] Starting download pipeline for all stocks...");
        await downloadTranscriptsPipeline({
          useWatchlist: false,
          window: "2y",
          uploadAfterDownload: true
        });
        
        console.log("[BULK SYNC] Bulk master sync completed successfully.");
      } catch (err) {
        console.error("[BULK SYNC] Fatal error in background task:", err);
      }
    })();
  } catch (err) {
    console.error("transcripts/bulk-super-sync error:", err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}



