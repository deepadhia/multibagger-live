import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db/pool.js";
import { deleteDriveFile } from "../services/drive.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target data directory
const DATA_DIR = path.resolve(__dirname, "..", "..", "data_node");

const isQuarterStale = (q) => {
  const match = String(q || "").match(/^FY(\d{2})-Q[1-4]$/i);
  if (!match) return false;
  const fy = Number(match[1]);
  return fy < 24; // Stale if older than FY24 (e.g., FY23, FY20, FY16)
};

async function purgeStaleQuarters() {
  console.log("=== Starting Global Stale Quarters Purge ===");
  console.log("Data Directory:", DATA_DIR);

  // 1. Filesystem Cleanup
  let fsDeletedDirs = 0;
  if (fs.existsSync(DATA_DIR)) {
    const symbols = fs.readdirSync(DATA_DIR);
    for (const symbol of symbols) {
      const symbolDir = path.join(DATA_DIR, symbol);
      if (!fs.statSync(symbolDir).isDirectory()) continue;

      const quarters = fs.readdirSync(symbolDir);
      for (const q of quarters) {
        const qDir = path.join(symbolDir, q);
        if (!fs.statSync(qDir).isDirectory()) continue;

        if (isQuarterStale(q)) {
          console.log(`[Disk] Removing stale folder: ${symbol}/${q}`);
          try {
            fs.rmSync(qDir, { recursive: true, force: true });
            fsDeletedDirs++;
          } catch (err) {
            console.error(`[Disk] Failed to remove ${symbol}/${q}: ${err.message}`);
          }
        }
      }
    }
  }

  // 2. Database & Google Drive Cleanup
  let dbPurgedCount = 0;
  let drivePurgedCount = 0;
  try {
    const { rows } = await pool.query(
      "SELECT id, symbol, quarter, filename, drive_file_id FROM filing_drive_links"
    );
    console.log(`[DB] Fetched ${rows.length} drive link record(s). Scanning for stale entries...`);

    for (const row of rows) {
      if (isQuarterStale(row.quarter)) {
        console.log(`[DB] Found stale record: ${row.symbol}/${row.quarter} -> ${row.filename}`);

        // Delete from Google Drive if client is configured and ID is present
        if (row.drive_file_id) {
          try {
            await deleteDriveFile(row.drive_file_id);
            drivePurgedCount++;
            console.log(`  [Drive] Deleted file: ${row.drive_file_id}`);
          } catch (err) {
            console.warn(`  [Drive] Failed to delete file: ${row.drive_file_id} (${err.message})`);
          }
        }

        // Delete from database
        try {
          await pool.query("DELETE FROM filing_drive_links WHERE id = $1", [row.id]);
          dbPurgedCount++;
          console.log(`  [DB] Deleted record ID: ${row.id}`);
        } catch (err) {
          console.error(`  [DB] Failed to delete record ID: ${row.id}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.error("[DB] Error running database purge:", err.message);
  }

  console.log("\n=== Purge Complete ===");
  console.log(`- Disk folders deleted: ${fsDeletedDirs}`);
  console.log(`- Database records purged: ${dbPurgedCount}`);
  console.log(`- Google Drive files deleted: ${drivePurgedCount}`);
  process.exit(0);
}

purgeStaleQuarters().catch((err) => {
  console.error("Purge script failed:", err);
  process.exit(1);
});
