"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Ruby } from "@/components/ruby";
import { stripMarkup } from "@/lib/furigana";
import { BUILDER_BONUS_XP, dealTiles, isCorrect, seededRng, type PatternRow, type Tile, alsoMarkup } from "@/lib/builder/builder";
import { readSaved, useHydrated, writeSaved } from "@/lib/saved-progress";
import { XP_CORRECT, XP_WRONG } from "@/lib/study/streak";
import { speak } from "@/app/study/speak";
import { completeBuilder, type BuilderResult } from "../actions";

interface Props {
  pattern: PatternRow;
  grammar: { term: string; meaning: string } | null;
  nextSlug: string | null;
  firstRun: boolean;
}

/** Answers so far (tile texts per finished exercise), saved per browser to resume. */
interface Saved {
  answers: string[][];
}

const storageKey = (slug: string) => `builder:${slug}`;

export function BuilderPlayer(props: Props) {
  const hydrated = useHydrated();
  return <Player key={hydrated ? "client" : "server"} {...props} resume={hydrated} />;
}

function Player({ pattern, grammar, nextSlug, firstRun, resume }: Props & { resume: boolean }) {
  const exercises = pattern.examples;
  const [answers, setAnswers] = useState<string[][]>(() => {
    const saved = resume ? readSaved<Saved>(storageKey(pattern.slug)) : null;
    return saved?.answers?.length && saved.answers.length < exercises.length ? saved.answers : [];
  });
  const index = answers.length;
  const ex = exercises[index];

  const dealt = useMemo(
    () => (ex ? dealTiles(ex, seededRng(`${pattern.slug}:${index}`)) : []),
    [ex, pattern.slug, index],
  );
  const [placed, setPlaced] = useState<Tile[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<BuilderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const placedIds = new Set(placed.map((t) => t.id));
  const runningXp = answers.reduce((xp, a, i) => xp + (isCorrect(exercises[i], a) ? XP_CORRECT : XP_WRONG), 0);

  function place(tile: Tile) {
    if (checked !== null) return;
    setPlaced((p) => [...p, tile]);
    speak(stripMarkup(tile.text));
  }

  function unplace(tile: Tile) {
    if (checked !== null) return;
    setPlaced((p) => p.filter((t) => t.id !== tile.id));
  }

  function check() {
    const ok = isCorrect(ex, placed.map((t) => t.text));
    setChecked(ok);
    speak(stripMarkup(ex.jp));
  }

  function finish(all: string[][]) {
    startSaving(async () => {
      try {
        const r = await completeBuilder(pattern.slug, all);
        writeSaved<Saved>(storageKey(pattern.slug), null);
        setResult(r);
        setError(null);
      } catch {
        setError("Couldn't save your run. Check your connection and try again.");
      }
    });
  }

  function next() {
    const all = [...answers, placed.map((t) => t.text)];
    if (all.length === exercises.length) {
      finish(all);
      return;
    }
    setAnswers(all);
    writeSaved<Saved>(storageKey(pattern.slug), { answers: all });
    setPlaced([]);
    setChecked(null);
    setShowHint(false);
  }

  if (result) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <div className="text-5xl">{result.score === result.max ? "🎉" : "👍"}</div>
        <h1 className="mt-4 text-2xl font-bold">
          {result.score}/{result.max} sentences right
        </h1>
        <p className="mt-2 text-muted">
          +{result.xpGained} XP{firstRun ? ` (incl. ${BUILDER_BONUS_XP} first-run bonus)` : ""} · {result.streak}-day streak
        </p>
        {result.score < result.max && (
          <a href={`/builder/${pattern.slug}`} className="mt-8 rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
            Try again
          </a>
        )}
        {nextSlug && (
          <a
            href={`/builder/${nextSlug}`}
            className={`rounded-lg px-4 py-2.5 font-medium ${
              result.score < result.max ? "mt-3 border border-border" : "mt-8 bg-accent text-white"
            }`}
          >
            Next pattern
          </a>
        )}
        <Link href="/builder" className="mt-3 rounded-lg border border-border px-4 py-2.5 font-medium">
          All patterns
        </Link>
      </main>
    );
  }

  // Every exercise answered but the save failed: offer a retry.
  if (!ex) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <p>{error ?? "Saving…"}</p>
        <button onClick={() => finish(answers)} className="mt-6 rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
          Save again
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-4">
      <header className="flex items-center justify-between gap-2 text-sm text-muted">
        <Link href="/builder" aria-label="Leave (progress is kept)">
          ✕
        </Link>
        <span className="truncate" lang="ja">
          <Ruby text={pattern.title} hide />
        </span>
        <span>+{runningXp} XP</span>
      </header>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent transition-all" style={{ width: `${(index / exercises.length) * 100}%` }} />
      </div>

      <section className="flex flex-1 flex-col pt-6">
        <p className="text-sm text-muted">
          Sentence {index + 1} of {exercises.length} · build it in Japanese
        </p>
        <p className="mt-2 text-2xl font-bold">{ex.en}</p>
        <button onClick={() => setShowHint((s) => !s)} className="mt-1 self-start text-sm text-muted underline">
          {showHint ? "Hide hint" : "Hint"}
        </button>
        {showHint && (
          <div className="mt-2 rounded-xl border border-border bg-card p-3 text-sm">
            <p className="font-medium" lang="ja">
              <Ruby text={pattern.title} />
            </p>
            {grammar && (
              <p className="mt-1">
                <span lang="ja">{grammar.term}</span>: {grammar.meaning}
              </p>
            )}
            {pattern.notes && (
              <p className="mt-1 text-muted">
                <Ruby text={pattern.notes} />
              </p>
            )}
          </div>
        )}

        {/* Answer line: tap a placed tile to send it back. */}
        <div
          className={`mt-5 flex min-h-20 flex-wrap content-start items-end gap-2 rounded-xl border-2 border-dashed p-3 ${
            checked === null
              ? "border-border"
              : checked
                ? "border-green-600 bg-green-50 dark:bg-green-950"
                : "border-red-600 bg-red-50 dark:bg-red-950"
          }`}
          lang="ja"
        >
          {placed.length === 0 && <span className="self-center text-sm text-muted">Tap tiles below</span>}
          {placed.map((t) => (
            <button
              key={t.id}
              onClick={() => unplace(t)}
              disabled={checked !== null}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xl leading-loose shadow-sm"
            >
              <Ruby text={t.text} />
            </button>
          ))}
        </div>

        {/* Tile bank: placed tiles leave a gap so the layout doesn't jump. */}
        <div className="mt-4 flex flex-wrap gap-2" lang="ja">
          {dealt.map((t) => (
            <button
              key={t.id}
              onClick={() => place(t)}
              disabled={placedIds.has(t.id) || checked !== null}
              className={`rounded-lg border px-3 py-2 text-xl leading-loose ${
                placedIds.has(t.id) ? "border-dashed border-border text-transparent" : "border-border bg-card shadow-sm active:border-accent"
              }`}
            >
              <Ruby text={t.text} />
            </button>
          ))}
        </div>

        {checked !== null && (
          <div
            role="status"
            className={`mt-4 rounded-xl border p-4 ${
              checked ? "border-green-600 bg-green-50 dark:bg-green-950" : "border-red-600 bg-red-50 dark:bg-red-950"
            }`}
          >
            <p className="font-medium">{checked ? "Correct!" : "Not quite. The sentence is:"}</p>
            <button onClick={() => speak(stripMarkup(ex.jp))} className="mt-1 text-left text-xl leading-loose" lang="ja">
              <Ruby text={ex.jp} reading={ex.reading} />
            </button>
            {ex.also.length > 0 && (
              <p className="mt-1 text-sm text-muted">
                Also correct:{" "}
                {ex.also.map((a) => (
                  <span key={a} className="mr-2">
                    <Ruby text={`${alsoMarkup(a, ex.tiles)}。`} />
                  </span>
                ))}
              </p>
            )}
          </div>
        )}

        <div className="action-bar mt-auto flex gap-3 pt-6">
          {checked === null ? (
            <>
              <button
                onClick={() => setPlaced([])}
                disabled={placed.length === 0}
                className="rounded-xl border border-border px-4 py-3.5 text-lg font-medium disabled:opacity-40"
              >
                Clear
              </button>
              <button
                onClick={check}
                disabled={placed.length === 0}
                className="flex-1 rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white disabled:opacity-40"
              >
                Check
              </button>
            </>
          ) : (
            <button
              onClick={next}
              disabled={saving}
              autoFocus
              className="flex-1 rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : index === exercises.length - 1 ? "Finish" : "Next"}
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>
    </main>
  );
}
