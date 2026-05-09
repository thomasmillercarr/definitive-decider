"use client";

import clsx from "clsx";
import type { Scale } from "@/lib/state";

type Props = {
  scale: Scale;
  onChange: (next: Scale) => void;
};

export function ScaleToggle({ scale, onChange }: Props) {
  const nextScale: Scale = scale === 5 ? 10 : 5;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={scale === 10}
      aria-label="Scoring scale: 1–5 / 1–10"
      onClick={() => onChange(nextScale)}
      className={clsx(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm",
        "border border-ink/10 bg-white/80",
      )}
    >
      <span className={clsx(scale === 5 ? "font-semibold text-ink" : "text-mute")}>
        1–5
      </span>
      <span className="text-mute">/</span>
      <span className={clsx(scale === 10 ? "font-semibold text-ink" : "text-mute")}>
        1–10
      </span>
    </button>
  );
}
