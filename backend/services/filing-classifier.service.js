/**
 * Filing Classifier Service
 * Categorizes BSE/NSE filings into 8 specialized categories and extracts
 * institutional-grade event mechanics (swap ratios, dilution %, order values, rating changes, fine amounts).
 */

import { NVIDIA_API_KEY } from "../config/env.js";

const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

/**
 * Deterministic keyword classification into one of 8 filing categories.
 */
export function classifyFilingCategory(title = "", text = "") {
  const combined = `${title} ${text}`.toLowerCase();

  // 1. RESTRUCTURING (Demerger, Merger, Spin-off, Slump sale)
  if (
    combined.includes("scheme of arrangement") ||
    combined.includes("demerger") ||
    combined.includes("amalgamation") ||
    combined.includes("spin-off") ||
    combined.includes("spinoff") ||
    combined.includes("slump sale")
  ) {
    return "RESTRUCTURING";
  }

  // 2. CAPITAL_RAISE (QIP, Preferential Issue, Rights Issue, Warrants)
  if (
    combined.includes("qip") ||
    combined.includes("qualified institutions placement") ||
    combined.includes("preferential allotment") ||
    combined.includes("preferential issue") ||
    combined.includes("rights issue") ||
    combined.includes("issuance of warrants") ||
    combined.includes("warrant allotment")
  ) {
    return "CAPITAL_RAISE";
  }

  // 3. CAPITAL_RETURN (Bonus Issue, Stock Split, Buyback, Special Dividend)
  if (
    combined.includes("bonus issue") ||
    combined.includes("issue of bonus") ||
    combined.includes("stock split") ||
    combined.includes("sub-division") ||
    combined.includes("buyback") ||
    combined.includes("buy-back") ||
    combined.includes("special dividend")
  ) {
    return "CAPITAL_RETURN";
  }

  // 4. ORDER_WIN (Bagging of orders, LOA, Capacity Addition, Contract Win)
  if (
    combined.includes("bagging of order") ||
    combined.includes("order win") ||
    combined.includes("letter of award") ||
    combined.includes("loa received") ||
    combined.includes("contract win") ||
    combined.includes("capacity addition") ||
    combined.includes("commercial production") ||
    combined.includes("commissioning of plant")
  ) {
    return "ORDER_WIN";
  }

  // 5. CREDIT_EVENT (Rating revision/upgrade/downgrade on debt instruments)
  const isDebtRatingAgency = /\b(crisil|care ratings?|icra|ind-ra|india ratings|brickwork|acuite)\b/i.test(combined);
  const isCreditAction = /\b(credit rating|debt rating|rating revision|rating upgrade|rating downgrade|bank facilities rating|commercial paper rating)\b/i.test(combined);
  const isEsgOnly = /\besg (rating|score|impact)\b/i.test(combined) && !isCreditAction;
  
  if ((isDebtRatingAgency || isCreditAction) && !isEsgOnly) {
    return "CREDIT_EVENT";
  }

  // 6. REGULATORY_ACTION (Penalties, Litigation, SEBI/MCA orders)
  if (
    combined.includes("penalty") ||
    combined.includes("fine imposed") ||
    combined.includes("order passed by") ||
    combined.includes("sebi order") ||
    combined.includes("enforcement directorate") ||
    combined.includes("search and seizure") ||
    combined.includes("income tax raid") ||
    combined.includes("litigation update")
  ) {
    return "REGULATORY_ACTION";
  }

  // 7. ACQUISITION (Acquisition, Investment in Subsidiary, Stake Purchase)
  if (
    combined.includes("acquisition of") ||
    combined.includes("investment in subsidiary") ||
    combined.includes("stake acquisition") ||
    combined.includes("joint venture agreement") ||
    combined.includes("incorporation of subsidiary")
  ) {
    return "ACQUISITION";
  }

  // 8. QUARTERLY_EARNINGS (Financial results, investor presentation)
  if (
    combined.includes("financial results") ||
    combined.includes("un-audited financial results") ||
    combined.includes("audited financial results") ||
    combined.includes("investor presentation") ||
    combined.includes("earnings presentation") ||
    combined.includes("outcome of board meeting") && (combined.includes("results") || combined.includes("quarter"))
  ) {
    return "QUARTERLY_EARNINGS";
  }

  return "GENERAL";
}

/**
 * Category-specific NIM prompt generator for institutional detail extraction.
 */
