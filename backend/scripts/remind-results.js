import { pool } from "../db/pool.js";
import { sendTelegramMessage } from "../services/telegram.service.js";

export async function checkAndSendReminders({ isDryRun = false } = {}) {
  console.log("Starting Results Reminder Check...");
  
  const { rows: stocks } = await pool.query(
    "SELECT id, ticker, next_results_date FROM stocks WHERE next_results_date IS NOT NULL"
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let remindersSent = 0;

  for (const stock of stocks) {
    const resultDate = new Date(stock.next_results_date);
    resultDate.setHours(0, 0, 0, 0);

    const diffTime = resultDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let message = null;

    if (diffDays === 3) {
      message = `📅 *Upcoming Result Reminder*\n\n*${stock.ticker}* will publish its results in *3 days* (${stock.next_results_date}).`;
    } else if (diffDays === 1) {
      message = `📅 *Upcoming Result Reminder*\n\n*${stock.ticker}* will publish its results *TOMORROW* (${stock.next_results_date}).`;
    } else if (diffDays === 0) {
      message = `🚨 *RESULT DAY TODAY*\n\n*${stock.ticker}* is scheduled to publish its results *TODAY*. Watch out for the announcements!`;
    } else if (diffDays === -1) {
      message = `📋 *Post-Result Review Action*\n\n*${stock.ticker}* results were published *yesterday*. Have you reviewed the numbers and updated the thesis?`;
    } else if (diffDays === -3) {
      message = `📋 *Final Post-Result Reminder*\n\n*${stock.ticker}* results were published *3 days ago*. Time to make a decision or update the system.`;
    }

    if (message) {
      if (isDryRun) {
        console.log(`[DRY RUN] Would send reminder for ${stock.ticker}: diffDays=${diffDays}`);
      } else {
        try {
          await sendTelegramMessage(message);
          console.log(`Sent reminder for ${stock.ticker} (${diffDays} days)`);
          remindersSent++;
        } catch (err) {
          console.error(`Failed to send reminder for ${stock.ticker}:`, err.message);
        }
      }
    }
  }

  console.log(`Finished checking reminders. Sent: ${remindersSent}`);
  return remindersSent;
}

// Check if run directly
import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const isDryRun = process.env.DRY_RUN === 'true';
  checkAndSendReminders({ isDryRun }).then(() => {
    process.exit(0);
  }).catch(err => {
    console.error("Fatal error during reminder check:", err);
    process.exit(1);
  });
}
