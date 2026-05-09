"use client";

import { forwardRef } from "react";
import type { Factor } from "@/lib/state";
import { factorPlaceholder, MAX_NAME_LEN } from "@/lib/state";
import { DeleteButton } from "./DeleteButton";

type Props = {
  factor: Factor;
  index: number;
  canDelete: boolean;
  needsConfirm: boolean;
  armedId: string | null;
  setArmedId: (id: string | null) => void;
  onRename: (name: string) => void;
  onSetWeight: (weight: number) => void;
  onDelete: () => void;
};

export const FactorHeader = forwardRef<HTMLInputElement, Props>(
  function FactorHeader(
    {
      factor,
      index,
      canDelete,
      needsConfirm,
      armedId,
      setArmedId,
      onRename,
      onSetWeight,
      onDelete,
    },
    nameRef,
  ) {
    const placeholder = factorPlaceholder(index);
    const deleteId = `factor-${factor.id}`;

    return (
      <div className="flex min-w-[88px] flex-col gap-1 px-1 py-2">
        <div className="flex items-center gap-1">
          <input
            ref={nameRef}
            type="text"
            value={factor.name}
            onChange={(e) => onRename(e.target.value)}
            placeholder={placeholder}
            maxLength={MAX_NAME_LEN}
            aria-label={`Factor ${index + 1} name`}
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-mute"
          />
          {canDelete && (
            <DeleteButton
              id={deleteId}
              label={factor.name || placeholder}
              needsConfirm={needsConfirm}
              armedId={armedId}
              setArmedId={setArmedId}
              onDelete={onDelete}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={factor.weight}
            onChange={(e) => onSetWeight(Number(e.target.value))}
            aria-label={`Weight for ${factor.name || placeholder}`}
            className="export-hide-slider w-full accent-ink"
          />
          <span className="num w-6 text-right text-xs text-mute">
            {factor.weight}
          </span>
        </div>
      </div>
    );
  },
);
