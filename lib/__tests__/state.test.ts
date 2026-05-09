import { describe, it, expect } from "vitest";
import { defaultMatrix, reducer, type Matrix } from "../state";

describe("reducer — setScale ordering (§4.5, load-bearing)", () => {
  it("rescales BEFORE clamping: setScale 10→5 on a score of 8 produces 4, not 5", () => {
    // Start on scale 10 with one scored cell = 8.
    let s: Matrix = defaultMatrix();
    // Move to scale 10 first.
    s = reducer(s, { type: "setScale", scale: 10 });
    const optionId = s.options[0].id;
    const factorId = s.factors[0].id;
    s = reducer(s, { type: "setScore", optionId, factorId, value: 8 });
    expect(s.scores[optionId][factorId]).toBe(8);

    // Now toggle to scale 5 — if clamp ran first, the 8 would clamp to 5,
    // then be untouched (or halved to 3). The correct path rescales first:
    // 8 / 2 = 4 (no rounding needed). This test guards that ordering.
    s = reducer(s, { type: "setScale", scale: 5 });
    expect(s.scale).toBe(5);
    expect(s.scores[optionId][factorId]).toBe(4);
  });

  it("halves round up per §4.5 on 10→5 (1→1, 3→2, 5→3, 7→4, 9→5)", () => {
    let s: Matrix = defaultMatrix();
    s = reducer(s, { type: "setScale", scale: 10 });
    const [a, b] = s.options;
    const [f1, f2, f3, f4, f5] = [
      s.factors[0].id,
      s.factors[1].id,
      s.factors[2].id,
      s.factors[0].id, // reuse — only 3 default factors; we'll use 3 pairs
      s.factors[1].id,
    ];
    // Seed values 1, 3, 5, 7, 9 across two options' cells.
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f1, value: 1 });
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f2, value: 3 });
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f3, value: 5 });
    s = reducer(s, { type: "setScore", optionId: b.id, factorId: f4, value: 7 });
    s = reducer(s, { type: "setScore", optionId: b.id, factorId: f5, value: 9 });

    s = reducer(s, { type: "setScale", scale: 5 });
    expect(s.scores[a.id][f1]).toBe(1); // 1→1
    expect(s.scores[a.id][f2]).toBe(2); // 3→2
    expect(s.scores[a.id][f3]).toBe(3); // 5→3
    expect(s.scores[b.id][f4]).toBe(4); // 7→4
    expect(s.scores[b.id][f5]).toBe(5); // 9→5
  });

  it("nulls are preserved across rescale", () => {
    let s: Matrix = defaultMatrix();
    const [a] = s.options;
    const [f1, f2] = [s.factors[0].id, s.factors[1].id];
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f1, value: 3 });
    // f2 stays null.
    s = reducer(s, { type: "setScale", scale: 10 });
    expect(s.scores[a.id][f1]).toBe(6);
    expect(s.scores[a.id][f2]).toBeNull();
  });

  it("5→10 doubles every non-null cell and clamps at 10", () => {
    let s: Matrix = defaultMatrix();
    const [a] = s.options;
    const [f1] = [s.factors[0].id];
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f1, value: 5 });
    s = reducer(s, { type: "setScale", scale: 10 });
    expect(s.scores[a.id][f1]).toBe(10);
  });
});

describe("reducer — score cell mutations (§4.6)", () => {
  it("setScore value=null removes the score (null stored)", () => {
    let s: Matrix = defaultMatrix();
    const [a] = s.options;
    const [f1] = [s.factors[0].id];
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f1, value: 4 });
    expect(s.scores[a.id][f1]).toBe(4);
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f1, value: null });
    expect(s.scores[a.id][f1]).toBeNull();
  });

  it("setScore value=0 stores literal 0 (distinct from null)", () => {
    let s: Matrix = defaultMatrix();
    const [a] = s.options;
    const [f1] = [s.factors[0].id];
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f1, value: 0 });
    expect(s.scores[a.id][f1]).toBe(0);
  });

  it("setScore clamps out-of-range into [0, scaleMax]", () => {
    let s: Matrix = defaultMatrix();
    const [a] = s.options;
    const [f1] = [s.factors[0].id];
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f1, value: 99 });
    expect(s.scores[a.id][f1]).toBe(5);
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f1, value: -3 });
    expect(s.scores[a.id][f1]).toBe(0);
  });
});

describe("reducer — options/factors lifecycle", () => {
  it("deleting an option removes its scores row", () => {
    let s: Matrix = defaultMatrix();
    const [a, b] = s.options;
    s = reducer(s, { type: "deleteOption", id: a.id });
    expect(s.options.map((o) => o.id)).toEqual([b.id]);
    expect(s.scores[a.id]).toBeUndefined();
  });

  it("deleting a factor removes it from every option's row", () => {
    let s: Matrix = defaultMatrix();
    const factorId = s.factors[0].id;
    s = reducer(s, { type: "deleteFactor", id: factorId });
    expect(s.factors.find((f) => f.id === factorId)).toBeUndefined();
    for (const o of s.options) {
      expect(s.scores[o.id][factorId]).toBeUndefined();
    }
  });

  it("addOption adds a row with null cells for every factor", () => {
    let s: Matrix = defaultMatrix();
    s = reducer(s, { type: "addOption" });
    const newId = s.options[2].id;
    for (const f of s.factors) expect(s.scores[newId][f.id]).toBeNull();
  });

  it("addFactor adds a column with null cells for every existing option", () => {
    let s: Matrix = defaultMatrix();
    s = reducer(s, { type: "addFactor" });
    const newId = s.factors[3].id;
    for (const o of s.options) expect(s.scores[o.id][newId]).toBeNull();
  });

  it("enforces the soft caps — 10 options, 8 factors", () => {
    let s: Matrix = defaultMatrix();
    for (let i = 0; i < 20; i++) s = reducer(s, { type: "addOption" });
    expect(s.options.length).toBe(10);
    for (let i = 0; i < 20; i++) s = reducer(s, { type: "addFactor" });
    expect(s.factors.length).toBe(8);
  });
});

describe("reducer — weight clamping", () => {
  it("clamps weight to [1,10]", () => {
    let s: Matrix = defaultMatrix();
    const id = s.factors[0].id;
    s = reducer(s, { type: "setWeight", id, weight: 99 });
    expect(s.factors[0].weight).toBe(10);
    s = reducer(s, { type: "setWeight", id, weight: 0 });
    expect(s.factors[0].weight).toBe(1);
  });
});

describe("reducer — reset + hydrate", () => {
  it("reset returns a fresh default matrix", () => {
    let s: Matrix = defaultMatrix();
    s = reducer(s, { type: "setTitle", title: "something" });
    s = reducer(s, { type: "reset" });
    expect(s.title).toBe("");
    expect(s.options.length).toBe(2);
    expect(s.factors.length).toBe(3);
  });

  it("hydrate replaces state with the provided matrix", () => {
    const other: Matrix = {
      title: "hello",
      scale: 10,
      options: [{ id: "x", name: "X" }],
      factors: [{ id: "y", name: "Y", weight: 7 }],
      scores: { x: { y: 8 } },
    };
    const s = reducer(defaultMatrix(), { type: "hydrate", state: other });
    expect(s).toEqual(other);
  });
});
