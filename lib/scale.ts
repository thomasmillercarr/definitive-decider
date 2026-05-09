// 10 → 5 → 10 is lossy; intentional per §4.5.
// JS Math.round rounds halves toward +Infinity for positive values, which
// matches §4.5's "halves round up" rule exactly for our range [0, 10].

import type { Scale, ScoreCell } from "./state";

export function rescaleCell(cell: ScoreCell, from: Scale, to: Scale): ScoreCell {
  if (cell === null) return null;
  if (from === to) return cell;
  if (from === 5 && to === 10) return Math.max(0, Math.min(10, cell * 2));
  // 10 → 5
  return Math.max(0, Math.min(5, Math.round(cell / 2)));
}

export function rescale(
  scores: Record<string, Record<string, ScoreCell>>,
  from: Scale,
  to: Scale,
): Record<string, Record<string, ScoreCell>> {
  if (from === to) return scores;
  const next: Record<string, Record<string, ScoreCell>> = {};
  for (const optionId of Object.keys(scores)) {
    const row: Record<string, ScoreCell> = {};
    for (const factorId of Object.keys(scores[optionId])) {
      row[factorId] = rescaleCell(scores[optionId][factorId], from, to);
    }
    next[optionId] = row;
  }
  return next;
}
