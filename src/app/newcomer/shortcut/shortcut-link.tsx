"use client";

import { useState, useTransition } from "react";
import { feedToken, resetFeedToken } from "../actions";

export function ShortcutLink({ origin, initial }: { origin: string; initial: string | null }) {
  const [token, setToken] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const link = token ? `${origin}/api/newcomer/feed?token=${token}&part=jp` : null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      {link ? (
        <>
          <div className="break-all rounded-lg bg-background p-2 font-mono text-xs">{link}</div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
              className="flex-1 rounded-lg bg-accent py-2 text-sm text-white"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => (setToken(await resetFeedToken()), setCopied(false)))}
              className="rounded-lg border border-border px-3 text-sm"
            >
              Reset link
            </button>
          </div>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={() => start(async () => setToken(await feedToken()))} className="w-full rounded-lg bg-accent py-2 text-white">
          Make my private link
        </button>
      )}
    </div>
  );
}
