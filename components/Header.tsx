"use client";

import clsx from "clsx";
import type { Scale } from "@/lib/state";
import { ScaleToggle } from "./ScaleToggle";
import { ShareButton } from "./ShareButton";
import { ExportButton } from "./ExportButton";

type Props = {
  scale: Scale;
  onScaleChange: (next: Scale) => void;
  onReset: () => void;
  onShare: () => void;
  onExport: () => void;
  shareVariant: "orange" | "dark";
  exportEnabled: boolean;
  resetArmed: boolean;
};

export function Header({
  scale,
  onScaleChange,
  onReset,
  onShare,
  onExport,
  shareVariant,
  exportEnabled,
  resetArmed,
}: Props) {
  return (
    <header className="sticky top-0 z-10 -mx-6 mb-6 flex flex-wrap items-center justify-between gap-2 bg-bg/75 px-6 py-3 backdrop-blur">
      <h1 className="text-sm font-semibold tracking-tight">The Definitive Decider</h1>
      <div className="flex flex-wrap items-center gap-2">
        <ScaleToggle scale={scale} onChange={onScaleChange} />
        <ShareButton variant={shareVariant} onClick={onShare} />
        <ExportButton enabled={exportEnabled} onClick={onExport} />
        <button
          type="button"
          onClick={onReset}
          aria-label={resetArmed ? "Tap to confirm reset" : "Start over"}
          className={clsx(
            "rounded-full px-3 py-1.5 text-sm transition-colors",
            resetArmed
              ? "bg-orange text-ink"
              : "border border-ink/10 bg-white/80 text-ink",
          )}
        >
          {resetArmed ? "Tap to confirm" : "Start over"}
        </button>
      </div>
    </header>
  );
}
