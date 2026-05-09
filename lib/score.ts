import type { Matrix } from "./state";

export type OptionScore = {
  optionId: string;
  total: number;
  maxPossible: number;
  // normalized is null when no cells are scored (em-dash case, §4.7).
  normalized: number | null;
  hasAnyScore: boolean;
};

export function scoreOption(matrix: Matrix, optionId: string): OptionScore {
  const row = matrix.scores[optionId] ?? {};
  let total = 0;
  let maxPossible = 0;
  let hasAnyScore = false;
  for (const factor of matrix.factors) {
    const cell = row[factor.id];
    if (cell === null || cell === undefined) continue;
    hasAnyScore = true;
    total += cell * factor.weight;
    maxPossible += matrix.scale * factor.weight;
  }
  const normalized = maxPossible > 0 ? total / maxPossible : null;
  return { optionId, total, maxPossible, normalized, hasAnyScore };
}

export function scoreAll(matrix: Matrix): OptionScore[] {
  return matrix.options.map((o) => scoreOption(matrix, o.id));
}

// Winner by normalized, not raw total (§4.8). Compared via cross-multiplication
// to avoid IEEE-754 equality edge cases for ties.
// Returns every tied option id; empty when no winner is defined.
export function findWinners(matrix: Matrix): string[] {
  if (matrix.options.length < 2 || matrix.factors.length < 1) return [];
  const scored = scoreAll(matrix).filter((s) => s.hasAnyScore);
  if (scored.length === 0) return [];
  let best: OptionScore[] = [scored[0]];
  for (let i = 1; i < scored.length; i++) {
    const cur = scored[i];
    const head = best[0];
    // Compare cur vs head via  cur.total * head.max  vs  head.total * cur.max.
    const lhs = cur.total * head.maxPossible;
    const rhs = head.total * cur.maxPossible;
    if (lhs > rhs) best = [cur];
    else if (lhs === rhs) best.push(cur);
  }
  return best.map((s) => s.optionId);
}

// Any unscored cell → show the incomplete-matrix notice (§4.8).
export function hasAnyNullCell(matrix: Matrix): boolean {
  for (const o of matrix.options) {
    const row = matrix.scores[o.id] ?? {};
    for (const f of matrix.factors) {
      const v = row[f.id];
      if (v === null || v === undefined) return true;
    }
  }
  return false;
}

// Share button goes orange once the matrix is "worth sharing" (§5.3).
// Same conditions under which a winner can exist.
export function isShareable(matrix: Matrix): boolean {
  if (matrix.options.length < 2) return false;
  if (matrix.factors.length < 1) return false;
  for (const o of matrix.options) {
    const row = matrix.scores[o.id] ?? {};
    for (const f of matrix.factors) {
      const v = row[f.id];
      if (v !== null && v !== undefined) return true;
    }
  }
  return false;
}
