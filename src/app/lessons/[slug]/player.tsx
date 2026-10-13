"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { LessonRow } from "@/lib/lessons/lessons";
import { speak } from "@/app/study/speak";
import { completeLesson, type LessonResult } from "../actions";

export interface LessonItem {
  slug: string;
  type: string;
  term: string;
  reading: string | null;
  romaji: string | null;
  meaning: string;
  mnemonic: string | null;
  examples: { jp: string; en: string; reading?: string }[];
  audio_url: string | null;
}

type Step = "intro" | "dialogue" | "words" | "grammar" | "notes" | "checks" | "done";

interface Props {
  lesson: LessonRow;
  words: LessonItem[];
  grammar: LessonItem | null;
  nextSlug: string | null;
}

export function LessonPlayer({ lesson, words, grammar, nextSlug }: Props) {
  const steps: Step[] = [
    "intro",
    ...(lesson.dialogue.length ? (["dialogue"] as const) : []),
    ...(words.length ? (["words"] as const) : []),
    ...(grammar ? (["grammar"] as const) : []),
    ...(lesson.notes ? (["notes"] as const) : []),
    "checks",
  ];
  const [stepIndex, setStepIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(true);
  const [checkIndex, setCheckIndex] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [result, setResult] = useState<LessonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const step: Step = result ? "done" : steps[stepIndex];
  const forward = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));

  function finish(allPicks: number[]) {
    startSaving(async () => {
      try {
        setResult(await completeLesson(lesson.id, allPicks));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
      }
    });
  }

  const check = lesson.checks[checkIndex];
  const picked = picks[checkIndex];
  const answered = picked !== undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <header className="flex items-center justify-between text-sm text-muted">
        <Link href="/lessons" className="underline">
          ✕ Lessons
        </Link>
        <span>
          {lesson.jlpt_level} · Lesson {lesson.position}
        </span>
      </header>
      <div className="mt-3 flex gap-1" aria-hidden>
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded ${i <= stepIndex || step === "done" ? "bg-accent" : "bg-border"}`}
          />
        ))}
      </div>

      <section className="mt-6 flex-1">
        {step === "intro" && (
          <div className="text-center">
            <h1 className="mt-10 text-3xl font-bold">{lesson.title}</h1>
            {lesson.situation && <p className="mt-3 text-lg text-muted">{lesson.situation}</p>}
            <p className="mt-8 text-sm text-muted">
              {lesson.dialogue.length} dialogue lines · {words.length} words
              {grammar ? ` · ${grammar.term}` : ""} · {lesson.checks.length} quick checks
            </p>
          </div>
        )}

        {step === "dialogue" && (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Dialogue</h2>
              <button className="text-sm text-muted underline" onClick={() => setShowEnglish((v) => !v)}>
                {showEnglish ? "Hide English" : "Show English"}
              </button>
            </div>
            <p className="mt-1 text-sm text-muted">Tap a line to hear it.</p>
            <ol className="mt-4 space-y-3">
              {lesson.dialogue.map((line, i) => (
                <li key={i}>
                  <button
                    className="w-full rounded-xl border border-border bg-card p-3 text-left hover:border-accent"
                    onClick={() => speak(line.jp, line.audio_url)}
                  >
                    <div className="text-xs text-muted">{line.speaker}</div>
                    <div className="text-lg">{line.jp}</div>
                    {line.reading && line.reading !== line.jp && (
                      <div className="text-sm text-muted">{line.reading}</div>
                    )}
                    {showEnglish && <div className="mt-1 text-sm">{line.en}</div>}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {step === "words" && (
          <div>
            <h2 className="text-xl font-bold">Words</h2>
            <p className="mt-1 text-sm text-muted">These join your reviews when you finish.</p>
            <ul className="mt-4 space-y-2">
              {words.map((w) => (
                <li key={w.slug}>
                  <button
                    className="flex w-full items-baseline justify-between gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-accent"
                    onClick={() => speak(w.reading ?? w.term, w.audio_url)}
                  >
                    <span>
                      <span className="text-lg">{w.term}</span>
                      {w.reading && w.reading !== w.term && (
                        <span className="ml-2 text-sm text-muted">{w.reading}</span>
                      )}
                    </span>
                    <span className="text-right text-sm">{w.meaning}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === "grammar" && grammar && (
          <div>
            <h2 className="text-xl font-bold">Grammar</h2>
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="text-2xl font-bold">{grammar.term}</div>
              <p className="mt-2">{grammar.meaning}</p>
              {grammar.mnemonic && <p className="mt-2 text-sm text-muted">{grammar.mnemonic}</p>}
              {grammar.examples.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {grammar.examples.map((ex, i) => (
                    <li key={i}>
                      <button className="text-left" onClick={() => speak(ex.jp)}>
                        <div className="text-lg">{ex.jp}</div>
                        <div className="text-sm text-muted">{ex.en}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {step === "notes" && (
          <div>
            <h2 className="text-xl font-bold">Notes</h2>
            <p className="mt-4 whitespace-pre-line rounded-xl border border-border bg-card p-4">{lesson.notes}</p>
          </div>
        )}

        {step === "checks" && check && (
          <div>
            <h2 className="text-xl font-bold">
              Quick check {checkIndex + 1} of {lesson.checks.length}
            </h2>
            <p className="mt-4 text-lg">{check.prompt}</p>
            <div className="mt-4 grid gap-2">
              {check.options.map((option, i) => {
                const tone = !answered
                  ? "border-border hover:border-accent"
                  : i === check.answer
                    ? "border-green-600 bg-green-600/10"
                    : i === picked
                      ? "border-red-600 bg-red-600/10"
                      : "border-border opacity-60";
                return (
                  <button
                    key={i}
                    disabled={answered}
                    className={`rounded-xl border bg-card p-3 text-left ${tone}`}
                    onClick={() => setPicks((p) => Object.assign([...p], { [checkIndex]: i }))}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {answered && (
              <p className="mt-4 text-sm">
                {picked === check.answer ? "✅ Right. " : "❌ Not quite. "}
                {check.explanation}
              </p>
            )}
          </div>
        )}

        {step === "checks" && !check && (
          <p className="mt-10 text-center text-muted">This lesson has no quick checks.</p>
        )}

        {step === "done" && result && (
          <div className="mt-10 text-center">
            <div className="text-5xl">🎉</div>
            <h2 className="mt-4 text-2xl font-bold">Lesson done</h2>
            <p className="mt-2 text-muted">
              {result.total > 0 && `${result.correct}/${result.total} checks right · `}+{result.xp} XP · streak{" "}
              {result.streak}
            </p>
            {result.cardsAdded > 0 && (
              <p className="mt-2 text-sm text-muted">{result.cardsAdded} new words added to your reviews.</p>
            )}
          </div>
        )}
      </section>

      {error && <p className="mb-3 text-center text-sm text-red-600">{error}</p>}

      <footer className="grid gap-2">
        {step === "done" ? (
          <>
            {result && result.cardsAdded > 0 && (
              <Link href="/study" className="rounded-lg bg-accent px-4 py-3 text-center font-medium text-white">
                Review them now
              </Link>
            )}
            {nextSlug ? (
              <Link
                href={`/lessons/${nextSlug}`}
                className="rounded-lg border border-border bg-card px-4 py-3 text-center font-medium"
              >
                Next lesson →
              </Link>
            ) : (
              <Link
                href="/lessons"
                className="rounded-lg border border-border bg-card px-4 py-3 text-center font-medium"
              >
                All lessons
              </Link>
            )}
          </>
        ) : step === "checks" ? (
          <button
            disabled={saving || (!!check && !answered)}
            className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
            onClick={() => {
              if (check && checkIndex < lesson.checks.length - 1) setCheckIndex((i) => i + 1);
              else finish(picks);
            }}
          >
            {saving ? "Saving…" : check && checkIndex < lesson.checks.length - 1 ? "Next" : "Finish lesson"}
          </button>
        ) : (
          <button className="rounded-lg bg-accent px-4 py-3 font-medium text-white" onClick={forward}>
            {step === "intro" ? "Start" : "Continue"}
          </button>
        )}
      </footer>
    </main>
  );
}
