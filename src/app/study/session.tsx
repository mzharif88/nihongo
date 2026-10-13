"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Grade } from "@/lib/srs/fsrs";
import type { StudyCard } from "@/lib/study/cards";
import { XP_CORRECT, XP_WRONG } from "@/lib/study/streak";
import { recordAnswer } from "./actions";
import { speak } from "./speak";

/** Cards that come due again within this window (FSRS learning steps) are repeated in the same session. */
const REQUEUE_WINDOW_MS = 15 * 60 * 1000;
const MAX_REPEATS = 3;

/** Self-grades for flip cards, matching FSRS ratings (1 Again … 4 Easy). */
const GRADES: { grade: Grade; label: string; style: string }[] = [
  { grade: 1 as Grade, label: "Again", style: "border-red-600 text-red-700 dark:text-red-400" },
  { grade: 2 as Grade, label: "Hard", style: "border-amber-600 text-amber-700 dark:text-amber-400" },
  { grade: 3 as Grade, label: "Good", style: "border-green-600 text-green-700 dark:text-green-400" },
  { grade: 4 as Grade, label: "Easy", style: "border-sky-600 text-sky-700 dark:text-sky-400" },
];

type Phase = "intro" | "question" | "answered";

interface Props {
  cards: StudyCard[];
  dueCount: number;
  newCount: number;
  /** Where "Learn more" goes once the queue is empty, or null when no more content is unlocked. */
  learnMoreHref: string | null;
}

