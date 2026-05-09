import { Suspense } from "react";
import type { Metadata } from "next";
import MatrixPage from "./MatrixPage";
import { decode } from "@/lib/encode";
import { findWinners, scoreAll } from "@/lib/score";
import { optionPlaceholder } from "@/lib/state";

// Dynamic per-request metadata: when the URL has ?m=<encoded>, echo the
// decision title and winner into the <title> and OG preview so link unfurls
// are specific to the shared matrix (§4.10). The actual OG image is rendered
// by /api/og?m=<encoded> on the edge.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const m = typeof sp.m === "string" ? sp.m : undefined;
  const baseDescription =
    "Decide with weights, not vibes. A quick weighted-scoring tool for real decisions.";
  const ogImage = m ? `/api/og?m=${encodeURIComponent(m)}` : "/api/og";

  if (!m) {
    return {
      title: "The Definitive Decider",
      openGraph: { images: [{ url: ogImage, width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image", images: [ogImage] },
    };
  }

  const decoded = decode(m);
  if (!decoded.ok) {
    return {
      title: "The Definitive Decider",
      openGraph: { images: [{ url: ogImage, width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image", images: [ogImage] },
    };
  }
  const state = decoded.value;
  const title =
    state.title.trim() !== "" ? state.title : "The Definitive Decider";

  let winnerLine = "";
  const winners = findWinners(state);
  if (winners.length > 0) {
    const idx = state.options.findIndex((o) => o.id === winners[0]);
    const opt = idx >= 0 ? state.options[idx] : null;
    const name =
      opt && opt.name.trim() !== "" ? opt.name : optionPlaceholder(idx);
    const s = scoreAll(state).find((x) => x.optionId === winners[0]);
    const pct =
      s && s.normalized != null ? ` · ${Math.round(s.normalized * 100)}%` : "";
    winnerLine =
      winners.length > 1
        ? ` — ${winners.length} tied for top pick${pct}`
        : ` — ${name}${pct}`;
  }

  const description = `${title}${winnerLine} · ${baseDescription}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

// <Suspense> required: MatrixPage uses useSearchParams() to hydrate from ?m=,
// and without a boundary the App Router bails out of static rendering and
// warns at build.
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <MatrixPage />
    </Suspense>
  );
}
