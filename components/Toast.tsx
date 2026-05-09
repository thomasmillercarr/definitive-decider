"use client";

import { useEffect } from "react";

export type ToastMessage = {
  id: number;
  text: string;
  tone?: "default" | "orange";
};

type Props = {
  toast: ToastMessage | null;
  onDismiss: () => void;
};

export function Toast({ toast, onDismiss }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 2200);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-2xl bg-pill px-4 py-2 text-sm text-white shadow-pill"
    >
      {toast.text}
    </div>
  );
}