export function StudySession({ cards: initial, dueCount, newCount, learnMoreHref }: Props) {
  const [queue, setQueue] = useState(initial);
  const [repeats, setRepeats] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<Phase>(initial[0]?.isNew ? "intro" : "question");
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(false);
  const [shownAt, setShownAt] = useState(() => Date.now());
  const [answerMs, setAnswerMs] = useState(0);
  const [stats, setStats] = useState({ done: 0, right: 0, xp: 0, streak: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const card = queue[0];
  const remaining = queue.length;

  function answer(isCorrect: boolean, choice?: number) {
    setAnswerMs(Date.now() - shownAt);
    setCorrect(isCorrect);
    if (choice !== undefined) setPicked(choice);
    setPhase("answered");
    speak(card.reveal.term, card.reveal.audioUrl);
  }

  /** Flip a recall card: show the answer and wait for the learner's self-grade. */
  function reveal() {
    setAnswerMs(Date.now() - shownAt);
    setPhase("answered");
    speak(card.reveal.term, card.reveal.audioUrl);
  }

  function startQuestion() {
    setPhase("question");
    setShownAt(Date.now());
  }

  /** Save the answer and move on: multiple choice passes its result, flip cards their self-grade. */
  function save(grade?: Grade) {
    const current = card;
    const wasCorrect = grade !== undefined ? grade > 1 : correct;
    startSaving(async () => {
      try {
        const result = await recordAnswer({
          itemId: current.itemId,
          cardType: current.cardType,
          correct: wasCorrect,
          grade,
          msTaken: answerMs,
          given: current.mode === "choice" ? current.options?.[picked ?? -1] : undefined,
        });
        setError(null);
        setStats((s) => ({
          done: s.done + 1,
          right: s.right + (wasCorrect ? 1 : 0),
          xp: s.xp + (wasCorrect ? XP_CORRECT : XP_WRONG),
          streak: result.streak,
        }));
        const count = repeats[current.key] ?? 0;
        const again = new Date(result.due).getTime() - Date.now() < REQUEUE_WINDOW_MS && count < MAX_REPEATS;
        const rest = queue.slice(1);
        const nextQueue = again ? [...rest, { ...current, isNew: false }] : rest;
        if (again) setRepeats((r) => ({ ...r, [current.key]: count + 1 }));
        setQueue(nextQueue);
        setPicked(null);
        setPhase(nextQueue[0]?.isNew ? "intro" : "question");
        setShownAt(Date.now());
      } catch {
        setError("Couldn't save that answer. Check your connection and try again.");
      }
    });
  }

  if (!card) {
    const accuracy = stats.done ? Math.round((stats.right / stats.done) * 100) : 0;
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 text-2xl font-bold">お疲れ様でした！</h1>
        <p className="mt-2 text-muted">
          {stats.done} answers · {accuracy}% correct · +{stats.xp} XP · {stats.streak}-day streak
        </p>
        {learnMoreHref && (
          // A full load (not <Link>) so the server builds a fresh session instead of reusing this component's state.
          <a href={learnMoreHref} className="mt-8 rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
            Learn 10 more
          </a>
        )}
        <Link href="/" className="mt-3 rounded-lg border border-border px-4 py-2.5 font-medium">
          Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-4">
      <header className="flex items-center justify-between text-sm text-muted">
        <Link href="/" aria-label="End session">
          ✕
        </Link>
        <span>
          {remaining} left · {dueCount} reviews, {newCount} new
        </span>
        <span>+{stats.xp} XP</span>
      </header>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${(stats.done / (stats.done + remaining)) * 100}%` }}
        />
      </div>

      {phase === "intro" ? (
        <Intro card={card} onDone={startQuestion} />
      ) : (
        <section className="flex flex-1 flex-col">
          <p className="mt-8 text-center text-sm text-muted">
            {card.isNew ? "New · " : ""}
            {card.question}
          </p>
          <div
            className={`my-6 text-center font-bold ${card.promptIsJapanese ? "text-6xl" : "text-3xl"} break-words`}
            lang={card.promptIsJapanese ? "ja" : "en"}
          >
            {card.prompt}
          </div>

          {card.mode === "choice" && (
            <Choices card={card} phase={phase} picked={picked} onPick={(i) => answer(i === card.answerIndex, i)} />
          )}

          {phase === "answered" && (card.mode === "choice" ? <Feedback card={card} correct={correct} /> : <Answer card={card} />)}

          <div className="mt-auto pt-6">
            {error && <p className="mb-2 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
            {card.mode === "flip" && phase === "question" && (
              <button
                onClick={reveal}
                autoFocus
                className="w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white"
              >
                Show answer
              </button>
            )}
            {card.mode === "flip" && phase === "answered" && (
              <div className="grid grid-cols-4 gap-2">
                {GRADES.map((g) => (
                  <button
                    key={g.grade}
                    onClick={() => save(g.grade)}
                    disabled={saving}
                    className={`rounded-xl border-2 bg-card px-1 py-3 font-medium disabled:opacity-60 ${g.style}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            {card.mode === "choice" && phase === "answered" && (
              <button
                onClick={() => save()}
                disabled={saving}
                autoFocus
                className="w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Next"}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function Intro({ card, onDone }: { card: StudyCard; onDone: () => void }) {
  const r = card.reveal;
  return (
    <section className="flex flex-1 flex-col">
      <p className="mt-8 text-center text-sm font-medium text-accent">New item</p>
      <button
        onClick={() => speak(r.term, r.audioUrl)}
        className="my-4 text-center text-6xl font-bold"
        lang="ja"
        aria-label={`Play ${r.term}`}
      >
        {r.term}
      </button>
      <dl className="space-y-3 rounded-xl border border-border bg-card p-4">
        {(r.reading || r.romaji) && (
          <div>
            <dt className="text-xs text-muted">Reading</dt>
            <dd lang="ja">{[r.reading, r.romaji].filter(Boolean).join(" · ")}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted">Meaning</dt>
          <dd className="text-lg">{r.meaning}</dd>
        </div>
        {r.mnemonic && (
          <div>
            <dt className="text-xs text-muted">Memory hint</dt>
            <dd>{r.mnemonic}</dd>
          </div>
        )}
        {r.example && (
          <div>
            <dt className="text-xs text-muted">Example</dt>
            <dd lang="ja">{r.example.jp}</dd>
            <dd className="text-sm text-muted">{r.example.en}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-center text-xs text-muted">Tap the character to hear it.</p>
      <div className="mt-auto pt-6">
        <button onClick={onDone} className="w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white">
          Got it, quiz me
        </button>
      </div>
    </section>
  );
}

function Choices({
  card,
  phase,
  picked,
  onPick,
}: {
  card: StudyCard;
  phase: Phase;
  picked: number | null;
  onPick: (i: number) => void;
}) {
  return (
    <div className="grid gap-3">
      {card.options!.map((option, i) => {
        const answered = phase === "answered";
        const isAnswer = i === card.answerIndex;
        const style = !answered
          ? "border-border bg-card active:border-accent"
          : isAnswer
            ? "border-green-600 bg-green-50 dark:bg-green-950"
            : i === picked
              ? "border-red-600 bg-red-50 dark:bg-red-950"
              : "border-border bg-card opacity-60";
        return (
          <button
            key={i}
            disabled={answered}
            onClick={() => onPick(i)}
            className={`min-h-14 rounded-xl border-2 px-4 py-3 text-left text-lg ${style}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

/** The back of a flip card: everything about the item, no right/wrong colouring. */
function Answer({ card }: { card: StudyCard }) {
  const r = card.reveal;
  return (
    <div role="status" className="mt-2 rounded-xl border border-border bg-card p-4 text-center">
      <button onClick={() => speak(r.term, r.audioUrl)} className="text-4xl font-bold" lang="ja" aria-label={`Play ${r.term}`}>
        {r.term}
      </button>
      {[r.reading, r.romaji].filter(Boolean).length > 0 && (
        <p className="mt-1 text-muted" lang="ja">
          {[r.reading, r.romaji].filter(Boolean).join(" · ")}
        </p>
      )}
      <p className="mt-2 text-lg">{r.meaning}</p>
      {r.mnemonic && <p className="mt-3 text-sm text-muted">💡 {r.mnemonic}</p>}
      {r.example && (
        <p className="mt-3 text-sm" lang="ja">
          {r.example.jp} <span className="text-muted">· {r.example.en}</span>
        </p>
      )}
      <p className="mt-3 text-xs text-muted">How well did you remember it?</p>
    </div>
  );
}

function Feedback({ card, correct }: { card: StudyCard; correct: boolean }) {
  const r = card.reveal;
  return (
    <div
      role="status"
      className={`mt-4 rounded-xl border p-4 ${
        correct ? "border-green-600 bg-green-50 dark:bg-green-950" : "border-red-600 bg-red-50 dark:bg-red-950"
      }`}
    >
      <p className="font-medium">{correct ? "Correct!" : "Not quite"}</p>
      <p className="mt-1" lang="ja">
        <button onClick={() => speak(r.term, r.audioUrl)} className="font-bold underline decoration-dotted">
          {r.term}
        </button>
        {[r.reading, r.romaji].filter(Boolean).length > 0 && ` · ${[r.reading, r.romaji].filter(Boolean).join(" · ")}`}
      </p>
      <p className="text-sm">{r.meaning}</p>
      {r.mnemonic && !correct && <p className="mt-2 text-sm text-muted">💡 {r.mnemonic}</p>}
    </div>
  );
}
