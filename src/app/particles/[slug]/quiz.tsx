"use client";

import { useMemo, useState } from "react";
import { Ruby } from "@/components/ruby";
import { stripMarkup } from "@/lib/furigana";
import { bestKey, type ParticleCard } from "@/lib/particles/particles";
import { readSaved, useHydrated, writeSaved } from "@/lib/saved-progress";
import { shuffle } from "@/lib/study/cards";
import { speak } from "@/app/study/speak";

/** Fill-in-the-particle cards; shuffled on the client so server and client markup match. */
export function ParticleQuiz(props: { slug: string; cards: ParticleCard[]; limit?: number }) {
  const hydrated = useHydrated();
  if (!hydrated) return <section className="mt-6 h-72 rounded-xl border border-border bg-card" aria-hidden />;
  return <Quiz {...props} />;
}

function Quiz({ slug, cards, limit }: { slug: string; cards: ParticleCard[]; limit?: number }) {
  const [round, setRound] = useState(0);
  const deck = useMemo(
    () => shuffle(cards).slice(0, limit ?? cards.length).map((c) => ({ ...c, options: shuffle(c.options) })),
    // `round` reshuffles on "Again".
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, limit, round],
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [missed, setMissed] = useState<ParticleCard[]>([]);
  const done = index >= deck.length;
  const card = deck[index];

  function pick(option: string) {
    if (picked) return;
    setPicked(option);
    const ok = option === card.answer;
    if (ok) setRight((r) => r + 1);
    else setMissed((m) => [...m, card]);
    speak(stripMarkup(card.before + card.answer + card.after));
  }

  function next() {
    setPicked(null);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex >= deck.length) {
      const best = readSaved<{ right: number; total: number }>(bestKey(slug));
      if (!best || right / deck.length >= best.right / best.total) writeSaved(bestKey(slug), { right, total: deck.length });
    }
  }

  if (done) {
    return (
      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <p className="text-center text-3xl font-bold">
          {right}/{deck.length}
        </p>
        {missed.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium">Review these</h3>
            <ul className="mt-2 space-y-2">
              {missed.map((c, i) => (
                <li key={i} className="text-sm">
                  <span className="text-lg leading-loose" lang="ja">
                    <Ruby text={c.before} />
                    <b className="text-accent">{c.answer}</b>
                    <Ruby text={c.after} />
                  </span>
                  <div className="text-muted">{c.why}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={() => {
            setRound(round + 1);
            setIndex(0);
            setRight(0);
            setMissed([]);
          }}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white"
        >
          Again
        </button>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="flex justify-between text-sm text-muted">
        <span>Which particle?</span>
        <span className="tabular-nums">
          {index + 1}/{deck.length}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent" style={{ width: `${(index / deck.length) * 100}%` }} />
      </div>
      <div className="mt-4 rounded-xl border border-border bg-card p-5 text-center">
        <p className="text-2xl leading-loose" lang="ja">
          <Ruby text={card.before} />
          {picked ? (
            <b className={picked === card.answer ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{card.answer}</b>
          ) : (
            <span className="mx-1 inline-block min-w-10 border-b-2 border-accent">&nbsp;</span>
          )}
          <Ruby text={card.after} />
        </p>
        <p className="mt-1 text-sm text-muted">{card.en}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {card.options.map((o) => {
          const style =
            picked === null
              ? "border-border bg-card active:border-accent"
              : o === card.answer
                ? "border-green-600 bg-green-50 dark:bg-green-950"
                : o === picked
                  ? "border-red-600 bg-red-50 dark:bg-red-950"
                  : "border-border bg-card opacity-60";
          return (
            <button key={o} onClick={() => pick(o)} disabled={picked !== null} className={`rounded-xl border-2 p-3 text-3xl ${style}`} lang="ja">
              {o}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="mt-3">
          <p className="text-sm">
            {picked === card.answer ? "✓ " : "✗ "}
            {card.why}
          </p>
          <button onClick={next} className="mt-3 w-full rounded-xl bg-accent px-4 py-3 text-lg font-medium text-white">
            {index + 1 < deck.length ? "Next" : "Finish"}
          </button>
        </div>
      )}
    </section>
  );
}