function getCategoryPrompt(category, ticker, announcementText, investmentThesis = "") {
  const thesisCtx = investmentThesis ? `Investment Thesis: ${investmentThesis}\n` : "";

  const categoryInstructions = {
    RESTRUCTURING: `
Extract restructurings details (Demergers, Mergers, Spin-Offs):
- swap_ratio: Exact ratio (e.g. "1 share of Ashok Cloud Ltd for every 1 share of Anant Raj Ltd")
- entity_split: Names of resulting separate listed/unlisted entities
- business_divisions: Which verticals go to which entity
- nclt_sebi_stage: Current approval stage (e.g., Board approval, SEBI approval, NCLT sanction)
- listing_timeline: Expected listing date/quarter for demerged entity
- thesis_impact: Qualitative impact on thesis (unlocking value, removing conglomerate discount)
`,
    CAPITAL_RAISE: `
Extract Capital Raise details (QIP, Preferential Issue, Rights Issue):
- issue_price: Issue price per share in ₹
- total_amount_raised_cr: Total amount raised in ₹ Crores
- dilution_percentage: Share count dilution %
- allottees: Key marquee institutional allottees if named
- use_of_proceeds: Primary usage (CapEx, Debt reduction, Working Capital)
- price_anchor_assessment: Short-term price impact vs long-term thesis impact
`,
    ORDER_WIN: `
Extract Order Bagging & Capacity Addition details:
- order_value_cr: Order value in ₹ Crores
- client_name: Client or counterparty name
- execution_period_months: Execution timeframe in months
- capacity_added: Added capacity metrics (e.g., MTPA, MW, Units)
- revenue_visibility_impact: Impact on annual revenue %
`,
    CAPITAL_RETURN: `
Extract Capital Return details (Bonus, Split, Buyback, Dividend):
- bonus_ratio: e.g., "1:1" or "Not Applicable"
- split_ratio: e.g., "1 to 5" or "Not Applicable"
- buyback_price: Buyback price in ₹ and size in ₹Cr
- record_date: Record date if announced
- promoter_holding_impact: Impact on promoter ownership %
`,
    CREDIT_EVENT: `
Extract Credit Rating changes:
- rating_agency: e.g., CRISIL, CARE, ICRA
- new_rating: Rating designation (e.g., AA+, A1+)
- rating_action: Upgrade, Downgrade, Reaffirmation, Outlook Change
- borrowing_cost_impact: Impact on interest cost and balance sheet strength
`,
    REGULATORY_ACTION: `
Extract Regulatory Actions & Penalties:
- regulatory_body: e.g., SEBI, Income Tax, GST Department, NCLT
- fine_amount_cr: Fine/penalty amount in ₹ Cr or ₹ Lakhs
- nature_of_violation: Core reason for action
- material_risk: Material impact on operations/thesis
`,
    ACQUISITION: `
Extract Acquisition & Investment details:
- target_name: Target company or entity acquired
- deal_value_cr: Deal size/investment in ₹ Crores
- stake_acquired_pct: Stake % acquired
- strategic_rationale: Key reason for acquisition
`,
    QUARTERLY_EARNINGS: `
Extract Quarterly Earnings key highlights:
- revenue_cr: Revenue in ₹ Crores and YoY/QoQ %
- pat_cr: Net Profit in ₹ Crores and YoY/QoQ %
- ebitda_margin_pct: Operating margin %
- segmental_highlights: Key division performance
`,
    GENERAL: `
Extract General Corporate Action details:
- key_event: Primary event described
- operational_impact: Impact on company operations
- financial_impact: Impact on finances/cash flow
`
  };

  const instruction = categoryInstructions[category] || categoryInstructions.GENERAL;

  return `
You are a top-tier Indian Equity Analyst. Extract structured data for this corporate filing of ticker ${ticker}.
Category: ${category}
${thesisCtx}

Instruction:
${instruction}

Filing Content:
${announcementText}

Rule: Output ONLY a valid JSON object matching this structure:
{
  "category": "${category}",
  "verdict": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "summary": "1-2 sentence executive summary focused on financial/operational mechanics.",
  "extracted_data": {
    /* Put the exact fields requested above in category instruction here */
  }
}
If any metric is not disclosed in the text, use string "Not Disclosed". Never hallucinate missing numbers.
`;
}

/**
 * Executes specialized NIM extraction for corporate actions.
 */
export async function extractCorporateActionDetails(category, ticker, announcementText, investmentThesis = "") {
  if (category === "GENERAL" || !NVIDIA_API_KEY) {
    return null;
  }

  // Cap text to 8,000 chars (head + tail) for NIM API timeout safety (3-5s response)
  let cappedText = announcementText || "";
  if (cappedText.length > 8000) {
    const half = 4000;
    cappedText = `${cappedText.substring(0, half)}\n\n[... TRUNCATED MIDDLE CONTENT FOR FAST NIM LATENCY ...]\n\n${cappedText.substring(cappedText.length - half)}`;
  }

  const prompt = getCategoryPrompt(category, ticker, cappedText, investmentThesis);
  const ACTIVE_MODELS = [
    "openai/gpt-oss-120b",
    "nvidia/nemotron-3-super-120b-a12b",
    "meta/llama-3.2-11b-vision-instruct",
    "openai/gpt-oss-20b"
  ];
  const MAX_RETRIES = 4;
  const BASE_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const currentModel = ACTIVE_MODELS[(attempt - 1) % ACTIVE_MODELS.length];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

    try {
      const response = await fetch(NIM_BASE_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: currentModel,
          messages: [
            {
              role: "system",
              content: "You are a quantitative corporate action parser for Indian financial filings. Extract precise numeric mechanics and facts with zero fluff.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.05,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[NIM ACTION] Model ${currentModel} failed status ${response.status} (attempt ${attempt}/${MAX_RETRIES})`);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
          continue;
        }
        return null;
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      const cleanJson = content.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[NIM ACTION] Attempt ${attempt}/${MAX_RETRIES} failed for ${ticker}:`, err.message);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
        continue;
      }
      return null;
    }
  }

  return null;
}
