"use client";

import { useRef } from "react";
import type { Dispatch } from "react";
import type { Action, Matrix as MatrixType, ScoreCell } from "@/lib/state";
import {
  MAX_FACTORS,
  MAX_OPTIONS,
  factorHasData,
  optionHasData,
  optionPlaceholder,
} from "@/lib/state";
import { findWinners, hasAnyNullCell, scoreAll } from "@/lib/score";
import { FactorHeader } from "./FactorHeader";
import { OptionRow } from "./OptionRow";
import { TotalsRow } from "./TotalsRow";

type Props = {
  state: MatrixType;
  dispatch: Dispatch<Action>;
  armedDeleteId: string | null;
  setArmedDeleteId: (id: string | null) => void;
  focusRequest: FocusRequest | null;
  clearFocusRequest: () => void;
};

export type FocusRequest =
  | { kind: "option-last" }
  | { kind: "factor-last" }
  | { kind: "option-at"; index: number }
  | { kind: "factor-at"; index: number };

export function Matrix({
  state,
  dispatch,
  armedDeleteId,
  setArmedDeleteId,
  focusRequest,
  clearFocusRequest,
}: Props) {
  const optionRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const factorRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const scores = scoreAll(state);
  const winners = findWinners(state);
  const incomplete = hasAnyNullCell(state);

  // Resolve focus requests after render (called from MatrixPage via key-driven effects).
  const focusOptionByIndex = (index: number) => {
    const opt = state.options[index];
    if (!opt) return;
    const el = optionRefs.current.get(opt.id);
    el?.focus();
    el?.select();
  };
  const focusFactorByIndex = (index: number) => {
    const fac = state.factors[index];
    if (!fac) return;
    const el = factorRefs.current.get(fac.id);
    el?.focus();
    el?.select();
  };

  if (focusRequest) {
    // Resolve synchronously during render via microtask.
    queueMicrotask(() => {
      if (focusRequest.kind === "option-last") focusOptionByIndex(state.options.length - 1);
      else if (focusRequest.kind === "factor-last") focusFactorByIndex(state.factors.length - 1);
      else if (focusRequest.kind === "option-at") focusOptionByIndex(focusRequest.index);
      else if (focusRequest.kind === "factor-at") focusFactorByIndex(focusRequest.index);
      clearFocusRequest();
    });
  }

  const canAddOption = state.options.length < MAX_OPTIONS;
  const canAddFactor = state.factors.length < MAX_FACTORS;

  function handleAddOption() {
    dispatch({ type: "addOption" });
  }
  function handleAddFactor() {
    dispatch({ type: "addFactor" });
  }

  function handleDeleteOption(index: number, id: string) {
    dispatch({ type: "deleteOption", id });
    optionRefs.current.delete(id);
    // Focus the previous option's name, or the Add Option button if first.
    // Deferred to after state update — focus request handled on next render.
    queueMicrotask(() => {
      const prev = Math.max(0, index - 1);
      const stillExists = state.options[prev];
      if (stillExists) {
        const el = optionRefs.current.get(stillExists.id);
        el?.focus();
      }
    });
  }
  function handleDeleteFactor(index: number, id: string) {
    dispatch({ type: "deleteFactor", id });
    factorRefs.current.delete(id);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Factor header row */}
        <div className="flex items-stretch gap-2 border-b border-ink/5 pb-2">
          <div
            data-sticky-col
            className="sticky left-0 z-[1] w-44 shrink-0 border-r border-ink/10 bg-[#FDFBF9] px-2 py-2 text-[11px] font-normal uppercase tracking-[0.08em] text-mute"
          >
            Options \ Factors
          </div>
          <div className="flex flex-1 items-stretch gap-1.5">
            {state.factors.map((f, i) => (
              <FactorHeader
                key={f.id}
                factor={f}
                index={i}
                canDelete={state.factors.length > 1}
                needsConfirm={factorHasData(state, f.id)}
                armedId={armedDeleteId}
                setArmedId={setArmedDeleteId}
                onRename={(name) => dispatch({ type: "renameFactor", id: f.id, name })}
                onSetWeight={(weight) => dispatch({ type: "setWeight", id: f.id, weight })}
                onDelete={() => handleDeleteFactor(i, f.id)}
                ref={(el: HTMLInputElement | null) => {
                  if (el) factorRefs.current.set(f.id, el);
                  else factorRefs.current.delete(f.id);
                }}
              />
            ))}
            {canAddFactor && (
              <button
                type="button"
                data-export-hide
                onClick={handleAddFactor}
                className="self-start rounded-full border border-dashed border-ink/20 px-3 py-1 text-xs text-mute hover:border-ink/40 hover:text-ink"
              >
                + factor
              </button>
            )}
          </div>
        </div>

        {/* Option rows */}
        <div className="mt-2 flex flex-col gap-2">
          {state.options.map((o, i) => (
            <OptionRow
              key={o.id}
              option={o}
              index={i}
              factors={state.factors}
              scale={state.scale}
              scores={state.scores[o.id] ?? {}}
              isWinner={winners.includes(o.id)}
              canDelete={state.options.length > 1}
              needsConfirm={optionHasData(state, o.id)}
              armedId={armedDeleteId}
              setArmedId={setArmedDeleteId}
              onRename={(name) => dispatch({ type: "renameOption", id: o.id, name })}
              onSetScore={(factorId, value: ScoreCell) =>
                dispatch({ type: "setScore", optionId: o.id, factorId, value })
              }
              onDelete={() => handleDeleteOption(i, o.id)}
              ref={(el: HTMLInputElement | null) => {
                if (el) optionRefs.current.set(o.id, el);
                else optionRefs.current.delete(o.id);
              }}
            />
          ))}
          {canAddOption && (
            <button
              type="button"
              data-export-hide
              onClick={handleAddOption}
              className="mt-1 self-start rounded-full border border-dashed border-ink/20 px-3 py-1 text-xs text-mute hover:border-ink/40 hover:text-ink"
            >
              + option
            </button>
          )}
        </div>

        {/* Totals + winner */}
        <TotalsRow options={state.options} scores={scores} winners={winners} />

        {incomplete && state.options.length >= 2 && state.factors.length >= 1 && (
          <p className="mt-3 px-2 text-xs text-mute">
            Some cells are empty — fill them in for a fairer comparison.
          </p>
        )}

        {(state.options.length < 2 || state.factors.length < 1) && (
          <p className="mt-3 px-2 text-xs text-mute">
            Add at least 2 options and 1 factor to see a winner.
          </p>
        )}
      </div>
    </div>
  );
}
