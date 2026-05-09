import { nanoid } from "nanoid";
import { rescale } from "./scale";
import { clampScore, clampWeight, trimName } from "./validate";

export type ScoreCell = number | null;
export type Scale = 5 | 10;

export type Option = { id: string; name: string };
export type Factor = { id: string; name: string; weight: number };

export type Matrix = {
  title: string;
  scale: Scale;
  options: Option[];
  factors: Factor[];
  // scores[optionId][factorId] — null means "not scored" (§4.6).
  scores: Record<string, Record<string, ScoreCell>>;
};

export const MAX_OPTIONS = 10;
export const MAX_FACTORS = 8;
export const DEFAULT_WEIGHT = 5;
export const MAX_TITLE_LEN = 120;
export const MAX_NAME_LEN = 60;

export function defaultMatrix(): Matrix {
  const o1 = nanoid(6);
  const o2 = nanoid(6);
  const f1 = nanoid(6);
  const f2 = nanoid(6);
  const f3 = nanoid(6);
  return {
    title: "",
    scale: 5,
    options: [
      { id: o1, name: "" },
      { id: o2, name: "" },
    ],
    factors: [
      { id: f1, name: "", weight: DEFAULT_WEIGHT },
      { id: f2, name: "", weight: DEFAULT_WEIGHT },
      { id: f3, name: "", weight: DEFAULT_WEIGHT },
    ],
    scores: {
      [o1]: { [f1]: null, [f2]: null, [f3]: null },
      [o2]: { [f1]: null, [f2]: null, [f3]: null },
    },
  };
}

export type Action =
  | { type: "setTitle"; title: string }
  | { type: "addOption" }
  | { type: "renameOption"; id: string; name: string }
  | { type: "deleteOption"; id: string }
  | { type: "addFactor" }
  | { type: "renameFactor"; id: string; name: string }
  | { type: "deleteFactor"; id: string }
  | { type: "setWeight"; id: string; weight: number }
  | { type: "setScore"; optionId: string; factorId: string; value: ScoreCell }
  | { type: "setScale"; scale: Scale }
  | { type: "reset" }
  | { type: "hydrate"; state: Matrix };

export function reducer(state: Matrix, action: Action): Matrix {
  switch (action.type) {
    case "setTitle":
      return { ...state, title: action.title.slice(0, MAX_TITLE_LEN) };

    case "addOption": {
      if (state.options.length >= MAX_OPTIONS) return state;
      const id = nanoid(6);
      const newRow: Record<string, ScoreCell> = {};
      for (const f of state.factors) newRow[f.id] = null;
      return {
        ...state,
        options: [...state.options, { id, name: "" }],
        scores: { ...state.scores, [id]: newRow },
      };
    }

    case "renameOption":
      return {
        ...state,
        options: state.options.map((o) =>
          o.id === action.id ? { ...o, name: trimName(action.name, MAX_NAME_LEN) } : o,
        ),
      };

    case "deleteOption": {
      const { [action.id]: _removed, ...remainingScores } = state.scores;
      return {
        ...state,
        options: state.options.filter((o) => o.id !== action.id),
        scores: remainingScores,
      };
    }

    case "addFactor": {
      if (state.factors.length >= MAX_FACTORS) return state;
      const id = nanoid(6);
      const nextScores: Record<string, Record<string, ScoreCell>> = {};
      for (const o of state.options) {
        nextScores[o.id] = { ...state.scores[o.id], [id]: null };
      }
      return {
        ...state,
        factors: [...state.factors, { id, name: "", weight: DEFAULT_WEIGHT }],
        scores: nextScores,
      };
    }

    case "renameFactor":
      return {
        ...state,
        factors: state.factors.map((f) =>
          f.id === action.id ? { ...f, name: trimName(action.name, MAX_NAME_LEN) } : f,
        ),
      };

    case "deleteFactor": {
      const nextScores: Record<string, Record<string, ScoreCell>> = {};
      for (const o of state.options) {
        const { [action.id]: _removed, ...rest } = state.scores[o.id] ?? {};
        nextScores[o.id] = rest;
      }
      return {
        ...state,
        factors: state.factors.filter((f) => f.id !== action.id),
        scores: nextScores,
      };
    }

    case "setWeight":
      return {
        ...state,
        factors: state.factors.map((f) =>
          f.id === action.id ? { ...f, weight: clampWeight(action.weight) } : f,
        ),
      };

    case "setScore": {
      const { optionId, factorId, value } = action;
      const next: ScoreCell =
        value === null ? null : clampScore(value, state.scale);
      const row = state.scores[optionId] ?? {};
      return {
        ...state,
        scores: { ...state.scores, [optionId]: { ...row, [factorId]: next } },
      };
    }

    case "setScale": {
      // Rescale runs before the validation/clamp pass. Clamping first would
      // destroy data (e.g. 8 on scale 10 would clamp to 5 before becoming 4).
      // This ordering is guarded by state.test.ts case #9.
      if (action.scale === state.scale) return state;
      const rescaled = rescale(state.scores, state.scale, action.scale);
      return { ...state, scale: action.scale, scores: rescaled };
    }

    case "reset":
      return defaultMatrix();

    case "hydrate":
      return action.state;

    default:
      return state;
  }
}

// Placeholder labels (UI-only). Stored names are empty for defaults; the UI
// falls back to these positional labels when name === "".
export function optionPlaceholder(index: number): string {
  // 0 → "Option A", 1 → "Option B", …
  if (index < 26) return `Option ${String.fromCharCode(65 + index)}`;
  return `Option ${index + 1}`;
}

export function factorPlaceholder(index: number): string {
  return `Factor ${index + 1}`;
}

// "Start over" confirm trigger (§4.12): current state differs from default.
export function isDirty(state: Matrix): boolean {
  if (state.title !== "") return true;
  if (state.scale !== 5) return true;
  if (state.options.length !== 2) return true;
  if (state.factors.length !== 3) return true;
  for (const o of state.options) {
    if (o.name !== "") return true;
  }
  for (const f of state.factors) {
    if (f.name !== "" || f.weight !== DEFAULT_WEIGHT) return true;
  }
  for (const o of state.options) {
    const row = state.scores[o.id] ?? {};
    for (const f of state.factors) {
      if (row[f.id] !== null && row[f.id] !== undefined) return true;
    }
  }
  return false;
}

// Predicate used by DeleteButton to decide whether to require confirm.
export function optionHasData(state: Matrix, optionId: string): boolean {
  const opt = state.options.find((o) => o.id === optionId);
  if (opt && opt.name !== "") return true;
  const row = state.scores[optionId] ?? {};
  for (const f of state.factors) {
    if (row[f.id] !== null && row[f.id] !== undefined) return true;
  }
  return false;
}

export function factorHasData(state: Matrix, factorId: string): boolean {
  const fac = state.factors.find((f) => f.id === factorId);
  if (fac && (fac.name !== "" || fac.weight !== DEFAULT_WEIGHT)) return true;
  for (const o of state.options) {
    const v = state.scores[o.id]?.[factorId];
    if (v !== null && v !== undefined) return true;
  }
  return false;
}
