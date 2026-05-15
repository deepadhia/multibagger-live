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
export async function classifyAnnouncementWithNim(ticker, announcementText, title, investmentThesis = null) {
  if (!NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY not configured.");
  }

  let displayThesis = investmentThesis;
  if (investmentThesis && typeof investmentThesis === 'string' && investmentThesis.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(investmentThesis);
      if (parsed.primary_thesis) {
        displayThesis = parsed.primary_thesis;
      }
    } catch (e) {
      // Not JSON or parse failed, use raw string
    }
  }

  const thesisSection = displayThesis 
    ? `── Investment Thesis (Context) ──\n${displayThesis}\n`
    : "";

  const prompt = `
    You are a sharp Indian equity analyst. Analyze this BSE/NSE corporate announcement and return a detailed, investor-grade classification.
    
    Ticker: ${ticker}
    Announcement Title: ${title}

    ${thesisSection}

    ── Task ──
    Evaluate if this announcement reinforces or breaks the Investment Thesis provided. 
    If no thesis is provided, use general high-quality investing principles.

    - If the news significantly advances or protects the investment thesis, it is POSITIVE.
    - If it introduces a structural risk or invalidates a core thesis assumption, it is NEGATIVE.
    - If it is routine compliance or minor news with no thesis impact, it is NEUTRAL.
    - Be decisive. Only use NEUTRAL if there is truly no impact on the thesis.
    - IMPORTANT: If the announcement is an Earnings Release/Financial Result, you MUST evaluate its numbers and management commentary against the investment thesis. Provide a strong POSITIVE or NEGATIVE impact unless it exactly meets expectations without any new information.

    ── Priority Rules ──
    HIGH: Earnings Results / Financial Results, Large orders (>10% of annual revenue), M&A / demergers / restructuring, management/auditor exits, capex >20% net worth, credit downgrades, regulatory actions (fines, bans, audits), Product Approvals (PESO, FDA, etc.), Patents, Licenses, Large contract wins, fraud/NCLT.
    MEDIUM: Dividends, board meeting notices, credit rating reaffirmations, allotments, medium-sized orders, general business updates.
    LOW: Routine compliance filings, share certificate loss, voting results, AGM notices, window closure notices, newspaper publications.

    ── Output Rules ──
    - "summary": Write 2-3 sentences. Sentence 1: What happened (factual). Sentence 2: Business context & Thesis Alignment (how this relates to the company's core thesis). Sentence 3: Investor implication (what should an investor think/do).
    - "key_data": Extract ALL specific numbers — order value (₹Cr), acquisition cost, capex outlay, revenue %, deal tenure, capacity (MW/MT). If none, write "No specific figures disclosed."
    - "deep_dive_indicator": Name the precise investment thesis risk or opportunity. e.g. "Order backlog now ~3.2x FY25 revenue — execution risk is the key variable", or "Auditor exit raises governance concern — check if this is second change in 3 years".
    - "result_date": YYYY-MM-DD if a board meeting for results is announced. Otherwise null.
    - "is_earnings_release": true only if this is the actual Q-results announcement (not just a board meeting notice).

    Return ONLY a valid JSON object:
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "impact": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
      "confidence": "HIGH" | "LOW",
      "summary": "2-3 sentence investor-grade summary with thesis context.",
      "key_data": "All specific figures and numbers extracted.",
      "deep_dive_indicator": "Precise thesis risk/opportunity with context.",
      "result_date": "YYYY-MM-DD or null",
      "is_earnings_release": true | false
    }

    Announcement Text:
    ${announcementText}
  `;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout (NIM can be slow)

  try {
    const response = await fetch(NIM_BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
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
        max_tokens: 700,
        response_format: { type: "json_object" },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[AI ERROR] NVIDIA NIM API failed:", errorData);
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
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("NVIDIA NIM API request timed out (90s)");
    }
    throw err;
  }
}
