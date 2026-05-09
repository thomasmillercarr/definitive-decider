"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import type { ScoreCell as ScoreCellType } from "@/lib/state";

type Props = {
  value: ScoreCellType;
  scaleMax: number;
  onChange: (next: ScoreCellType) => void;
  ariaLabel: string;
};

// Uncontrolled input with imperative DOM sync. This lets us strip non-digit
// characters on the `input` event BEFORE they render — required to keep `e`,
// `-`, `.` from flashing briefly. A controlled input whose onChange rejects
// without setState leaves the DOM out-of-sync until the next render.
export function ScoreCell({ value, scaleMax, onChange, ariaLabel }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  // Sync DOM to external state (rescale, hydration, reset). Skip while focused
  // so the user's cursor isn't yanked mid-type.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    const formatted = value === null ? "" : String(value);
    if (el.value !== formatted) el.value = formatted;
  }, [value]);

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    const el = e.currentTarget;
    const digits = el.value.replace(/\D+/g, "");
    const parsed =
      digits === "" ? null : Math.min(scaleMax, parseInt(digits, 10));
    const formatted = parsed === null ? "" : String(parsed);
    if (el.value !== formatted) el.value = formatted;
    onChange(parsed);
  }

  const isNull = value === null;

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      defaultValue={value === null ? "" : String(value)}
      onInput={handleInput}
      className={clsx(
        "num h-10 w-12 rounded-cell text-center transition-colors",
        isNull
          ? "border-[1.5px] border-dashed border-[rgba(20,15,10,0.15)] bg-white/30 text-transparent hover:border-solid hover:border-ink/30 hover:bg-white/60"
          : "border border-transparent bg-white/70 text-ink",
      )}
    />
  );
}
