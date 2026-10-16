"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mastery } from "@/lib/newcomer/recall";
import { flushPending, pendingAnswers, savePending } from "@/lib/newcomer/pending";
import { say, stopSpeaking } from "@/lib/newcomer/voice";
import { recordRecall } from "../actions";
import { Japanese, MeaningToggle, PlayButton, ScriptToggle, useMeaningLang } from "../ui";

export interface RecallCard {
  key: string;
  meaning: string;
  /** Starter phrases carry a Malay meaning too. */
  meaningMs: string | null;
  jp: string;
  reading: string;
  kana: string;
  right: number;
  wrong: number;
}

/** Send one answer; offline (or failing while offline) it waits in the phone for later. */
async function send(key: string, correct: boolean) {
  const at = new Date().toISOString();
  try {
    if (!navigator.onLine) throw new Error("offline");
    await recordRecall({ key, correct, at });
  } catch {
    savePending([...pendingAnswers(), { key, correct, at }]);
  }
}

/** Replay saved answers; one the server rejects while online (a deleted phrase) is dropped, not retried forever. */
const flush = () =>
  flushPending(async (a) => {
    try {
      await recordRecall(a);
    } catch (e) {
      if (!navigator.onLine) throw e;
    }
  });

export function RecallClient({ title, topic, cards, extra, night }: { title: string; topic: string | null; cards: RecallCard[]; extra: boolean; night: boolean }) {
  const [queue, setQueue] = useState(cards);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const [lang] = useMeaningLang();

  useEffect(() => {
    void flush();
    window.addEventListener("online", flush);
    return () => {
      window.removeEventListener("online", flush);
      stopSpeaking();
    };
  }, []);

  const card = queue[index];
  const done = !card;

  const reveal = () => {
    if (revealed || !card) return;
    setRevealed(true);
    void say(card.jp, "ja");
  };

  const answer = (correct: boolean) => {
    if (!card || !revealed) return;
    stopSpeaking();
    void send(card.key, correct);
    if (correct) setRight((n) => n + 1);
    else setWrong((n) => n + 1);
    // A miss comes back once at the end of the session, the way a child hears it again.
    if (!correct && !retried.has(card.key)) {
      setQueue((q) => [...q, card]);
      setRetried((s) => new Set(s).add(card.key));
    }
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  if (cards.length === 0) {
    return (
      <div className="py-10 text-center">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-2 text-muted">Nothing to recall yet.</p>
        <Link href={topic ? `/newcomer/topics/${topic}` : "/newcomer/phrases"} className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-white">
          {topic ? "Back to the topic" : "Add your phrases"}
        </Link>
      </div>
    );
  }

  if (done) {
    const score = mastery(right, wrong);
    return (
      <div className="py-10 text-center">
        <div className="text-5xl font-bold">{score ?? 0}%</div>
        <p className="mt-2 text-muted">
          {right} correct · {wrong} wrong
        </p>
        <p className="mt-4 text-sm text-muted">
          {score !== null && score >= 80 ? "Strong. These come back later, when they're about to fade." : "The misses come back sooner. Play them in the playlist before bed."}
        </p>
        {pendingAnswers().length > 0 && <p className="mt-2 text-xs text-amber-600">Saved on this phone. They&apos;ll sync when you&apos;re back online.</p>}
        <div className="mt-6 flex justify-center gap-2">
          <Link href={`/newcomer/recall?${topic ? `topic=${topic}&` : ""}all=1`} className="rounded-lg border border-border px-4 py-2">
            Practise more
          </Link>
          <Link href={topic ? `/newcomer/topics/${topic}` : "/newcomer"} className="rounded-lg bg-accent px-4 py-2 text-white">
            Done
          </Link>
        </div>
      </div>
    );
  }

  const meaning = lang === "ms" && card.meaningMs ? card.meaningMs : card.meaning;
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span>
          {night ? "🌙 " : ""}
          {title} · {Math.min(index + 1, queue.length)}/{queue.length}
          {extra ? " · extra practice" : ""}
        </span>
        <span className="flex gap-2">
          {topic && <MeaningToggle />}
          <ScriptToggle />
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent" style={{ width: `${(100 * index) / queue.length}%` }} />
      </div>

      <button type="button" onClick={reveal} className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center">
        <div className="text-xs uppercase tracking-wide text-muted">Say it in Japanese, out loud</div>
        <div className="mt-3 text-2xl font-medium">{meaning}</div>
        {revealed ? (
          <div className="mt-8 border-t border-border pt-6">
            <Japanese kana={card.kana} jp={card.jp} reading={card.reading} className="text-2xl" />
          </div>
        ) : (
          <div className="mt-8 text-sm text-muted">Tap to check</div>
        )}
      </button>

      <div className="sticky bottom-0 mt-4 bg-background pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {revealed ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => answer(false)} className="flex-1 rounded-xl bg-red-600 py-4 text-lg font-semibold text-white">
              ✗ Wrong
            </button>
            <PlayButton text={card.jp} label="Play again" />
            <button type="button" onClick={() => answer(true)} className="flex-1 rounded-xl bg-green-600 py-4 text-lg font-semibold text-white">
              ✓ Correct
            </button>
          </div>
        ) : (
          <button type="button" onClick={reveal} className="w-full rounded-xl bg-accent py-4 text-lg font-semibold text-white">
            Show answer
          </button>
        )}
      </div>
    </div>
  );
}
