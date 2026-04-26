import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "../config/env.js";

/**
 * Telegram Bot Service
 * Sends formatted alerts to a configured Telegram chat.
 */

/**
 * Sends a message to the configured Telegram chat.
 * @param {string} text - Markdown formatted text.
 */
export async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram bot token or chat ID not configured.");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: "Markdown",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Telegram send failed:", errorData);
    throw new Error(`Telegram API error: ${errorData.description}`);
  }

  return await response.json();
}

/**
 * Formats and sends a corporate announcement alert.
 * @param {object} params
 */
export async function sendAnnouncementAlert({ ticker, title, priority, impact, summary, confidence, key_data, deep_dive_indicator, result_date }) {
  const priorityEmoji = priority === "HIGH" ? "🔴" : priority === "MEDIUM" ? "🟡" : "⚪";
  const impactEmoji = impact === "POSITIVE" ? "📈" : impact === "NEGATIVE" ? "📉" : "⚖️";
  
  let message = `📢 *${ticker.toUpperCase()}* | ${impactEmoji} *${impact}*
  
${priorityEmoji} *PRIORITY: ${priority}* (Conf: ${confidence})

*Summary:* ${summary}

`;

  if (key_data) {
    message += `📊 *KEY DATA:* ${key_data}\n\n`;
  }

  if (deep_dive_indicator) {
    message += `🔍 *DEEP DIVE:* ${deep_dive_indicator}\n\n`;
  }

  if (result_date) {
    message += `📅 *NEXT RESULTS:* ${result_date}\n\n`;
  }

  message += `_Source: ${title}_`;

  return sendTelegramMessage(message);
}
