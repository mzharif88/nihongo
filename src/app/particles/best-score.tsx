"use client";

import { bestKey } from "@/lib/particles/particles";
import { readSaved, useHydrated } from "@/lib/saved-progress";

/** The best score saved in this browser for a particle group, if any. */
export function BestScore({ slug }: { slug: string }) {
  const hydrated = useHydrated();
  const best = hydrated ? readSaved<{ right: number; total: number }>(bestKey(slug)) : null;
  if (!best) return null;
  const perfect = best.right === best.total;
  return (
    <span className={`text-xs tabular-nums ${perfect ? "text-green-700 dark:text-green-400" : "text-muted"}`}>
      {perfect ? "✓ " : "best "}
      {best.right}/{best.total}
    </span>
  );
}
