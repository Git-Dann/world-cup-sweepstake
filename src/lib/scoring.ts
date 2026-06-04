// Scoring configuration + round helpers. Framework-free (safe on server/edge).

export type ScoringConfig = {
  groupWin: number;
  groupDraw: number;
  reachR32: number;
  reachR16: number;
  reachQF: number;
  reachSF: number;
  reachFinal: number;
  winCup: number;
  goalBonus: number; // points per goal scored; default 0 (off)
};

export const DEFAULT_SCORING: ScoringConfig = {
  groupWin: 3,
  groupDraw: 1,
  reachR32: 3,
  reachR16: 5,
  reachQF: 8,
  reachSF: 12,
  reachFinal: 18,
  winCup: 30,
  goalBonus: 0,
};

export function mergeScoring(raw: unknown): ScoringConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SCORING };
  return { ...DEFAULT_SCORING, ...(raw as Partial<ScoringConfig>) };
}

export type RoundKey = "GROUP" | "R32" | "R16" | "QF" | "SF" | "FINAL";

// Map an API-Football `league.round` string to a normalised round key.
// Order matters: "Quarter-finals"/"Semi-finals" contain the substring "final".
export function roundKeyFromApi(round: string): RoundKey {
  const r = round.toLowerCase();
  if (r.includes("group")) return "GROUP";
  if (r.includes("round of 32") || r.includes("1/16")) return "R32";
  if (r.includes("round of 16") || r.includes("1/8")) return "R16";
  if (r.includes("quarter")) return "QF";
  // 3rd-place playoff teams are semi-finalists, not finalists.
  if (r.includes("3rd place") || r.includes("third place")) return "SF";
  if (r.includes("semi")) return "SF";
  if (r.includes("final")) return "FINAL";
  return "GROUP";
}

export const ROUND_LABELS: Record<RoundKey, string> = {
  GROUP: "Group Stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  FINAL: "Final",
};

// How far along the bracket a round is (for "furthest reached" comparisons).
export const ROUND_ORDER: Record<RoundKey, number> = {
  GROUP: 0,
  R32: 1,
  R16: 2,
  QF: 3,
  SF: 4,
  FINAL: 5,
};

// The "reaching this round" bonus for both teams in a knockout fixture.
export function reachBonus(
  round: RoundKey,
  scoring: ScoringConfig,
): { kind: string; points: number } | null {
  switch (round) {
    case "R32":
      return { kind: "REACH_R32", points: scoring.reachR32 };
    case "R16":
      return { kind: "REACH_R16", points: scoring.reachR16 };
    case "QF":
      return { kind: "REACH_QF", points: scoring.reachQF };
    case "SF":
      return { kind: "REACH_SF", points: scoring.reachSF };
    case "FINAL":
      return { kind: "REACH_FINAL", points: scoring.reachFinal };
    default:
      return null;
  }
}
