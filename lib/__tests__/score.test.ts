import { describe, it, expect } from "vitest";
import type { Matrix } from "../state";
import { findWinners, hasAnyNullCell, isShareable, scoreOption } from "../score";

function build(partial: Partial<Matrix> & {
  options: Matrix["options"];
  factors: Matrix["factors"];
  scores: Matrix["scores"];
}): Matrix {
  return {
    title: partial.title ?? "",
    scale: partial.scale ?? 5,
    options: partial.options,
    factors: partial.factors,
    scores: partial.scores,
  };
}

describe("scoreOption — null vs 0 (§4.6)", () => {
  it("null cells are excluded from both numerator and denominator", () => {
    // Case 1: [5, null] on scale 5 with weights [1, 1]
    //   total = 5*1 = 5, max = 5*1 = 5 (null factor excluded), normalized = 1.0
    const m = build({
      options: [{ id: "A", name: "" }],
      factors: [
        { id: "f1", name: "", weight: 1 },
        { id: "f2", name: "", weight: 1 },
      ],
      scores: { A: { f1: 5, f2: null } },
    });
    const s = scoreOption(m, "A");
    expect(s.total).toBe(5);
    expect(s.maxPossible).toBe(5);
    expect(s.normalized).toBe(1.0);
    expect(s.hasAnyScore).toBe(true);
  });

  it("literal 0 is included in both numerator and denominator", () => {
    // Case 2: [5, 0] on scale 5, weights [1, 1]
    //   total = 5*1 + 0*1 = 5, max = 5*1 + 5*1 = 10, normalized = 0.5
    const m = build({
      options: [{ id: "A", name: "" }],
      factors: [
        { id: "f1", name: "", weight: 1 },
        { id: "f2", name: "", weight: 1 },
      ],
      scores: { A: { f1: 5, f2: 0 } },
    });
    const s = scoreOption(m, "A");
    expect(s.total).toBe(5);
    expect(s.maxPossible).toBe(10);
    expect(s.normalized).toBe(0.5);
  });

  it("normalized score is correct on a mixed-fill matrix", () => {
    // [3, null, 4] on scale 5, weights [2, 3, 1]
    //   total = 3*2 + 4*1 = 10, max = 5*2 + 5*1 = 15, normalized = 2/3
    const m = build({
      options: [{ id: "A", name: "" }],
      factors: [
        { id: "f1", name: "", weight: 2 },
        { id: "f2", name: "", weight: 3 },
        { id: "f3", name: "", weight: 1 },
      ],
      scores: { A: { f1: 3, f2: null, f3: 4 } },
    });
    const s = scoreOption(m, "A");
    expect(s.total).toBe(10);
    expect(s.maxPossible).toBe(15);
    expect(s.normalized).toBeCloseTo(2 / 3, 10);
  });

  it("option with no scored cells returns the em-dash sentinel (total 0, max 0, normalized null)", () => {
    const m = build({
      options: [{ id: "A", name: "" }],
      factors: [
        { id: "f1", name: "", weight: 5 },
        { id: "f2", name: "", weight: 5 },
      ],
      scores: { A: { f1: null, f2: null } },
    });
    const s = scoreOption(m, "A");
    expect(s.total).toBe(0);
    expect(s.maxPossible).toBe(0);
    expect(s.normalized).toBeNull();
    expect(s.hasAnyScore).toBe(false);
  });
});

