// Pure clamp/trim helpers shared by the reducer and UI input handlers.

// Range is [0, scaleMax] — inclusive of 0 — so §4.6 null-vs-0 works.
export function clampScore(n: number, scaleMax: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(scaleMax, Math.trunc(n)));
}

export function clampWeight(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(10, Math.trunc(n)));
}

export function trimName(s: string, max: number): string {
  return s.replace(/\s+/g, " ").trim().slice(0, max);
}
