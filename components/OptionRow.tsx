"use client";

import { forwardRef } from "react";
import clsx from "clsx";
import type { Factor, Matrix, Option, ScoreCell as ScoreCellType } from "@/lib/state";
import { MAX_NAME_LEN, optionPlaceholder } from "@/lib/state";
import { DeleteButton } from "./DeleteButton";
import { ScoreCell } from "./ScoreCell";

type Props = {
  option: Option;
  index: number;
  factors: Factor[];
  scale: Matrix["scale"];
  scores: Record<string, ScoreCellType>;
  isWinner: boolean;
  canDelete: boolean;
  needsConfirm: boolean;
  armedId: string | null;
  setArmedId: (id: string | null) => void;
  onRename: (name: string) => void;
  onSetScore: (factorId: string, value: ScoreCellType) => void;
  onDelete: () => void;
};

export const OptionRow = forwardRef<HTMLInputElement, Props>(function OptionRow(
  {
    option,
    index,
    factors,
    scale,
    scores,
    isWinner,
    canDelete,
    needsConfirm,
    armedId,
    setArmedId,
    onRename,
    onSetScore,
    onDelete,
  },
  nameRef,
) {
  const placeholder = optionPlaceholder(index);
  const deleteId = `option-${option.id}`;

  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-xl px-2 py-2",
        isWinner && "bg-orange-wash",
      )}
    >
      <div
        data-sticky-col
        className={clsx(
          "sticky left-0 z-[1] flex w-44 items-center gap-1 border-r border-ink/10 pr-2",
          isWinner ? "bg-[#FAE7D8]" : "bg-[#FDFBF9]",
        )}
      >
        <input
          ref={nameRef}
          type="text"
          value={option.name}
          onChange={(e) => onRename(e.target.value)}
          placeholder={placeholder}
          maxLength={MAX_NAME_LEN}
          aria-label={`Option ${index + 1} name`}
          className="w-full bg-transparent text-sm outline-none placeholder:text-mute"
        />
        {canDelete && (
          <DeleteButton
            id={deleteId}
            label={option.name || placeholder}
            needsConfirm={needsConfirm}
            armedId={armedId}
            setArmedId={setArmedId}
            onDelete={onDelete}
          />
        )}
      </div>
      <div className="flex flex-1 items-center gap-1.5">
        {factors.map((f) => (
          <ScoreCell
            key={f.id}
            value={scores[f.id] ?? null}
            scaleMax={scale}
            ariaLabel={`Score for ${option.name || placeholder} on ${f.name || `Factor ${factors.indexOf(f) + 1}`}`}
            onChange={(v) => onSetScore(f.id, v)}
          />
        ))}
      </div>
    </div>
  );
});
