/**
 * NVIDIA NIM Service (Geforce Now API)
 * Uses OpenSource models (Llama 3.1) for intelligence classification.
 */

import { NVIDIA_API_KEY } from "../config/env.js";

const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

/**
 * Classifies a corporate announcement using NVIDIA NIM.
 * @param {string} ticker
 * @param {string} announcementText
 * @param {string} title
 * @returns {Promise<object>}
 */
export async function classifyAnnouncementWithNim(ticker, announcementText, title) {
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY not configured.");
  }

  const prompt = `
    Analyze this Indian stock market corporate announcement and provide a structured classification.
    
    Ticker: ${ticker}
    Title: ${title}
    
    Materiality Rules:
    - HIGH Priority: Large orders (>10% revenue), structural changes (M&A, demergers), management/auditor exits, capex (>20% net worth), or negative regulatory actions.
    - MEDIUM Priority: Dividend declarations, board meeting calls, rating changes, or medium-sized orders.
    - LOW Priority: Routine compliance, share certificate loss, or duplicate filings.

    Return ONLY a valid JSON object with these fields:
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "impact": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "confidence": "HIGH" | "LOW",
      "summary": "A 1-sentence punchy summary of what happened.",
      "key_data": "Extract specific numbers like order value, acquisition cost, or capex amount. If none, leave empty.",
      "deep_dive_indicator": "Why should the investor dig deep? (e.g. 'Structural change in margins', 'Order backlog reaching 3x revenue', 'Governance red flag').",
      "result_date": "If this announcement declares the date of next financial results, provide it in YYYY-MM-DD. Otherwise null.",
      "is_earnings_release": true | false
    }

    Announcement Text:
    ${announcementText}
  `;

  const response = await fetch(NIM_BASE_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta/llama-3.1-8b-instruct",
      messages: [
        {
          role: "system",
          content: "You are a financial analyst. Classify corporate announcements strictly.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("NVIDIA NIM API error:", errorData);
    throw new Error(`NVIDIA NIM API error: ${errorData.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const cleanJson = content.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    console.error("Failed to parse NIM response as JSON:", content);
    throw new Error("AI output was not valid JSON.");
  }
}
