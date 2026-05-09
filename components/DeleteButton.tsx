"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

type Props = {
  id: string;
  needsConfirm: boolean;
  label: string; // "Option A" / "factor 1" — for aria-label
  armedId: string | null;
  setArmedId: (id: string | null) => void;
  onDelete: () => void;
  className?: string;
};

// Two-step confirm per §4.2/§4.3/§5.4:
// - First click arms (button turns orange, label flips to "Confirm delete").
// - Second click within 3s confirms.
// - Click-outside, blur, or 3s timeout disarms.
// - Only one button armed at a time — arming another disarms the first.
export function DeleteButton({
  id,
  needsConfirm,
  label,
  armedId,
  setArmedId,
  onDelete,
  className,
}: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isArmed = armedId === id;

  useEffect(() => {
    if (!isArmed) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(() => setArmedId(null), 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isArmed, setArmedId]);

  function handleClick() {
    if (!needsConfirm) {
      onDelete();
      return;
    }
    if (isArmed) {
      setArmedId(null);
      onDelete();
      return;
    }
    setArmedId(id);
  }

  return (
    <button
      type="button"
      data-delete-button={id}
      data-export-hide
      aria-label={isArmed ? `Confirm delete ${label}` : `Delete ${label}`}
      onClick={handleClick}
      onBlur={() => {
        if (isArmed) setArmedId(null);
      }}
      className={clsx(
        "inline-flex items-center justify-center rounded-full transition-colors",
        isArmed
          ? "bg-orange px-3 py-1 text-xs font-medium text-ink"
          : "h-7 w-7 text-mute hover:text-ink",
        className,
      )}
    >
      {isArmed ? "Confirm delete" : "×"}
    </button>
  );
}
