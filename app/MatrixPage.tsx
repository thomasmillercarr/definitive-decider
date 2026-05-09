"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import { decode, encode } from "@/lib/encode";
import { defaultMatrix, isDirty, reducer, type Scale } from "@/lib/state";
import { isShareable } from "@/lib/score";
import { slugify } from "@/lib/slug";
import { Header } from "@/components/Header";
import { TitleField } from "@/components/TitleField";
import { Matrix, type FocusRequest } from "@/components/Matrix";
import { Toast, type ToastMessage } from "@/components/Toast";
import { HowToUseModal } from "@/components/HowToUseModal";

// §4.9: URL only updates on Share. If the user lands on ?m=abc, edits for
// ten minutes, then refreshes, they return to the original shared state —
// not blank. Do not "fix" this by syncing edits to the URL. The hydration
// effect is guarded by the `hydrated` flag so query-param changes during
// the session can't re-hydrate and stomp live edits.

export default function MatrixPage() {
  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(reducer, undefined, defaultMatrix);
  const [hydrated, setHydrated] = useState(false);

  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const clearFocusRequest = useCallback(() => setFocusRequest(null), []);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [shareFallback, setShareFallback] = useState<string | null>(null);
  const toastIdRef = useRef(0);
  const showToast = useCallback((text: string) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, text });
  }, []);

  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const [showGuide, setShowGuide] = useState(false);
  useEffect(() => {
    if (!sessionStorage.getItem("guide-seen")) {
      setShowGuide(true);
      sessionStorage.setItem("guide-seen", "1");
    }
  }, []);

  // Hydrate once from ?m=…
  useEffect(() => {
    if (hydrated) return;
    const m = searchParams?.get("m");
    if (!m) {
      setHydrated(true);
      return;
    }
    const result = decode(m);
    if (result.ok) {
      dispatch({ type: "hydrate", state: result.value });
    } else {
      showToast("Couldn’t load that link — starting fresh.");
    }
    setHydrated(true);
  }, [searchParams, hydrated, showToast]);

  // Dismiss armed delete on Escape or click-outside (§5.4).
  useEffect(() => {
    if (!armedDeleteId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setArmedDeleteId(null);
    }
    function onPointer(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.(`[data-delete-button="${armedDeleteId}"]`)) return;
      setArmedDeleteId(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [armedDeleteId]);

  // Auto-disarm the reset button after 3 s.
  useEffect(() => {
    if (!resetArmed) return;
    resetTimerRef.current = setTimeout(() => setResetArmed(false), 3000);
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [resetArmed]);

  // Actions ————————————————————————————————————————————————

  function handleScaleChange(next: Scale) {
    if (next === state.scale) return;
    // Only show the rescale notice when there's something to rescale (§4.5).
    let hadScores = false;
    for (const o of state.options) {
      const row = state.scores[o.id] ?? {};
      for (const f of state.factors) {
        if (row[f.id] !== null && row[f.id] !== undefined) {
          hadScores = true;
          break;
        }
      }
      if (hadScores) break;
    }
    dispatch({ type: "setScale", scale: next });
    if (hadScores) showToast("Scores rescaled for the new range.");
  }

  function handleReset() {
    if (!isDirty(state)) {
      dispatch({ type: "reset" });
      return;
    }
    if (resetArmed) {
      setResetArmed(false);
      dispatch({ type: "reset" });
      return;
    }
    setResetArmed(true);
  }

  async function handleShare() {
    // Build shareable URL against the current browser origin. The ?m= param
    // holds compressed state; we do NOT push to history (§4.9) — the user's
    // address bar keeps /, only the copied URL carries state.
    const encoded = encode(state);
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/?m=${encoded}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showToast("Link copied.");
        return;
      }
      throw new Error("no clipboard");
    } catch {
      // Fallback for browsers that block the Clipboard API (§4.9): surface
      // the URL in an inline popover so the user can select-and-copy.
      setShareFallback(url);
    }
  }

  async function handleExport() {
    const node = exportRef.current;
    if (!node) return;
    // Hide editing UI during capture (§4.11). data-export-hide is applied to
    // delete buttons and add-row/column buttons.
    setExporting(true);
    try {
      // Defer to next frame so the DOM reflects `exporting` before capture.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const dataUrl = await toPng(node, {
        backgroundColor: "#FAF7F2",
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${slugify(state.title)}.png`;
      a.click();
      showToast("Image downloaded.");
    } catch {
      showToast("Export failed.");
    } finally {
      setExporting(false);
    }
  }

  // Focus newly-added option/factor names (§5.4 keyboard operability).
  const prevOptionCount = useRef(state.options.length);
  const prevFactorCount = useRef(state.factors.length);
  useEffect(() => {
    if (state.options.length > prevOptionCount.current) {
      setFocusRequest({ kind: "option-last" });
    }
    prevOptionCount.current = state.options.length;
  }, [state.options.length]);
  useEffect(() => {
    if (state.factors.length > prevFactorCount.current) {
      setFocusRequest({ kind: "factor-last" });
    }
    prevFactorCount.current = state.factors.length;
  }, [state.factors.length]);

  const shareVariant = isShareable(state) ? "orange" : "dark";
  const exportEnabled = state.options.length >= 1 && state.factors.length >= 1;

  return (
    <main
      className="min-h-screen px-6 py-6"
      data-exporting={exporting ? "true" : undefined}
    >
      <div className="mx-auto max-w-[1080px]">
        <Header
          scale={state.scale}
          onScaleChange={handleScaleChange}
          onReset={handleReset}
          onShare={handleShare}
          onExport={handleExport}
          shareVariant={shareVariant}
          exportEnabled={exportEnabled}
          resetArmed={resetArmed}
        />

        <TitleField
          title={state.title}
          onChange={(t) => dispatch({ type: "setTitle", title: t })}
        />

        <section className="glass p-6 sm:p-8" ref={exportRef}>
          <Matrix
            state={state}
            dispatch={dispatch}
            armedDeleteId={armedDeleteId}
            setArmedDeleteId={setArmedDeleteId}
            focusRequest={focusRequest}
            clearFocusRequest={clearFocusRequest}
          />
        </section>

        <footer className="mt-8 text-center text-xs text-mute">
          Your data never leaves your browser. Shared links contain your matrix.
        </footer>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {shareFallback && (
        <ShareFallbackDialog
          url={shareFallback}
          onClose={() => setShareFallback(null)}
        />
      )}

      {showGuide && <HowToUseModal onClose={() => setShowGuide(false)} />}
    </main>
  );
}

function ShareFallbackDialog({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, []);
  // Escape closes the dialog — keyboard dismiss per §5.4 operability.
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
      aria-label="Copy share link"
      className="fixed inset-0 z-20 flex items-center justify-center bg-ink/20 p-4"
    >
      <div className="glass w-full max-w-md space-y-3 p-4">
        <p className="text-sm" id="share-fallback-desc">
          Copy this link to share your matrix:
        </p>
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label="Share link"
          aria-describedby="share-fallback-desc"
          className="w-full rounded-cell border border-ink/10 bg-white/70 px-3 py-2 text-xs"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.select()}
            className="rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-sm"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-pill px-3 py-1.5 text-sm text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
