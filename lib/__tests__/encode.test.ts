import { describe, it, expect } from "vitest";
import { compressToEncodedURIComponent } from "lz-string";
import { decode, encode } from "../encode";
import { defaultMatrix, reducer, type Matrix } from "../state";

// 2000 chars is our soft budget for broad link compatibility (Slack, iMessage,
// Twitter, legacy link handlers). If this assertion ever starts failing, stop
// and shorten the encoding scheme before building on top of it.
const URL_LENGTH_BUDGET = 2000;

describe("encode / decode round-trip", () => {
  it("round-trip preserves state exactly, including null cells and empty names", () => {
    const base = defaultMatrix();
    // Score a couple of cells, leave others null.
    let s = reducer(base, {
      type: "setScore",
      optionId: base.options[0].id,
      factorId: base.factors[0].id,
      value: 3,
    });
    s = reducer(s, {
      type: "setScore",
      optionId: base.options[1].id,
      factorId: base.factors[2].id,
      value: 0,
    });
    s = reducer(s, { type: "setTitle", title: "choosing a laptop" });
    s = reducer(s, { type: "renameOption", id: base.options[0].id, name: "MacBook" });

    const encoded = encode(s);
    const result = decode(encoded);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(s);
    }
  });

  it("an all-null matrix round-trips cleanly", () => {
    const s = defaultMatrix();
    const encoded = encode(s);
    const result = decode(encoded);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(s);
  });
});

describe("decode — typed Result, never throws on bad input", () => {
  it("returns { ok:false } for empty string", () => {
    const r = decode("");
    expect(r.ok).toBe(false);
  });

  it("returns { ok:false } for non-lz-string garbage", () => {
    const r = decode("!!!not-valid-lz-string-payload!!!");
    expect(r.ok).toBe(false);
  });

  it("returns { ok:false } for truncated valid payload", () => {
    const full = encode(defaultMatrix());
    const truncated = full.slice(0, Math.max(1, full.length - 5));
    const r = decode(truncated);
    // Either the truncation decompresses to garbage JSON or fails validation.
    expect(r.ok).toBe(false);
  });

  it("returns { ok:false } for a valid JSON payload with the wrong shape", () => {
    const encoded = compressToEncodedURIComponent(
      JSON.stringify({ not: "the right shape" }),
    );
    const r = decode(encoded);
    expect(r.ok).toBe(false);
  });

  it("returns { ok:false } for an oversized payload without decompressing it", () => {
    // 8001 chars — one past the MAX_ENCODED_LEN guard. Rejected on length alone,
    // so no decompression work is done on this input.
    const r = decode("a".repeat(8001));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("payload too large");
  });

  it("returns { ok:false } when a score is out of range for the declared scale", () => {
    const payload = {
      t: "",
      s: 5,
      o: [{ i: "A", n: "" }],
      f: [{ i: "f1", n: "", w: 1 }],
      c: { A: { f1: 99 } },
    };
    const encoded = compressToEncodedURIComponent(JSON.stringify(payload));
    const r = decode(encoded);
    expect(r.ok).toBe(false);
  });
});

describe("rescale through hydration", () => {
  it("starting at scale 5, encoding, decoding, then setScale(10) doubles every non-null cell", () => {
    const base = defaultMatrix();
    const [a, b] = base.options;
    const [f1, f2] = [base.factors[0].id, base.factors[1].id];
    let s: Matrix = base;
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f1, value: 2 });
    s = reducer(s, { type: "setScore", optionId: a.id, factorId: f2, value: 4 });
    s = reducer(s, { type: "setScore", optionId: b.id, factorId: f1, value: 5 });

    const encoded = encode(s);
    const decoded = decode(encoded);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

    // Hydrate, then set scale to 10.
    let h = reducer(defaultMatrix(), { type: "hydrate", state: decoded.value });
    h = reducer(h, { type: "setScale", scale: 10 });

    expect(h.scale).toBe(10);
    expect(h.scores[a.id][f1]).toBe(4);   // 2 × 2
    expect(h.scores[a.id][f2]).toBe(8);   // 4 × 2
    expect(h.scores[b.id][f1]).toBe(10);  // 5 × 2
    expect(h.scores[b.id][f2]).toBeNull();
  });
});

describe("URL length sanity (worst case)", () => {
  it("10 × 8 worst-case matrix encodes within the URL budget", () => {
    // Build 10 options × 8 factors, 40-char names, all cells scored at 10.
    let s: Matrix = defaultMatrix();
    while (s.options.length < 10) s = reducer(s, { type: "addOption" });
    while (s.factors.length < 8) s = reducer(s, { type: "addFactor" });
    s = reducer(s, { type: "setScale", scale: 10 });
    s = reducer(s, {
      type: "setTitle",
      title: "A fairly long decision title to stress the encoder",
    });

    const fortyCharName = "option name padded to exactly fourtycha";
    for (const opt of s.options) {
      s = reducer(s, {
        type: "renameOption",
        id: opt.id,
        name: fortyCharName,
      });
    }
    for (const fac of s.factors) {
      s = reducer(s, {
        type: "renameFactor",
        id: fac.id,
        name: fortyCharName,
      });
      s = reducer(s, { type: "setWeight", id: fac.id, weight: 10 });
    }
    for (const opt of s.options) {
      for (const fac of s.factors) {
        s = reducer(s, {
          type: "setScore",
          optionId: opt.id,
          factorId: fac.id,
          value: 10,
        });
      }
    }

    const encoded = encode(s);
    // URL will be like https://<host>/?m=<encoded> — the encoded segment
    // dominates. We measure the encoded payload directly.
    // Log for the encode.ts comment.
    // eslint-disable-next-line no-console
    console.log(`[URL length] worst-case encoded length: ${encoded.length} chars`);
    expect(encoded.length).toBeLessThanOrEqual(URL_LENGTH_BUDGET);

    // Round-trip still works at worst case.
    const r = decode(encoded);
    expect(r.ok).toBe(true);
  });
});
