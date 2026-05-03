/**
 * Utility functions for analyzing quarterly trends and generating AI context flags.
 */

export function computeTrendDirection(values: (number | null)[], tolerance = 5): string {
  // Check for holes
  if (values.length === 3 && values[0] !== null && values[1] === null && values[2] !== null) {
    return "Insufficient Data";
  }

  const validValues = values.filter((v): v is number => v !== null && !isNaN(v));
  if (validValues.length === 0) return "No Data";
  if (validValues.length === 1) return "Insufficient Data";

  if (validValues.length === 2) {
    const diff = validValues[1] - validValues[0];
    if (diff > tolerance) return "Improving (2Q)";
    if (diff < -tolerance) return "Deteriorating (2Q)";
    return "Stable (2Q)";
  }

  // Check for monotonic improvement (Bug 4)
  // If all consecutive diffs are positive, it's "Improving"
  let monotonicImproving = true;
  for (let i = 1; i < validValues.length; i++) {
    if (validValues[i] <= validValues[i-1]) {
      monotonicImproving = false;
      break;
    }
  }
  if (monotonicImproving) return "Improving";

  // Check for "dip then recovery" pattern (Bug 3)
  if (validValues.length >= 3) {
    const newest = validValues[validValues.length - 1];
    const middle = validValues[validValues.length - 2];
    const oldest = validValues[validValues.length - 3];

    // If it dropped then started rising
    if (middle < oldest - tolerance && newest > middle + tolerance) {
      return "Recovering";
    }
  }

  const newest = validValues[validValues.length - 1];
  const middle = validValues[validValues.length - 2];
  const oldest = validValues[validValues.length - 3];

  const diff1 = middle - oldest;
  const diff2 = newest - middle;

  if (diff1 > tolerance && diff2 > tolerance) return "Improving"; // Changed from Accelerating
  if (diff1 < -tolerance && diff2 < -tolerance) return "Deteriorating";
  
  if (Math.abs(diff1) <= tolerance && Math.abs(diff2) <= tolerance) return "Stable";
  
  // Custom check for "Mixed / Strong" (e.g. 10 -> 25 -> 24)
  if (diff1 > tolerance && Math.abs(diff2) <= tolerance) return "Stable at High Levels";
  if (diff1 < -tolerance && Math.abs(diff2) <= tolerance) return "Stabilizing after Drop";
  
  return "Mixed";
}

export function computeMarginTrend(values: (number | null)[], tolerance = 0.5): string {
  // Check for holes
  if (values.length === 3 && values[0] !== null && values[1] === null && values[2] !== null) {
    return "Insufficient Data";
  }

  const validValues = values.filter((v): v is number => v !== null && !isNaN(v));
  if (validValues.length === 0) return "No Data";
  if (validValues.length === 1) return "Insufficient Data";

  if (validValues.length === 2) {
    const diff = validValues[1] - validValues[0];
    if (diff > tolerance) return "Expanding (2Q)";
    if (diff < -tolerance) return "Compressing (2Q)";
    return "Stable (2Q)";
  }

  // Monotonic expanding
  let monotonicExpanding = true;
  for (let i = 1; i < validValues.length; i++) {
    if (validValues[i] <= validValues[i-1]) {
      monotonicExpanding = false;
      break;
    }
  }
  if (monotonicExpanding) return "Expanding";

  const newest = validValues[validValues.length - 1];
  const middle = validValues[validValues.length - 2];
  const oldest = validValues[validValues.length - 3];

  const diff1 = middle - oldest;
  const diff2 = newest - middle;

  if (diff1 > tolerance && diff2 > tolerance) return "Expanding";
  if (diff1 < -tolerance && diff2 < -tolerance) return "Compressing";
  
  if (Math.abs(diff1) <= tolerance && Math.abs(diff2) <= tolerance) return "Stable";
  
  if (diff1 > tolerance && Math.abs(diff2) <= tolerance) return "Stable (Expanded)";
  if (diff1 < -tolerance && Math.abs(diff2) <= tolerance) return "Stable (Compressed)";

  return "Volatile";
}

