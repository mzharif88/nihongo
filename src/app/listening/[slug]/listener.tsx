"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExamText } from "@/components/exam-text";
import { Ruby } from "@/components/ruby";
import { spokenScript, type QuestionRow } from "@/lib/mock/mock";
import type { TextRow } from "@/lib/reading/reading.server";
import { speak } from "@/app/study/speak";
import { completeReading, type ReadingResult } from "@/app/reading/actions";

/** One listening set, a question at a time: play, answer, then see the script with furigana. */
export function Listener({ text, questions }: { text: TextRow; questions: QuestionRow[] }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [plays, setPlays] = useState(0);
  const [result, setResult] = useState<ReadingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const q = questions[index];
  const picked = answers[index];
  const answered = picked !== null;
  const last = index === questions.length - 1;

  function play() {
    if (!q.passage) return;
    speak(spokenScript(q.passage));
    setPlays((n) => n + 1);
  }

  function next() {
    if (!last) {
      setIndex(index + 1);
      setPlays(0);
      return;
    }
    startSaving(async () => {
      try {
        setResult(await completeReading(text.slug, answers, "listening"));
        setError(null);
      } catch {
        setError("Couldn't save. Check your connection and try again.");
      }
    });
  }

  if (result) {
    return (
      <main className="mx-auto max-w-xl px-4 py-6">
        <section className="mt-8 rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-sm text-muted" lang="ja">
            <Ruby text={text.title} />
          </p>
          <p className="mt-2 text-3xl font-bold">
            {result.score}/{result.max}
          </p>
          <p className="text-muted">
            +{result.xpGained} XP · {result.streak}-day streak
          </p>
          <Link href="/listening" className="mt-4 block rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
            Next set
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <header className="flex items-center justify-between text-sm text-muted">
        <Link href="/listening" className="underline">
          ← Listening
        </Link>
        <span className="tabular-nums">
          {index + 1}/{questions.length}
        </span>
      </header>
      <h1 className="mt-3 text-lg font-bold leading-loose" lang="ja">
        <Ruby text={text.title} />
      </h1>
      {index === 0 && <p className="text-sm text-muted">{text.body}</p>}

      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-center">
        <button onClick={play} className="rounded-full bg-accent px-6 py-3 text-lg font-medium text-white">
          ▶ {plays ? "Play again" : "Play"}
        </button>
        <p className="mt-2 text-xs text-muted">{plays ? `Played ${plays}×. In the exam you hear it once.` : "Listen, then choose."}</p>
      </div>

      <p className="mt-4 text-lg font-medium leading-loose" lang="ja">
        <ExamText text={q.prompt} furigana />
      </p>
      <div className="mt-2 grid gap-2" lang="ja">
        {q.options.map((o, j) => {
          const style = !answered
            ? "border-border bg-card active:border-accent"
            : j === q.answer
              ? "border-green-600 bg-green-50 dark:bg-green-950"
              : j === picked
                ? "border-red-600 bg-red-50 dark:bg-red-950"
                : "border-border bg-card opacity-60";
          return (
            <button
              key={j}
              disabled={answered}
              onClick={() => setAnswers((a) => a.map((x, k) => (k === index ? j : x)))}
              className={`min-h-12 rounded-xl border-2 px-4 py-2 text-left text-lg leading-loose ${style}`}
            >
              <ExamText text={o} furigana />
            </button>
          );
        })}
      </div>

      {answered && (
        <section className="mt-4 space-y-3">
          {q.explanation && (
            <p className="text-sm leading-loose" lang="ja">
              {picked === q.answer ? "✓ " : "✗ "}
              <ExamText text={q.explanation} furigana />
            </p>
          )}
          {q.passage && (
            <div className="rounded-xl border border-border bg-card p-4 leading-loose" lang="ja">
              <div className="mb-1 text-xs text-muted">Script</div>
              {q.passage.split("\n").map((line, i) => (
                <p key={i}>
                  <ExamText text={line} furigana />
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="action-bar mt-6">
        <button
          onClick={next}
          disabled={!answered || saving}
          className="w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : last ? "Finish" : "Next"}
        </button>
        {error && <p className="mt-2 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </main>
  );
}
