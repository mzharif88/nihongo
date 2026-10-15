"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ruby } from "@/components/ruby";
import { useHydrated } from "@/lib/saved-progress";
import { shuffle, type StudyCard } from "@/lib/study/cards";
import { speak } from "@/app/study/speak";

type DrillCard = Pick<StudyCard, "key" | "question" | "prompt" | "promptReading" | "promptIsJapanese" | "options" | "reveal" | "itemType">;

/** Shuffled on the client so server and client markup match. */
export function Drill(props: { title: string; cards: DrillCard[]; round: number }) {
  const hydrated = useHydrated();
  if (!hydrated) return <main className="mx-auto min-h-dvh max-w-md px-4 py-4" aria-hidden />;
  return <Run {...props} />;
}

function Run({ title, cards, round }: { title: string; cards: DrillCard[]; round: number }) {
  const [source, setSource] = useState(cards);
  const [run, setRun] = useState(0);
  // The answer is always options[0] here; shuffle it in.
  const deck = useMemo(
    () => shuffle(source).slice(0, round).map((c) => ({ ...c, answer: c.options![0], options: shuffle(c.options!) })),
    // `run` reshuffles for another round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, round, run],
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [missed, setMissed] = useState<DrillCard[]>([]);
  const card = deck[index];

  function pick(option: string) {
    if (picked) return;
    setPicked(option);
    const ok = option === card.answer;
    if (!ok) setMissed((m) => [...m, card]);
    speak(card.itemType === "radical" && card.reveal.reading ? card.reveal.reading.split("・")[0] : card.reveal.term, card.reveal.audioUrl);
    // Straight on to the next card: a beat to see it was right, longer to see the answer when wrong.
    setTimeout(
      () => {
        setPicked(null);
        setIndex((i) => i + 1);
      },
      ok ? 450 : 1300,
    );
  }

  function again(from: DrillCard[]) {
    setSource(from);
    setRun((r) => r + 1);
    setIndex(0);
    setMissed([]);
  }

  if (!card) {
    const right = deck.length - missed.length;
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <p className="text-sm text-muted">{title}</p>
        <p className="mt-2 text-4xl font-bold">
          {right}/{deck.length}
        </p>
        {missed.length > 0 && (
          <p className="mt-3 text-2xl leading-loose" lang="ja">
            {missed.map((c) => (
              <span key={c.key} className="mx-1">
                <Ruby text={c.prompt} reading={c.promptReading} />
              </span>
            ))}
          </p>
        )}
        <div className="mt-6 space-y-2">
          {missed.length > 0 && (
            <button onClick={() => again(missed)} className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-white">
              Retry the {missed.length} I missed
            </button>
          )}
          <button onClick={() => again(cards)} className="w-full rounded-xl border border-border px-4 py-3 font-medium">
            New round
          </button>
          <Link href="/" className="block pt-2 text-sm text-muted underline">
            Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-4">
      <header className="flex items-center justify-between text-sm text-muted">
        <Link href="/" aria-label="Leave">
          ✕
        </Link>
        <span className="truncate">{title}</span>
        <span className="tabular-nums">
          {index + 1}/{deck.length}
        </span>
      </header>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent transition-all" style={{ width: `${(index / deck.length) * 100}%` }} />
      </div>
      <p className="mt-8 text-center text-sm text-muted">{card.question}</p>
      <div className={`my-6 text-center font-bold ${card.prompt.length > 3 ? "text-4xl leading-loose" : "text-7xl"}`} lang="ja">
        <Ruby text={card.prompt} reading={card.promptReading} />
      </div>
      <div className="grid gap-3">
        {card.options!.map((o) => {
          const style =
            picked === null
              ? "border-border bg-card active:border-accent"
              : o === card.answer
                ? "border-green-600 bg-green-50 dark:bg-green-950"
                : o === picked
                  ? "border-red-600 bg-red-50 dark:bg-red-950"
                  : "border-border bg-card opacity-60";
          return (
            <button key={o} onClick={() => pick(o)} disabled={picked !== null} className={`min-h-14 rounded-xl border-2 px-4 py-3 text-xl ${style}`}>
              <Ruby text={o} />
            </button>
          );
        })}
      </div>
    </main>
  );
}