export function computeOwnershipTrend(
  promoter: (number | null)[], 
  fii: (number | null)[], 
  dii: (number | null)[],
  pledge: (number | null)[] = []
): { label: string; details: string; flags: string[] } {
  const flags: string[] = [];
  let label = "Stable";
  let details = "";

  // Check for holes
  if (promoter.length === 3 && promoter[0] !== null && promoter[1] === null && promoter[2] !== null) {
    return { label: "Insufficient Data", details: "Missing intermediate quarter", flags: [] };
  }

  const validPromoter = promoter.filter((v): v is number => v !== null);

  if (validPromoter.length >= 2) {
    const newest = validPromoter[validPromoter.length - 1];
    const oldest = validPromoter[0];
    const drop = oldest - newest;

    if (drop > 1.0) {
      label = "Notable Promoter Reduction";
      flags.push(`🟡 Promoter holding dropped by ${drop.toFixed(2)}%`);
    } else if (drop > 0 && drop <= 1.0) {
      // Minor drop
      const validFii = fii.filter((v): v is number => v !== null);
      const validDii = dii.filter((v): v is number => v !== null);
      
      let instRising = false;
      if (validFii.length >= 2 && validDii.length >= 2) {
        const fiiRise = validFii[validFii.length - 1] - validFii[0];
        const diiRise = validDii[validDii.length - 1] - validDii[0];
        if (fiiRise + diiRise > drop * 0.5) instRising = true;
      }

      if (instRising) {
        label = "Neutral/Mixed";
        details = "Promoter slightly down but absorbed by Institutions";
      } else {
        label = "Minor Promoter Reduction";
        flags.push(`🟡 Promoter slightly down (${drop.toFixed(2)}%)`);
      }
    } else if (drop < 0) {
      label = "Promoter Accumulation";
      flags.push(`🟢 Promoter holding increased by ${Math.abs(drop).toFixed(2)}%`);
    }
  }

  // Check Pledge
  const validPledge = pledge.filter((v): v is number => v !== null);
  if (validPledge.length >= 2) {
    const newest = validPledge[validPledge.length - 1];
    const oldest = validPledge[0];
    if (newest - oldest > 1.0) {
      flags.push(`🔴 Promoter Pledge Increased significantly (${(newest - oldest).toFixed(2)}%)`);
      label = "Pledge Risk";
    }
  }

  return { label, details, flags };
}

export function generateAnomalyFlags(trends: {
  revTrend: string;
  patTrend: string;
  marginTrend: string;
  ownershipFlags: string[];
  debtTrend?: string;
}): string[] {
  const flags: string[] = [];

  if (trends.revTrend === "Deteriorating" && trends.patTrend === "Deteriorating") {
    flags.push("🔴 Growth (Rev & PAT) deteriorating for 3 quarters");
  } else if (trends.revTrend === "Deteriorating") {
    flags.push("🟠 Revenue slowing 3 quarters");
  } else if (trends.patTrend === "Deteriorating") {
    flags.push("🟠 PAT slowing 3 quarters");
  }

  if (trends.marginTrend === "Compressing") {
    flags.push("🔴 Margin compression over 3 quarters");
  } else if (trends.marginTrend === "Expanding") {
    flags.push("🟢 Margin expansion 3 quarters");
  }

  if (trends.debtTrend === "Rising" && (trends.patTrend === "Deteriorating" || trends.patTrend === "Stable")) {
    flags.push("🔴 Debt rising while PAT flat/falling");
  }

  // Push ownership flags directly
  trends.ownershipFlags.forEach(f => flags.push(f));

  return flags;
}

export function formatTrendSeries(values: (number | null)[], unit = ""): string {
  if (!values || values.length === 0) return "N/A";
  return values.map(v => v !== null && !isNaN(v) ? `${v}${unit}` : "N/A").join(" → ");
}
