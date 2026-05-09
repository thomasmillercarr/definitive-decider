"use client";

type Props = {
  enabled: boolean;
  onClick: () => void;
};

// PDF export is v1.1 scope (§4.11), so this is a single button rather than a
// menu. Kept as ExportButton to leave room for a dropdown later without
// churning callers.
export function ExportButton({ enabled, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      aria-label="Export matrix as PNG"
      className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/80 px-3 py-1.5 text-sm disabled:opacity-40"
    >
      <DownloadIcon />
      Export
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
