/**
 * Deterministic Financial Validator & EBITDA Engine
 * 
 * Programmatically extracts, validates, and computes key financial metrics
 * (Revenue, EBITDA, EBITDA Margin %, Consolidated PAT, Segment EBIT) directly
 * from parsed financial statement table text.
 */

/**
 * Extracts and computes financial metrics from raw PDF text.
 * @param {string} pdfText Raw text extracted from PDF
 * @returns {object} Financial metrics object
 */
export function extractDeterministicFinancials(pdfText = "") {
  if (!pdfText || typeof pdfText !== "string") {
    return null;
  }

  const lines = pdfText.split("\n").map(l => l.trim()).filter(Boolean);
  const fullTextLower = pdfText.toLowerCase();

  const isFinancialResult = 
    fullTextLower.includes("statement of unaudited") || 
    fullTextLower.includes("statement of audited") || 
    fullTextLower.includes("financial results") || 
    fullTextLower.includes("revenue from operations") ||
    fullTextLower.includes("profit before tax");

  if (!isFinancialResult) {
    return null;
  }

  const result = {
    isFinancialResult: true,
    revenue: null,
    revenueYoYGrowthPct: null,
    ebitda: null,
    ebitdaMarginPct: null,
    ebitdaYoYGrowthPct: null,
    ebitdaMarginBpsDelta: null,
    patStandalone: null,
    patConsolidated: null,
    patAttributable: null,
    patYoYGrowthPct: null,
    isYoYDecline: false,
    isMarginErosion: false,
    segmentRedFlags: []
  };

  // Find where the actual financial results table starts (skipping cover letter)
  let tableStartIdx = lines.findIndex((l, idx) => idx > 60 && (/segment-wise\s+revenue/i.test(l) || /particulars/i.test(l)));
  if (tableStartIdx === -1) {
    tableStartIdx = lines.findIndex((l, idx) => idx > 30 && (/segment/i.test(l) || /revenue\s+from\s+operations/i.test(l)));
  }

  const tableLines = tableStartIdx !== -1 ? lines.slice(tableStartIdx) : lines;

  // Helper to parse numbers and detect unit scale (Lakhs vs Crores)
  const isLakhs = fullTextLower.includes("lakhs") || fullTextLower.includes("in lakh") || fullTextLower.includes("(₹ in lakhs)");

  const parseRowNumbers = (linePattern) => {
    for (let i = 0; i < tableLines.length; i++) {
      if (linePattern.test(tableLines[i])) {
        // Search current line and next 2 lines for column numbers
        const textToSearch = `${tableLines[i]} ${tableLines[i + 1] || ""} ${tableLines[i + 2] || ""}`;
        
        // Remove CIN numbers, BSE codes, dates, 4-digit years, and PIN codes before regex extraction
        const sanitized = textToSearch
          .replace(/\bL\d{5}[A-Z0-9]+\b/gi, "") // Any CIN number (e.g. L40109TG1986PLC006745)
          .replace(/\b5\d{5}\b/g, "") // 6-digit BSE code
          .replace(/\b400\s*\d{3}\b/g, "") // Pin code
          .replace(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi, "") // Full Date (e.g. August 08, 2026)
          .replace(/\b\d{2}[\/\.-]\d{2}[\/\.-]\d{4}\b/g, "") // Date dd/mm/yyyy
          .replace(/\b20\d{2}\b/g, ""); // 4-digit years (e.g. 2026)

        const matches = sanitized.match(/-?\d+(?:,\d+)*(?:\.\d+)?/g);
        if (matches) {
          const numbers = matches
            .map(m => parseFloat(m.replace(/,/g, "")))
            .filter(n => !isNaN(n) && Math.abs(n) > 0.05 && Math.abs(n) < 100000 && n !== 517271);
          
          if (numbers.length >= 1) {
            // If numbers are in Lakhs, convert to Crores
            return numbers.map(n => (isLakhs && n > 500 ? parseFloat((n / 100).toFixed(2)) : n));
          }
        }
      }
    }
    return null;
  };

  // 1. Revenue / Sales from Operations
  const revNumbers = parseRowNumbers(/(?:sales\/income\s+from\s+operations|revenue\s+from\s+operations|total\s+income|income\s+from\s+operations)/i);
  if (revNumbers && revNumbers.length >= 1) {
    result.revenue = revNumbers[0];
    if (revNumbers.length >= 3 && revNumbers[2] > 0) {
      result.revenueYoYGrowthPct = parseFloat((((result.revenue - revNumbers[2]) / revNumbers[2]) * 100).toFixed(2));
    }
  }

  // 2. Segment Results & Red Flag Table Parser
  const segResultsStart = lines.findIndex(l => /segment\s+results/i.test(l));
  if (segResultsStart !== -1) {
    for (let i = segResultsStart; i < Math.min(segResultsStart + 25, lines.length); i++) {
      const line = lines[i];
      const matches = line.match(/(industrial\s+batteries|defence\s*&\s*aviation|electronics|batteries|defence)/i);
      if (matches) {
        const segName = matches[1].toUpperCase();
        const nums = line.match(/-?\d+(?:,\d+)*(?:\.\d+)?/g);
        if (nums && nums.length >= 3) {
          const curVal = parseFloat(nums[0].replace(/,/g, ""));
          const prevYrVal = parseFloat(nums[2].replace(/,/g, ""));
          if (!isNaN(curVal) && !isNaN(prevYrVal) && prevYrVal > 0) {
            const yoyChangePct = parseFloat((((curVal - prevYrVal) / prevYrVal) * 100).toFixed(1));
            if (yoyChangePct < -15.0) {
              result.segmentRedFlags.push({
                segment: segName,
                currentValue: curVal,
                prevValue: prevYrVal,
                yoyDeclinePct: yoyChangePct
              });
              result.isYoYDecline = true;
            }
          }
        }
      }
    }
  }

  // 3. Profit Before Tax (PBT)
  const pbtNumbers = parseRowNumbers(/(?:total\s+profit\s+before\s+tax|profit\s+before\s+tax|pbt\b)/i);
  const finNumbers = parseRowNumbers(/(?:finance\s+costs|interest\s+expense)/i);
  const depNumbers = parseRowNumbers(/(?:depreciation|amortisation)/i);

  if (pbtNumbers && pbtNumbers.length >= 1) {
    const currentPbt = pbtNumbers[0];
    const currentFin = (finNumbers && finNumbers.length >= 1) ? finNumbers[0] : 0;
    const currentDep = (depNumbers && depNumbers.length >= 1) ? depNumbers[0] : 0;

    result.ebitda = parseFloat((currentPbt + currentFin + currentDep).toFixed(2));

    if (result.revenue && result.revenue > 0) {
      result.ebitdaMarginPct = parseFloat(((result.ebitda / result.revenue) * 100).toFixed(2));
    }

    if (pbtNumbers.length >= 3 && result.revenue) {
      const prevPbt = pbtNumbers[2];
      const prevFin = (finNumbers && finNumbers.length >= 3) ? finNumbers[2] : 0;
      const prevDep = (depNumbers && depNumbers.length >= 3) ? depNumbers[2] : 0;
      const prevEbitda = prevPbt + prevFin + prevDep;
      const prevRev = (revNumbers && revNumbers.length >= 3) ? revNumbers[2] : null;

      if (prevEbitda > 0) {
        result.ebitdaYoYGrowthPct = parseFloat((((result.ebitda - prevEbitda) / prevEbitda) * 100).toFixed(2));
      }
      if (prevRev && prevRev > 0) {
        const prevMargin = (prevEbitda / prevRev) * 100;
        result.ebitdaMarginBpsDelta = Math.round((result.ebitdaMarginPct - prevMargin) * 100);
        if (result.ebitdaMarginBpsDelta < -100) {
          result.isMarginErosion = true;
        }
      }
      // PBT YoY Contraction Check
      const pbtYoY = ((currentPbt - prevPbt) / prevPbt) * 100;
      if (pbtYoY < -10.0) {
        result.isYoYDecline = true;
      }
    }
  }

  // 4. Consolidated PAT & Exceptional Items Engine
  const patNumbers = parseRowNumbers(/(?:net\s+profit\s+for\s+the\s+period|profit\s+attributable\s+to\s+owners|profit\s+after\s+tax)/i);
  if (patNumbers && patNumbers.length >= 1) {
    result.patAttributable = patNumbers[0];
    result.patConsolidated = patNumbers[0];

    if (patNumbers.length >= 3 && patNumbers[2] > 0) {
      const prevYearPat = patNumbers[2];
      result.patYoYGrowthPct = parseFloat((((result.patAttributable - prevYearPat) / prevYearPat) * 100).toFixed(2));
      if (result.patYoYGrowthPct < -5.0) {
        result.isYoYDecline = true;
      }
    }
  }

  // Exceptional Items & Normalised PAT Computation (Fully Dynamic)
  let exceptionalDescription = null;
  const excNumbers = parseRowNumbers(/(?:exceptional\s+item|exceptional\s+gain|profit\s+on\s+sale\s+of\s+asset|non-recurring\s+gain)/i);
  if (excNumbers && excNumbers.length >= 1) {
    result.exceptionalGain = excNumbers[0];
  }

  const excLineMatch = fullText.match(/(?:exceptional\s+(?:item|gain)|profit\s+on\s+sale\s+of\s+[^\n.,]+)/i);
  if (excLineMatch) {
    exceptionalDescription = excLineMatch[0].trim();
  }
  result.exceptionalDescription = exceptionalDescription;

  if (result.patConsolidated !== null && result.exceptionalGain !== null) {
    result.normalisedPat = parseFloat((result.patConsolidated - result.exceptionalGain).toFixed(2));
    if (patNumbers && patNumbers.length >= 3 && patNumbers[2] > 0) {
      const prevPat = patNumbers[2];
      result.normalisedPatYoYGrowthPct = parseFloat((((result.normalisedPat - prevPat) / prevPat) * 100).toFixed(1));
    }
  }

  // Segment Red Flag Scanner (detects segment EBIT declines > 20% YoY)
  const segmentKeywords = ["electronics", "batteries", "defence", "aviation", "real estate", "data center", "cloud", "cables", "towers"];
  for (const kw of segmentKeywords) {
    if (fullTextLower.includes(kw)) {
      const reg = new RegExp(`${kw}.*?(-?\\d+(?:,\\d+)*(?:\\.\\d+)?)`, "i");
      const match = pdfText.match(reg);
      if (match) {
        // Match segment lines for YoY contraction
        const segLineIdx = lines.findIndex(l => l.toLowerCase().includes(kw));
        if (segLineIdx !== -1 && segLineIdx + 1 < lines.length) {
          const numbers = lines[segLineIdx].match(/-?\d+(?:,\d+)*(?:\.\d+)?/g) || lines[segLineIdx + 1].match(/-?\d+(?:,\d+)*(?:\.\d+)?/g);
          if (numbers && numbers.length >= 3) {
            const currentSeg = parseFloat(numbers[0].replace(/,/g, ""));
            const prevSeg = parseFloat(numbers[2].replace(/,/g, ""));
            if (!isNaN(currentSeg) && !isNaN(prevSeg) && prevSeg > 0) {
              const segYoY = ((currentSeg - prevSeg) / prevSeg) * 100;
              if (segYoY < -20) {
                result.segmentRedFlags.push({
                  segment: kw.toUpperCase(),
                  currentValue: currentSeg,
                  prevValue: prevSeg,
                  yoyDeclinePct: parseFloat(segYoY.toFixed(1))
                });
              }
            }
          }
        }
      }
    }
  }

  return result;
}
