// Worst-case URL length (10 options × 8 factors, 40-char names, all 80 cells
// scored at max): 1241 chars of encoded payload — comfortably under the
// 2000-char budget for broad link compatibility. Measured by the "URL length
// sanity (worst case)" test in lib/__tests__/encode.test.ts; that test will
// fail if a future change pushes the payload over budget.

import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import { MAX_FACTORS, MAX_NAME_LEN, MAX_OPTIONS } from "./state";
import type { Matrix, Scale, ScoreCell } from "./state";

// Compact serialized form — single-letter keys + null cells stripped from scores.
type SerializedMatrix = {
  t: string;
  s: Scale;
  o: Array<{ i: string; n: string }>;
  f: Array<{ i: string; n: string; w: number }>;
  c: Record<string, Record<string, number>>;
};

export function encode(state: Matrix): string {
  const serialized: SerializedMatrix = {
    t: state.title,
    s: state.scale,
    o: state.options.map((o) => ({ i: o.id, n: o.name })),
    f: state.factors.map((f) => ({ i: f.id, n: f.name, w: f.weight })),
    c: {},
  };
  for (const o of state.options) {
    const row = state.scores[o.id] ?? {};
    const compactRow: Record<string, number> = {};
    let any = false;
    for (const f of state.factors) {
      const v = row[f.id];
      if (typeof v === "number") {
        compactRow[f.id] = v;
        any = true;
      }
    }
    if (any) serialized.c[o.id] = compactRow;
  }
  return compressToEncodedURIComponent(JSON.stringify(serialized));
}

export type DecodeResult =
  | { ok: true; value: Matrix }
  | { ok: false; reason: string };

export function decode(encoded: string): DecodeResult {
  if (typeof encoded !== "string" || encoded.length === 0) {
    return { ok: false, reason: "empty input" };
  }
  let jsonStr: string | null = null;
  try {
    jsonStr = decompressFromEncodedURIComponent(encoded);
  } catch {
    return { ok: false, reason: "decompression failed" };
  }
  if (!jsonStr) return { ok: false, reason: "empty or corrupt payload" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { ok: false, reason: "invalid JSON" };
  }
  return validate(parsed);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validate(parsed: unknown): DecodeResult {
  if (!isRecord(parsed)) return { ok: false, reason: "not an object" };

  const { t, s, o, f, c } = parsed;
  if (typeof t !== "string") return { ok: false, reason: "title missing" };
  if (s !== 5 && s !== 10) return { ok: false, reason: "invalid scale" };
  if (!Array.isArray(o)) return { ok: false, reason: "options not array" };
  if (!Array.isArray(f)) return { ok: false, reason: "factors not array" };
  if (o.length < 1 || o.length > MAX_OPTIONS)
    return { ok: false, reason: "options count out of range" };
  if (f.length < 1 || f.length > MAX_FACTORS)
    return { ok: false, reason: "factors count out of range" };
  if (!isRecord(c)) return { ok: false, reason: "scores not object" };

  const options: Matrix["options"] = [];
  for (const opt of o) {
    if (!isRecord(opt)) return { ok: false, reason: "option not object" };
    if (typeof opt.i !== "string") return { ok: false, reason: "option id" };
    if (typeof opt.n !== "string") return { ok: false, reason: "option name" };
    options.push({ id: opt.i, name: (opt.n as string).slice(0, MAX_NAME_LEN) });
  }

  const factors: Matrix["factors"] = [];
  for (const fac of f) {
    if (!isRecord(fac)) return { ok: false, reason: "factor not object" };
    if (typeof fac.i !== "string") return { ok: false, reason: "factor id" };
    if (typeof fac.n !== "string") return { ok: false, reason: "factor name" };
    if (
      typeof fac.w !== "number" ||
      !Number.isFinite(fac.w) ||
      fac.w < 1 ||
      fac.w > 10
    ) {
      return { ok: false, reason: "factor weight out of range" };
    }
    factors.push({ id: fac.i, name: (fac.n as string).slice(0, MAX_NAME_LEN), weight: Math.trunc(fac.w) });
  }

  const scale = s as Scale;
  const optionIds = new Set(options.map((opt) => opt.id));
  const factorIds = new Set(factors.map((fac) => fac.id));
  if (optionIds.size !== options.length)
    return { ok: false, reason: "duplicate option ids" };
  if (factorIds.size !== factors.length)
    return { ok: false, reason: "duplicate factor ids" };

  const scores: Record<string, Record<string, ScoreCell>> = {};
  for (const opt of options) {
    scores[opt.id] = {};
    for (const fac of factors) scores[opt.id][fac.id] = null;
  }

  for (const [optId, row] of Object.entries(c)) {
    if (!optionIds.has(optId)) continue;
    if (!isRecord(row)) return { ok: false, reason: "score row not object" };
    for (const [facId, v] of Object.entries(row)) {
      if (!factorIds.has(facId)) continue;
      if (
        typeof v !== "number" ||
        !Number.isFinite(v) ||
        v < 0 ||
        v > scale
      ) {
        return { ok: false, reason: "score out of range" };
      }
      scores[optId][facId] = Math.trunc(v);
    }
  }

  return {
    ok: true,
    value: { title: t.slice(0, 120), scale, options, factors, scores },
  };
}
