"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { KanjiScope } from "@/components/kanji-scope";
import { Ruby } from "@/components/ruby";
import { passed, passedLevels, type LevelQuiz } from "@/lib/placement/placement";
import { applyPlacement } from "./actions";

interface Result {
  level: string;
  correct: number;
  total: number;
}

const DONT_KNOW = -1;

export function PlacementQuiz({ quizzes }: { quizzes: LevelQuiz[] }) {
  const [level, setLevel] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [correctIds, setCorrectIds] = useState<string[]>([]);
  const [tally, setTally] = useState(0);
  const [finished, setFinished] = useState(false);

  if (finished) return <Summary quizzes={quizzes} results={results} correctIds={correctIds} />;

  const quiz = quizzes[level];
  const card = quiz.cards[index];

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const right = i === card.answerIndex;
    const nextTally = tally + (right ? 1 : 0);
    if (right) setCorrectIds((ids) => [...ids, card.itemId]);
    setTimeout(() => {
      setPicked(null);
      if (index + 1 < quiz.cards.length) {
        setTally(nextTally);
        setIndex(index + 1);
        return;
      }
      const result = { level: quiz.level, correct: nextTally, total: quiz.cards.length };
      setResults((r) => [...r, result]);
      setTally(0);
      setIndex(0);
      if (passed(result.correct, result.total) && level + 1 < quizzes.length) setLevel(level + 1);
      else setFinished(true);
    }, right ? 500 : 1200);
  }

  // Each word as its level's exam prints it.
  return (
    <KanjiScope level={quiz.level}>
    <section className="mt-6">
      <div className="flex justify-between text-sm text-muted">
        <span className="font-medium">{quiz.level}</span>
        <span className="tabular-nums">
          {index + 1}/{quiz.cards.length}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent" style={{ width: `${(index / quiz.cards.length) * 100}%` }} />
      </div>
      <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center">
        <div className="text-sm text-muted">{card.question}</div>
        <div className="mt-3 text-4xl leading-loose" lang="ja">
          <Ruby text={card.prompt} reading={card.promptReading} />
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {card.options!.map((o, i) => {
          const state =
            picked === null ? "" : i === card.answerIndex ? "border-green-600 bg-green-50 dark:bg-green-950" : i === picked ? "border-red-600 bg-red-50 dark:bg-red-950" : "opacity-60";
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={picked !== null}
              className={`rounded-lg border border-border bg-card p-3 text-left ${state}`}
            >
              <Ruby text={o} />
            </button>
          );
        })}
        <button
          onClick={() => choose(DONT_KNOW)}
          disabled={picked !== null}
          className={`rounded-lg border border-dashed border-border p-3 text-sm text-muted ${picked === DONT_KNOW ? "border-red-600" : ""}`}
        >
          I don&apos;t know
        </button>
      </div>
    </section>
    </KanjiScope>
  );
}

function Summary({ quizzes, results, correctIds }: { quizzes: LevelQuiz[]; results: Result[]; correctIds: string[] }) {
  const levels = passedLevels(results);
  const bulk = quizzes.filter((q) => levels.includes(q.level)).reduce((n, q) => n + q.unstarted, 0);
  const tested = correctIds.length;
  // Correct answers at passed levels are already in the bulk count.
  const total = bulk + results.filter((r) => !(levels as string[]).includes(r.level)).reduce((n, r) => n + r.correct, 0);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = (all: boolean) =>
    start(async () => {
      try {
        const { marked } = await applyPlacement({ correctIds, levels: all ? levels : [] });
        setSaved(marked);
      } catch (e) {
        setError((e as Error).message);
      }
    });

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-xl border-2 border-accent bg-card p-4">
        <div className="text-sm text-muted">Your level</div>
        <div className="text-2xl font-bold">{levels.length ? `${levels[levels.length - 1]} passed` : "Start from N5"}</div>
        <ul className="mt-3 space-y-1 text-sm">
          {results.map((r) => (
            <li key={r.level} className="flex justify-between">
              <span>{r.level}</span>
              <span className="tabular-nums">
                {r.correct}/{r.total} {passed(r.correct, r.total) ? "· passed" : "· not yet"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {saved !== null ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-medium">{saved} words marked as known.</p>
          <p className="mt-1 text-sm text-muted">They come back as reviews over the coming weeks to check. Miss one and it&apos;s taught again.</p>
          <Link href="/course" className="mt-3 block rounded-lg bg-accent px-4 py-2 text-center font-medium text-white">
            Go to your course
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {levels.length > 0 && (
            <button
              onClick={() => save(true)}
              disabled={pending}
              className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-60"
            >
              Mark {total} words as known
              <span className="block text-xs font-normal opacity-90">
                Every unstarted word in {levels.join(", ")}, plus the ones you got right
              </span>
            </button>
          )}
          {tested > 0 && (
            <button
              onClick={() => save(false)}
              disabled={pending}
              className="w-full rounded-lg border border-border px-4 py-3 font-medium disabled:opacity-60"
            >
              Only the {tested} I got right
            </button>
          )}
          <Link href="/course" className="block text-center text-sm text-muted underline">
            Skip: change nothing
          </Link>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </section>
  );
}
