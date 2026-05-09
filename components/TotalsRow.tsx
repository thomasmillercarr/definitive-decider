"use client";

import clsx from "clsx";
import type { OptionScore } from "@/lib/score";
import type { Matrix } from "@/lib/state";
import { optionPlaceholder } from "@/lib/state";
import { StarburstIcon } from "./StarburstIcon";

type Props = {
  options: Matrix["options"];
  scores: OptionScore[];
  winners: string[];
};

export function TotalsRow({ options, scores, winners }: Props) {
  if (options.length === 0) return null;
  const winnerSet = new Set(winners);
  const tied = winners.length > 1;

  return (
    <div className="mt-2 border-t border-ink/5 pt-3">
      <div className="mb-1 px-2 text-[11px] font-normal uppercase tracking-[0.08em] text-mute">Results</div>
      <div className="flex flex-col gap-1">
        {options.map((o, i) => {
          const s = scores.find((x) => x.optionId === o.id);
          const isWinner = winnerSet.has(o.id);
          const displayName = o.name || optionPlaceholder(i);
          const normalizedDisplay =
            s?.normalized == null
              ? "—"
              : `${Math.round(s.normalized * 100)}%`;
          return (
            <div
              key={o.id}
              className={clsx(
                "flex items-center justify-between rounded-xl px-3 py-2",
                isWinner ? "bg-orange-wash" : "",
              )}
            >
              <div className="flex items-center gap-2">
                {isWinner && <StarburstIcon className="text-orange" />}
                <span className="text-sm font-medium">{displayName}</span>
                {isWinner && (
                  <span className="rounded-full bg-orange px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
                    {tied ? "Tied for top pick" : "Top pick"}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-3 text-mute">
                <span className="num text-xs">
                  {s?.hasAnyScore ? `${s.total} / ${s.maxPossible}` : "not scored"}
                </span>
                <span
                  className={clsx(
                    "num text-base",
                    isWinner ? "font-semibold text-orange" : "text-ink",
                  )}
                >
                  {normalizedDisplay}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
