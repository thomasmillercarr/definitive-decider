import { ImageResponse } from "@vercel/og";
import { decode } from "@/lib/encode";
import { findWinners, scoreAll } from "@/lib/score";
import { optionPlaceholder } from "@/lib/state";

// §6.5 — 1200×630 dynamic preview served at /api/og?m=<encoded>.
// Runs on the Vercel Edge so image generation scales without a Node cold start.
// Only invoked when a link is unfurled (Slack/Twitter/iMessage), not on
// normal page loads.
export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;

const BG = "#FAF7F2";
const INK = "#1A1A1A";
const MUTE = "#6B6B68";
const ORANGE = "#F97316";
const ORANGE_WASH = "rgba(249, 115, 22, 0.12)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const m = searchParams.get("m");

  // No payload: render the brand/wordmark card (default unfurl for /).
  if (!m) return brandCard();

  const decoded = decode(m);
  if (!decoded.ok) return brandCard();

  const state = decoded.value;
  const winners = findWinners(state);
  const scored = scoreAll(state);
  const title = state.title.trim() || "The Definitive Decider";

  // Primary winner line: name + normalized percentage. Tie → "Tied for top".
  let winnerLine: string | null = null;
  if (winners.length > 0) {
    const first = winners[0];
    const idx = state.options.findIndex((o) => o.id === first);
    const opt = idx >= 0 ? state.options[idx] : null;
    const displayName =
      opt && opt.name.trim() !== "" ? opt.name : optionPlaceholder(idx);
    const s = scored.find((x) => x.optionId === first);
    const pct =
      s && s.normalized != null
        ? `${Math.round(s.normalized * 100)}%`
        : "";
    if (winners.length > 1) {
      winnerLine = `${winners.length} options tied for top pick${pct ? ` · ${pct}` : ""}`;
    } else {
      winnerLine = `${displayName}${pct ? ` · ${pct}` : ""}`;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: "72px 80px",
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          color: INK,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 24,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: MUTE,
            }}
          >
            The Definitive Decider
          </div>
          <div
            style={{
              fontSize: 72,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontWeight: 500,
              maxWidth: 1040,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {winnerLine ? (
            <div
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                alignItems: "center",
                gap: 16,
                padding: "20px 28px",
                borderRadius: 999,
                background: ORANGE_WASH,
                color: ORANGE,
                fontSize: 44,
                fontWeight: 600,
                maxWidth: 1040,
              }}
            >
              <span style={{ display: "flex" }}>
                <Starburst />
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 900,
                }}
              >
                {winnerLine}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 28, color: MUTE }}>
              Weighted scoring matrix
            </div>
          )}
          <div style={{ fontSize: 24, color: MUTE }}>
            Decide with weights, not vibes. Escape the Matrix.
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}

function brandCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          background: BG,
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
          color: INK,
        }}
      >
        <div style={{ display: "flex", color: ORANGE }}>
          <Starburst size={96} />
        </div>
        <div
          style={{
            fontSize: 80,
            letterSpacing: "-0.02em",
            fontWeight: 500,
          }}
        >
          The Definitive Decider
        </div>
        <div style={{ fontSize: 28, color: MUTE }}>
          Decide with weights, not vibes. Escape the Matrix.
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}

function Starburst({ size = 48 }: { size?: number }) {
  // Inline SVG sun — matches the in-app winner icon (§5.3).
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
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
