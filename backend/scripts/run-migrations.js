import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db/pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../supabase/migrations");

async function runMigrations() {
  console.log("Starting database migrations...");

  // Get all .sql files in the migrations directory
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort(); // Sort by filename to ensure correct order

  for (const file of files) {
    // Only run the new migrations I created today
    if (file.startsWith("20260426") || file.startsWith("20260515")) {
      console.log(`Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      
      try {
        await pool.query(sql);
        console.log(`Success: ${file}`);
      } catch (err) {
        console.error(`Error applying ${file}:`, err.message);
        // If it fails because columns already exist, we can ignore and continue
        if (!err.message.includes("already exists")) {
          process.exit(1);
        }
      }
    }
  }

  console.log("All relevant migrations applied.");
  process.exit(0);
}

runMigrations().catch(err => {
  console.error("Migration script failed:", err);
  process.exit(1);
});