describe("findWinners — normalized, not raw total (§4.8)", () => {
  it("raw-total leader can lose to a partial-fill option on normalized", () => {
    // Option A: fully scored low — total = 2+2 = 4, max = 5+5 = 10, norm = 0.4
    // Option B: one cell scored high — total = 5, max = 5, norm = 1.0
    // Raw-total winner is... tie at 4 vs 5. B has higher raw total AND higher norm here.
    // Flip: A fully scored low (total 4), B partially scored medium (total 3, max 5 → 0.6).
    // A raw=4 > B raw=3, but B norm=0.6 > A norm=0.4 → B wins by normalized.
    const m = build({
      options: [
        { id: "A", name: "A" },
        { id: "B", name: "B" },
      ],
      factors: [
        { id: "f1", name: "", weight: 1 },
        { id: "f2", name: "", weight: 1 },
      ],
      scores: {
        A: { f1: 2, f2: 2 }, // total 4, max 10, norm 0.4
        B: { f1: 3, f2: null }, // total 3, max 5, norm 0.6
      },
    });
    expect(findWinners(m)).toEqual(["B"]);
  });

  it("returns no winner when fewer than 2 options", () => {
    const m = build({
      options: [{ id: "A", name: "" }],
      factors: [{ id: "f1", name: "", weight: 1 }],
      scores: { A: { f1: 3 } },
    });
    expect(findWinners(m)).toEqual([]);
  });

  it("returns no winner when no cells scored", () => {
    const m = build({
      options: [
        { id: "A", name: "" },
        { id: "B", name: "" },
      ],
      factors: [{ id: "f1", name: "", weight: 1 }],
      scores: { A: { f1: null }, B: { f1: null } },
    });
    expect(findWinners(m)).toEqual([]);
  });
});

describe("findWinners — ties", () => {
  it("detects a 2-way tie and returns all tied ids", () => {
    const m = build({
      options: [
        { id: "A", name: "" },
        { id: "B", name: "" },
      ],
      factors: [{ id: "f1", name: "", weight: 1 }],
      scores: { A: { f1: 4 }, B: { f1: 4 } },
    });
    expect(findWinners(m).sort()).toEqual(["A", "B"]);
  });

  it("detects a 3-way tie with different total/max but equal normalized", () => {
    // All normalize to 0.5 — C has a different total/max than A/B.
    // A: f1=5 (w1) only → total 5, max 10, norm 0.5
    // B: f2=5 (w1) only → total 5, max 10, norm 0.5
    // C: f1=10, f2=0 (w1 each) → total 10, max 20, norm 0.5
    const m = build({
      options: [
        { id: "A", name: "" },
        { id: "B", name: "" },
        { id: "C", name: "" },
      ],
      factors: [
        { id: "f1", name: "", weight: 1 },
        { id: "f2", name: "", weight: 1 },
        { id: "f3", name: "", weight: 1 },
      ],
      scale: 10,
      scores: {
        A: { f1: 5, f2: null, f3: null },
        B: { f1: null, f2: 5, f3: null },
        C: { f1: 10, f2: 0, f3: null },
      },
    });
    expect(findWinners(m).sort()).toEqual(["A", "B", "C"]);
  });
});

describe("hasAnyNullCell", () => {
  it("true when any cell is null", () => {
    const m = build({
      options: [{ id: "A", name: "" }],
      factors: [
        { id: "f1", name: "", weight: 1 },
        { id: "f2", name: "", weight: 1 },
      ],
      scores: { A: { f1: 1, f2: null } },
    });
    expect(hasAnyNullCell(m)).toBe(true);
  });

  it("false when every cell is scored (including 0)", () => {
    const m = build({
      options: [{ id: "A", name: "" }],
      factors: [
        { id: "f1", name: "", weight: 1 },
        { id: "f2", name: "", weight: 1 },
      ],
      scores: { A: { f1: 0, f2: 3 } },
    });
    expect(hasAnyNullCell(m)).toBe(false);
  });
});

describe("isShareable", () => {
  it("false until ≥2 options, ≥1 factor, ≥1 scored cell", () => {
    const base = build({
      options: [
        { id: "A", name: "" },
        { id: "B", name: "" },
      ],
      factors: [{ id: "f1", name: "", weight: 5 }],
      scores: { A: { f1: null }, B: { f1: null } },
    });
    expect(isShareable(base)).toBe(false);
    const scored: Matrix = {
      ...base,
      scores: { ...base.scores, A: { f1: 3 } },
    };
    expect(isShareable(scored)).toBe(true);
  });

  it("true even when the only scored cell is 0", () => {
    const m = build({
      options: [
        { id: "A", name: "" },
        { id: "B", name: "" },
      ],
      factors: [{ id: "f1", name: "", weight: 5 }],
      scores: { A: { f1: 0 }, B: { f1: null } },
    });
    expect(isShareable(m)).toBe(true);
  });
});
