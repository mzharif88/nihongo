"use client";

import { useMemo, useState } from "react";
import { useHydrated } from "@/lib/saved-progress";
import { shuffle } from "@/lib/study/cards";

interface Q {
  prompt: string;
  promptIsKanji: boolean;
  options: string[];
  answer: number;
}

/** Two questions per kanji: meaning → which kanji, and kanji → which meaning, among the group only. */
function buildQuiz(cards: { term: string; meaning: string }[]): Q[] {
  const meaning = (m: string) => m.split(/[,;/]/)[0].trim();
  const qs: Q[] = [];
  for (const c of cards) {
    const kanji = shuffle(cards.map((x) => x.term));
    qs.push({ prompt: meaning(c.meaning), promptIsKanji: false, options: kanji, answer: kanji.indexOf(c.term) });
    const meanings = shuffle(cards.map((x) => meaning(x.meaning)));
    qs.push({ prompt: c.term, promptIsKanji: true, options: meanings, answer: meanings.indexOf(meaning(c.meaning)) });
  }
  return shuffle(qs);
}

export function CompareQuiz({ cards }: { cards: { term: string; meaning: string }[] }) {
  // Shuffled on the client only, so server and client render the same markup.
  const hydrated = useHydrated();
  if (!hydrated) return <section className="mt-8 h-64 rounded-xl border border-border bg-card" aria-hidden />;
  return <Quiz cards={cards} />;
}

function Quiz({ cards }: { cards: { term: string; meaning: string }[] }) {
  const [round, setRound] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `round` reshuffles on "Again".
  const questions = useMemo(() => buildQuiz(cards), [cards, round]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const done = index >= questions.length;
  const q = questions[index];

  function next() {
    setPicked(null);
    setIndex(index + 1);
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-4">
      <h2 className="font-bold">Tell them apart</h2>
      {done ? (
        <div className="mt-2 text-center">
          <p className="text-2xl font-bold">
            {right}/{questions.length}
          </p>
          <button
            onClick={() => {
              setRound(round + 1);
              setIndex(0);
              setRight(0);
            }}
            className="mt-3 rounded-lg bg-accent px-4 py-2 font-medium text-white"
          >
            Again
          </button>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            {index + 1}/{questions.length} · {q.promptIsKanji ? "What does this mean?" : "Which kanji means this?"}
          </p>
          <div className={`my-3 text-center font-bold ${q.promptIsKanji ? "text-6xl" : "text-xl"}`} lang={q.promptIsKanji ? "ja" : "en"}>
            {q.prompt}
          </div>
          <div className={`grid gap-2 ${q.promptIsKanji ? "" : "grid-cols-2"}`}>
            {q.options.map((o, i) => {
              const style =
                picked === null
                  ? "border-border"
                  : i === q.answer
                    ? "border-green-600 bg-green-50 dark:bg-green-950"
                    : i === picked
                      ? "border-red-600 bg-red-50 dark:bg-red-950"
                      : "border-border opacity-60";
              return (
                <button
                  key={i}
                  disabled={picked !== null}
                  onClick={() => {
                    setPicked(i);
                    if (i === q.answer) setRight(right + 1);
                  }}
                  className={`rounded-lg border-2 p-3 ${q.promptIsKanji ? "text-left" : "text-4xl"} ${style}`}
                  lang={q.promptIsKanji ? "en" : "ja"}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <button onClick={next} className="mt-3 w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
              Next
            </button>
          )}
        </>
      )}
    </section>
  );
}
