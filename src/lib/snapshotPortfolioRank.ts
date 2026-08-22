import { sortSnapshotsByQuarterDesc } from "@/lib/quarterSort";

const THESIS_TIER: Record<string, number> = {
  strengthening: 4,
  accelerating: 4,
  strong: 4,
  stable: 3,
  intact: 3,
  on_track: 3,
  weakening: 2,
  under_review: 2,
  deteriorating: 2,
  broken: 1,
  failed: 1,
};

export type SnapshotRowLike = {
  stock_id?: string | null;
  quarter?: string | null;
  thesis_status?: string | null;
  confidence_score?: number | null;
  thesis_score?: number | null;
  valuation_score?: number | null;
  conviction_score?: number | null;
  portfolio_rank?: number | null;
  portfolio_cohort_size?: number | null;
  metrics?: Record<string, unknown> | null;
  raw_ai_output?: unknown;
};

function parseNumeric(valStr: unknown): number | null {
  if (valStr == null) return null;
  if (typeof valStr === "number") return valStr;
  if (typeof valStr !== "string") return null;
  const cleaned = valStr.replace(/,/g, "").replace(/%/g, "");
  const match = cleaned.match(/(-?\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function parseRawJson(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (typeof p === "object" && p !== null && !Array.isArray(p)) return p as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

/** Normalized lowercase: strengthening | stable | weakening | broken | null */
export function thesisStatusFromSnapshot(snap: SnapshotRowLike): string | null {
  const direct = snap.thesis_status;
  if (typeof direct === "string" && direct.trim()) return direct.trim().toLowerCase();
  const raw = parseRawJson(snap.raw_ai_output);
  const block = raw?.snapshot as Record<string, unknown> | undefined;
  const t = block?.thesis_status;
  return typeof t === "string" && t.trim() ? t.trim().toLowerCase() : null;
}

function thesisTier(snap: SnapshotRowLike): number {
  const th = thesisStatusFromSnapshot(snap);
  if (!th) return 0;
  return THESIS_TIER[th] ?? 0;
}

export function confidenceFromSnapshot(snap: SnapshotRowLike): number {
  if (snap.confidence_score != null && Number.isFinite(Number(snap.confidence_score))) {
    return Math.max(0, Math.min(100, Number(snap.confidence_score)));
  }
  if (snap.thesis_score != null && Number.isFinite(Number(snap.thesis_score))) {
    return Math.max(0, Math.min(100, Number(snap.thesis_score)));
  }
  const raw = parseRawJson(snap.raw_ai_output);
  const block = raw?.snapshot as Record<string, unknown> | undefined;
  const c = block?.confidence_score;
  if (typeof c === "number" && Number.isFinite(c)) return Math.max(0, Math.min(100, c));
  if (typeof c === "string") {
    const n = parseFloat(c);
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
  }
  if (raw && typeof raw.conviction_score === "number" && Number.isFinite(raw.conviction_score)) {
    return Math.max(0, Math.min(100, raw.conviction_score));
  }
  return 80;
}

/**
 * Higher = better ordering. Thesis tier dominates (strengthening > … > broken), then confidence 0–100.
 * Keep in sync with `backend/scripts/compute-quarterly-ranks.js` rankScoreFromRow.
 */
export function snapshotThesisSortScore(snap: SnapshotRowLike): number {
  return thesisTier(snap) * 1000 + confidenceFromSnapshot(snap);
}

const TRAJECTORY_WINDOW = 5;
const TRAJECTORY_BONUS_MAX = 600;
const TRAJECTORY_PENALTY_MAX = 500;

function parseSnapshotMetrics(snap: SnapshotRowLike): Record<string, any> {
  const m = snap.metrics;
  if (m && typeof m === "object") return m;
  const raw = parseRawJson(snap.raw_ai_output);
  const block = raw?.snapshot as Record<string, unknown> | undefined;
  return (block?.metrics as Record<string, any>) || (raw?.metrics as Record<string, any>) || {};
}

/**
 * Bonus for thesis trajectory over the last few fiscal quarters (oldest → newest).
 * Anchored in verifiable accounting numbers (revenue acceleration, PAT growth, margin discipline) and tier shifts.
 */
export function trajectoryBonusFromSnapshots(snapshots: SnapshotRowLike[] | null | undefined): number {
  const desc = sortSnapshotsByQuarterDesc(snapshots || []);
  if (desc.length < 2) return 0;
  const chrono = desc.slice(0, TRAJECTORY_WINDOW).reverse();

  let revBonus = 0;
  let patBonus = 0;
  let marginBonus = 0;
  let tierShiftBonus = 0;
  let streakBonus = 0;

  const tiers = chrono.map(thesisTier);
  const metricsList = chrono.map(parseSnapshotMetrics);
  const revGrowths = metricsList.map(m => parseNumeric(m.revenue_growth?.value));
  const patGrowths = metricsList.map(m => parseNumeric(m.pat_growth?.value));
  const opms = metricsList.map(m => parseNumeric(m.opm?.value));

  // 1. Revenue Acceleration
  for (let i = 0; i < revGrowths.length - 1; i++) {
    const cur = revGrowths[i];
    const nxt = revGrowths[i + 1];
    if (cur !== null && nxt !== null) {
      if (nxt > cur) revBonus += 25;
      else if (nxt < cur - 5.0) revBonus -= 20;
    }
  }
  revBonus = Math.max(-60, Math.min(90, revBonus));

  // 2. High-Quality PAT Compounding
  for (let i = 0; i < patGrowths.length; i++) {
    const p = patGrowths[i];
    if (p !== null) {
      if (p >= 20.0) patBonus += 25;
      else if (p >= 10.0) patBonus += 15;
      else if (p < 0.0) patBonus -= 20;
    }
  }
  patBonus = Math.max(-40, Math.min(100, patBonus));

  // 3. Margin Discipline
  for (let i = 0; i < opms.length; i++) {
    const m = opms[i];
    if (m !== null && m >= 18.0) marginBonus += 15;
  }
  marginBonus = Math.max(0, Math.min(60, marginBonus));

  // 4. Tier Shift (Upgrades vs Downgrades)
  for (let i = 0; i < tiers.length - 1; i++) {
    const d = tiers[i + 1] - tiers[i];
    if (d > 0) tierShiftBonus += 120 * d;
    else if (d < 0) tierShiftBonus -= 200 * Math.abs(d);
  }

  // 5. Zero-Deterioration Streak (Capped at 100)
  let nonDec = true;
  for (let i = 0; i < tiers.length - 1; i++) {
    if (tiers[i + 1] < tiers[i]) nonDec = false;
  }
  if (nonDec) {
    if (tiers.length >= 4) streakBonus = 100;
    else if (tiers.length >= 3) streakBonus = 60;
  }

  const rawTotal = revBonus + patBonus + marginBonus + tierShiftBonus + streakBonus;
  return Math.max(-TRAJECTORY_PENALTY_MAX, Math.min(TRAJECTORY_BONUS_MAX, rawTotal));
}

/** Listing sort: latest quarter thesis+confidence plus multi-quarter improvement runway. */
export function consolidatedPortfolioSortScore(snapshots: SnapshotRowLike[] | null | undefined): number {
  const desc = sortSnapshotsByQuarterDesc(snapshots || []);
  const latest = desc[0];
  if (!latest) return -1;
  return snapshotThesisSortScore(latest) + trajectoryBonusFromSnapshots(snapshots);
}

export type ActionableVerdictLite = {
  decision: string | null;
  convictionLevel: string | null;
  positionSize: string | null;
};

export function actionableVerdictFromSnapshot(snap: SnapshotRowLike): ActionableVerdictLite {
  const raw = parseRawJson(snap.raw_ai_output);

  // New V7 schema: decision block takes precedence.
  const decisionBlock = raw?.decision;
  if (decisionBlock && typeof decisionBlock === "object" && !Array.isArray(decisionBlock)) {
    const d = decisionBlock as Record<string, unknown>;
    const finalAction = typeof d.final_action === "string" ? d.final_action.trim() || null : null;
    const positionSize = typeof d.position_size === "string" ? d.position_size.trim() || null : null;
    const confidence = typeof d.decision_confidence === "string" ? d.decision_confidence.trim() || null : null;
    if (finalAction) {
      return { decision: finalAction, convictionLevel: confidence, positionSize };
    }
  }

  // Fallback: old V5/V6 actionable_verdict block.
  const v = raw?.actionable_verdict;
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    return { decision: null, convictionLevel: null, positionSize: null };
  }
  const o = v as Record<string, unknown>;
  const decision = typeof o.decision === "string" ? o.decision.trim() || null : null;
  const convictionLevel =
    typeof o.conviction_level === "string" ? o.conviction_level.trim() || null : null;
  return { decision, convictionLevel, positionSize: null };
}

export type LatestSnapshotQuarterContext = {
  quarter: string;
  thesisStatus: string | null;
  /** Latest quarter only (thesis tier × 1000 + confidence). */
  sortScore: number;
  /** Multi-quarter thesis trajectory bonus (improving / holding vs downgrades). */
  trajectoryBonus: number;
  /** sortScore + trajectoryBonus — use for portfolio list ordering. */
  consolidatedSortScore: number;
  portfolioRank: { rank: number; cohortSize: number } | null;
  verdict: ActionableVerdictLite;
};

/** Newest fiscal quarter row: thesis, sort key, and optional DB portfolio rank (#1 = best in cohort). */
export function latestSnapshotQuarterContext(
  snapshots: SnapshotRowLike[] | null | undefined,
): LatestSnapshotQuarterContext | null {
  const sorted = sortSnapshotsByQuarterDesc(snapshots || []);
  const latest = sorted[0];
  if (!latest) return null;
  const quarter = String(latest.quarter ?? "");
  const thesisStatus = thesisStatusFromSnapshot(latest);
  const sortScore = snapshotThesisSortScore(latest);
  const trajectoryBonus = trajectoryBonusFromSnapshots(snapshots);
  const consolidatedSortScore = sortScore + trajectoryBonus;
  const r = latest.portfolio_rank;
  const n = latest.portfolio_cohort_size;
  const portfolioRank = r != null && n != null ? { rank: r, cohortSize: n } : null;
  const verdict = actionableVerdictFromSnapshot(latest);
  return {
    quarter,
    thesisStatus,
    sortScore,
    trajectoryBonus,
    consolidatedSortScore,
    portfolioRank,
    verdict,
  };
}

export type LatestPortfolioRank = {
  quarter: string;
  rank: number;
  cohortSize: number;
  thesisStatus: string | null;
} | null;

/** DB rank fields only (null if ranks not applied yet). */
export function latestSnapshotPortfolioRank(snapshots: SnapshotRowLike[] | null | undefined): LatestPortfolioRank {
  const ctx = latestSnapshotQuarterContext(snapshots);
  if (!ctx?.portfolioRank) return null;
  return {
    quarter: ctx.quarter,
    rank: ctx.portfolioRank.rank,
    cohortSize: ctx.portfolioRank.cohortSize,
    thesisStatus: ctx.thesisStatus,
  };
}
