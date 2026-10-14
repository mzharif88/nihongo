"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExamText } from "@/components/exam-text";
import { Ruby } from "@/components/ruby";
import { stripMarkup } from "@/lib/furigana";
import type { QuestionRow } from "@/lib/mock/mock";
import type { TextRow } from "@/lib/reading/reading.server";
import { readSaved, useHydrated, writeSaved } from "@/lib/saved-progress";
import { speak } from "@/app/study/speak";
import { completeReading, type ReadingResult } from "../actions";

const FURIGANA_KEY = "reading:furigana";

/** Split a line of markup into sentences, keeping the 。 with each. */
function sentences(line: string): string[] {
  return line.match(/[^。！？]+[。！？]?/g) ?? [line];
}

export function Reader(props: { text: TextRow; questions: QuestionRow[] }) {
  const hydrated = useHydrated();
  return <ReaderView key={hydrated ? "client" : "server"} {...props} resume={hydrated} />;
}

function ReaderView({ text, questions, resume }: { text: TextRow; questions: QuestionRow[]; resume: boolean }) {
  const [furigana, setFurigana] = useState(() => !(resume && readSaved<string>(FURIGANA_KEY) === "off"));
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [result, setResult] = useState<ReadingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const allAnswered = answers.every((a) => a !== null);

  function toggleFurigana() {
    const next = !furigana;
    setFurigana(next);
    writeSaved(FURIGANA_KEY, next ? "on" : "off");
  }

  function finish() {
    startSaving(async () => {
      try {
        setResult(await completeReading(text.slug, answers));
        setError(null);
      } catch {
        setError("Couldn't save. Check your connection and try again.");
      }
    });
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <header className="flex items-center justify-between text-sm">
        <Link href="/reading" className="text-muted underline">
          ← Reading
        </Link>
        <button onClick={toggleFurigana} className="rounded-full border border-border px-3 py-1 text-muted">
          Furigana {furigana ? "on" : "off"}
        </button>
      </header>

      <h1 className="mt-4 text-2xl font-bold leading-loose" lang="ja">
        <Ruby text={text.title} hide={!furigana} />
      </h1>

      <article className="mt-3 space-y-4 rounded-xl border border-border bg-card p-4 text-xl leading-[2.4]" lang="ja">
        {text.body.split("\n").map((line, i) => (
          <p key={i}>
            {sentences(line).map((s, j) => (
              // A span, not a button, so sentences flow as one paragraph (buttons always break as blocks).
              <span
                key={j}
                role="button"
                tabIndex={0}
                onClick={() => speak(stripMarkup(s))}
                onKeyDown={(e) => e.key === "Enter" && speak(stripMarkup(s))}
                className="cursor-pointer active:text-accent"
              >
                <Ruby text={s} hide={!furigana} />
              </span>
            ))}
          </p>
        ))}
      </article>
      <p className="mt-2 text-center text-xs text-muted">Tap a sentence to hear it.</p>

      <section className="mt-8 space-y-6">
        <h2 className="text-lg font-bold">Questions</h2>
        {questions.map((q, i) => {
          const picked = answers[i];
          const answered = picked !== null;
          return (
            <div key={q.id}>
              <p className="text-lg font-medium leading-loose" lang="ja">
                <span className="mr-2 text-muted">{i + 1}.</span>
                <ExamText text={q.prompt} furigana={furigana} />
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
                      disabled={answered || !!result}
                      onClick={() => setAnswers((a) => a.map((x, k) => (k === i ? j : x)))}
                      className={`min-h-12 rounded-xl border-2 px-4 py-2 text-left text-lg leading-loose ${style}`}
                    >
                      <ExamText text={o} furigana={furigana} />
                    </button>
                  );
                })}
              </div>
              {answered && q.explanation && (
                <p className="mt-2 text-sm leading-loose" lang="ja">
                  {picked === q.answer ? "✓ " : "✗ "}
                  <ExamText text={q.explanation} furigana={furigana} />
                </p>
              )}
            </div>
          );
        })}
      </section>

      {result ? (
        <section className="mt-8 rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">
            {result.score}/{result.max}
          </p>
          <p className="text-muted">
            +{result.xpGained} XP · {result.streak}-day streak
          </p>
          <Link href="/reading" className="mt-4 block rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
            Next passage
          </Link>
        </section>
      ) : (
        <div className="action-bar mt-8">
          <button
            onClick={finish}
            disabled={!allAnswered || saving}
            className="w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : allAnswered ? "Finish" : `Answer all ${questions.length} questions`}
          </button>
          {error && <p className="mt-2 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </main>
  );
}
