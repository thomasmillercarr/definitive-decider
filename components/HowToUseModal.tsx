"use client";

import { useEffect, useState } from "react";

interface Props {
  onClose: () => void;
}

const SLIDES: { heading: string; body: string }[] = [
  {
    heading: "Welcome to The Definitive Decider",
    body: "Make decisions with confidence. Score your options against what actually matters.",
  },
  {
    heading: "Options",
    body: "Add the things you're choosing between (columns). Rename them freely.",
  },
  {
    heading: "Factors + Weights",
    body: "Add the criteria that matter (rows). Drag the weight slider to prioritise.",
  },
  {
    heading: "Scoring",
    body: "Click any cell and score 1–5 (or 1–10). Leave blank to exclude from calculation.",
  },
  {
    heading: "Winner",
    body: "The highest normalized score wins. Share or export your matrix.",
  },
];

export function HowToUseModal({ onClose }: Props) {
  const [slide, setSlide] = useState(0);
  const isFirst = slide === 0;
  const isLast = slide === SLIDES.length - 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to use The Definitive Decider"
      className="fixed inset-0 z-20 flex items-center justify-center bg-ink/20 p-4"
    >
      <div className="glass relative w-full max-w-sm space-y-4 p-6">
        {/* X close */}
        <button
          type="button"
          aria-label="Close guide"
          onClick={onClose}
          className="absolute right-4 top-4 text-mute transition-colors hover:text-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 4L4 12M4 4l8 8"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Slide content */}
        <div className="space-y-2 pr-6">
          <p className="text-xs font-medium uppercase tracking-wide text-mute">
            {slide + 1} / {SLIDES.length}
          </p>
          <h2 className="text-base font-semibold text-ink">
            {SLIDES[slide].heading}
          </h2>
          <p className="text-sm text-mute">{SLIDES[slide].body}</p>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSlide((s) => s - 1)}
            className={[
              "rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-sm transition-opacity",
              isFirst ? "pointer-events-none opacity-0" : "",
            ].join(" ")}
            aria-hidden={isFirst}
            tabIndex={isFirst ? -1 : 0}
          >
            ← Prev
          </button>

          <button
            type="button"
            onClick={isLast ? onClose : () => setSlide((s) => s + 1)}
            className="rounded-full bg-pill px-3 py-1.5 text-sm text-white"
          >
            {isLast ? "Let's go →" : "Next →"}
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5" aria-hidden="true">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={[
                "h-1.5 w-1.5 rounded-full transition-colors",
                i === slide ? "bg-ink" : "bg-mute/40",
              ].join(" ")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
