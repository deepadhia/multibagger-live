/**
 * 🌙 SERVER-SIDE NIGHTLY SCHEDULER SERVICE
 * 
 * Runs continuously in the background on the production server.
 * Automatically executes `runNightlyReconciliation` every single night at 23:30 IST (18:00 UTC).
 */

import { runNightlyReconciliation } from "../scripts/run-nightly-reconciliation.js";
import { writeLog } from "./logger.service.js";

let scheduledTimer = null;

function getMsUntilNextTargetTime(targetHourUtc = 18, targetMinuteUtc = 0) {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(targetHourUtc, targetMinuteUtc, 0, 0);

  if (next <= now) {
    // If target time has already passed today, schedule for tomorrow
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.getTime() - now.getTime();
}

export function startNightlyServerScheduler() {
  const msUntilRun = getMsUntilNextTargetTime(18, 0); // 18:00 UTC = 23:30 IST
  const hoursUntilRun = (msUntilRun / (1000 * 60 * 60)).toFixed(2);

  console.log(`[Nightly Scheduler] 🌙 Server cron armed. Next execution in ${hoursUntilRun} hours (at 23:30 IST / 18:00 UTC).`);
  writeLog("NIGHTLY_SCHEDULER", `Server cron armed. Next execution in ${hoursUntilRun} hours.`);

  if (scheduledTimer) clearTimeout(scheduledTimer);

  scheduledTimer = setTimeout(async () => {
    try {
      console.log(`[Nightly Scheduler] ⏰ Triggering scheduled Nightly Reconciliation at ${new Date().toISOString()}...`);
      writeLog("NIGHTLY_SCHEDULER", `Executing scheduled nightly reconciliation.`);
      await runNightlyReconciliation({ isDryRun: false });
    } catch (err) {
      console.error("[Nightly Scheduler] ❌ Execution failed:", err.message);
      writeLog("NIGHTLY_SCHEDULER", `Error during execution: ${err.message}`);
    } finally {
      // Rearm for the next night
      startNightlyServerScheduler();
    }
  }, msUntilRun);
}

export function stopNightlyServerScheduler() {
  if (scheduledTimer) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
    console.log("[Nightly Scheduler] ⏹️ Server cron stopped.");
  }
}
