import clsx from "clsx";

// Custom starburst SVG — §5.3 "nice-to-have" winner accent.
export function StarburstIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={clsx("inline-block", className)}
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none">
        <line x1="8" y1="1" x2="8" y2="4" />
        <line x1="8" y1="12" x2="8" y2="15" />
        <line x1="1" y1="8" x2="4" y2="8" />
        <line x1="12" y1="8" x2="15" y2="8" />
        <line x1="3" y1="3" x2="5" y2="5" />
        <line x1="11" y1="11" x2="13" y2="13" />
        <line x1="13" y1="3" x2="11" y2="5" />
        <line x1="5" y1="11" x2="3" y2="13" />
      </g>
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  );
}
