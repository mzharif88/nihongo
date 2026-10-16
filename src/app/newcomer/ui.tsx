"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Ruby } from "@/components/ruby";
import { say, storedGet, storedSet } from "@/lib/newcomer/voice";

// Shared pieces of the Newcomer pages: how Japanese is shown (kana first,
// or kanji with furigana), the play button and the mastery bar.

const SCRIPT_KEY = "nc-script";
const MEANING_KEY = "nc-meaning";
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => (listeners.add(fn), () => void listeners.delete(fn));

function usePref<T extends string>(key: string, fallback: T, allowed: readonly T[]): [T, (v: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const v = storedGet(key) as T | null;
      return v && allowed.includes(v) ? v : fallback;
    },
    () => fallback,
  );
  return [
    value,
    (v: T) => {
      storedSet(key, v);
      listeners.forEach((fn) => fn());
    },
  ];
}

/** "kana": the whole phrase in kana (the default). "kanji": kanji with furigana. */
export const useScript = () => usePref(SCRIPT_KEY, "kana", ["kana", "kanji"] as const);
/** Which meaning the starter library shows: English or Malay. */
export const useMeaningLang = () => usePref(MEANING_KEY, "en", ["en", "ms"] as const);

export function Japanese({ kana, jp, reading, className = "" }: { kana: string; jp: string; reading: string; className?: string }) {
  const [script] = useScript();
  return (
    <span lang="ja" className={`leading-loose ${className}`}>
      {script === "kana" ? kana : <Ruby text={jp} reading={reading} keepKanji />}
    </span>
  );
}

export function ScriptToggle() {
  const [script, setScript] = useScript();
  return (
    <button
      type="button"
      onClick={() => setScript(script === "kana" ? "kanji" : "kana")}
      className="rounded-full border border-border px-3 py-1 text-xs text-muted"
      aria-label="Switch between kana and kanji with furigana"
    >
      {script === "kana" ? "かな" : "漢字"}
    </button>
  );
}

export function MeaningToggle() {
  const [lang, setLang] = useMeaningLang();
  return (
    <button type="button" onClick={() => setLang(lang === "en" ? "ms" : "en")} className="rounded-full border border-border px-3 py-1 text-xs text-muted">
      {lang === "en" ? "English" : "Melayu"}
    </button>
  );
}

export function PlayButton({ text, label = "Play" }: { text: string; label?: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async (e) => {
        e.stopPropagation();
        setPlaying(true);
        await say(text, "ja");
        setPlaying(false);
      }}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${playing ? "border-accent text-accent" : "border-border"}`}
    >
      ▶
    </button>
  );
}

/** Share of answers right; grey until the first answer. */
export function MasteryBar({ score }: { score: number | null }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        {score !== null && <div className={`h-full ${score >= 80 ? "bg-green-600" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.max(score, 4)}%` }} />}
      </div>
      <span className="w-9 text-right">{score === null ? "new" : `${score}%`}</span>
    </div>
  );
}

const TABS = [
  { href: "/newcomer", label: "Home" },
  { href: "/newcomer/phrases", label: "My phrases" },
  { href: "/newcomer/recall", label: "Recall" },
  { href: "/newcomer/playlist", label: "Playlist" },
];

export function NewcomerNav() {
  const path = usePathname();
  return (
    <nav className="sticky top-0 z-10 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-border bg-background px-4 py-2 text-sm">
      {TABS.map((t) => {
        const active = t.href === "/newcomer" ? path === t.href : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`shrink-0 rounded-full px-3 py-1 ${active ? "bg-accent text-white" : "text-muted"}`}>
            {t.label}
          </Link>
        );
      })}
      <Link href="/" className="ml-auto shrink-0 px-2 py-1 text-muted underline">
        Exit
      </Link>
    </nav>
  );
}

/** Register the service worker that keeps Newcomer pages usable offline. */
export function OfflineReady() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
