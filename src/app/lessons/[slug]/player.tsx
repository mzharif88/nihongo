"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { RoleLegend } from "@/components/role-colours";
import { Ruby } from "@/components/ruby";
import { isMarkup, stripMarkup } from "@/lib/furigana";
import { isSituation, type LessonRow } from "@/lib/lessons/lessons";
import { readSaved, useHydrated, writeSaved } from "@/lib/saved-progress";
import type { StudyItem } from "@/lib/study/cards";
import { speak } from "@/app/study/speak";
import { completeLesson, type LessonResult } from "../actions";

type Step =
  | { kind: "intro" }
  | { kind: "item"; item: StudyItem }
  | { kind: "grammar" }
  | { kind: "dialogue" }
  | { kind: "check"; index: number };

interface Props {
  lesson: LessonRow;
  items: StudyItem[];
  grammar: StudyItem | null;
  /** Already finished once: XP bonus is gone, but replays still count towards the streak. */
  replay: boolean;
}

/** Saved per browser so leaving halfway resumes at the same step. */
interface Saved {
  step: number;
  answers: (number | null)[];
}

const storageKey = (slug: string) => `lesson:${slug}`;

/**
 * Server render and hydration start at step 1; once hydrated, the player
 * remounts with whatever this browser saved, so markup always matches.
 */
/** Situation lessons live on their own page. */
const backHref = (slug: string) => (isSituation(slug) ? "/situations" : "/lessons");

export function LessonPlayer(props: Props) {
  const hydrated = useHydrated();
  return <Player key={hydrated ? "client" : "server"} {...props} resume={hydrated} />;
}

function Player({ lesson, items, grammar, replay, resume }: Props & { resume: boolean }) {
  const steps: Step[] = [
    { kind: "intro" },
    ...items.map((item) => ({ kind: "item" as const, item })),
    ...(grammar || lesson.notes ? [{ kind: "grammar" as const }] : []),
    ...(lesson.dialogue.length ? [{ kind: "dialogue" as const }] : []),
    ...lesson.checks.map((_, index) => ({ kind: "check" as const, index })),
  ];

  const [saved] = useState(() => {
    const s = resume ? readSaved<Saved>(storageKey(lesson.slug)) : null;
    return s && s.step > 0 && s.step < steps.length ? s : null;
  });
  const [stepIndex, setStepIndex] = useState(saved?.step ?? 0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => lesson.checks.map((_, i) => saved?.answers?.[i] ?? null));
  const [result, setResult] = useState<LessonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function go(to: number, nextAnswers = answers) {
    setStepIndex(to);
    writeSaved<Saved>(storageKey(lesson.slug), { step: to, answers: nextAnswers });
    window.scrollTo(0, 0);
  }

  function finish() {
    startSaving(async () => {
      try {
        const r = await completeLesson(lesson.slug, answers);
        writeSaved<Saved>(storageKey(lesson.slug), null);
        setResult(r);
        setError(null);
      } catch {
        setError("Couldn't save the lesson. Check your connection and try again.");
      }
    });
  }

  function next() {
    if (isLast) finish();
    else go(stepIndex + 1);
  }

  if (result) return <Finished lesson={lesson} result={result} replay={replay} />;

  const checkPicked = step.kind === "check" ? answers[step.index] : null;
  const canContinue = step.kind !== "check" || checkPicked !== null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-4">
      <header className="flex items-center justify-between gap-2 text-sm text-muted">
        <Link href={backHref(lesson.slug)} aria-label="Leave lesson (progress is kept)">
          ✕
        </Link>
        <span className="truncate">
          <Ruby text={lesson.title} hide />
        </span>
        <span>
          {stepIndex + 1}/{steps.length}
        </span>
      </header>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent transition-all" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
      </div>

      <section className="flex flex-1 flex-col pt-6">
        {step.kind === "intro" && <Intro lesson={lesson} items={items} />}
        {step.kind === "item" && <ItemStep item={step.item} />}
        {step.kind === "grammar" && <GrammarStep grammar={grammar} notes={lesson.notes} />}
        {step.kind === "dialogue" && <DialogueStep lesson={lesson} />}
        {step.kind === "check" && (
          <CheckStep
            lesson={lesson}
            index={step.index}
            picked={checkPicked}
            onPick={(i) => {
              const nextAnswers = answers.map((a, j) => (j === step.index ? i : a));
              setAnswers(nextAnswers);
              writeSaved<Saved>(storageKey(lesson.slug), { step: stepIndex, answers: nextAnswers });
            }}
          />
        )}

        <div className="action-bar mt-auto flex gap-3 pt-6">
          {stepIndex > 0 && step.kind !== "check" && (
            <button
              onClick={() => go(stepIndex - 1)}
              className="rounded-xl border border-border px-4 py-3.5 text-lg font-medium"
              aria-label="Back"
            >
              ←
            </button>
          )}
          {canContinue && (
            <button
              onClick={next}
              disabled={saving}
              className="flex-1 rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : isLast ? "Finish lesson" : stepIndex === 0 ? "Start" : "Next"}
            </button>
          )}
        </div>
        {error && <p className="mt-2 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>
    </main>
  );
}

function Intro({ lesson, items }: { lesson: LessonRow; items: StudyItem[] }) {
  return (
    <div>
      <p className="text-sm font-medium text-accent">
        {lesson.jlpt_level} · Lesson {lesson.position}
      </p>
      <h1 className="mt-1 text-2xl font-bold">
        <Ruby text={lesson.title} />
      </h1>
      {lesson.situation && <p className="mt-3 text-lg"><Ruby text={lesson.situation} /></p>}
      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted">You&apos;ll learn</p>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-2 text-lg" lang="ja">
          {items.map((i) => (
            <span key={i.id}>
              <Ruby text={i.term} reading={i.reading} />
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

function ItemStep({ item }: { item: StudyItem }) {
  const reading = item.reading && !isMarkup(item.reading) ? item.reading : null;
  const example = item.examples?.[0] ?? null;
  return (
    <div>
      <p className="text-center text-sm font-medium text-accent">New word</p>
      <button
        onClick={() => speak(item.term, item.audio_url)}
        className="my-4 block w-full text-center text-5xl font-bold"
        lang="ja"
        aria-label={`Play ${item.term}`}
      >
        <Ruby text={item.term} reading={item.reading} />
      </button>
      <dl className="space-y-3 rounded-xl border border-border bg-card p-4">
        {(reading || item.romaji) && (
          <div>
            <dt className="text-xs text-muted">Reading</dt>
            <dd lang="ja">{[reading, item.romaji].filter(Boolean).join(" · ")}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted">Meaning</dt>
          <dd className="text-lg">{item.meaning}</dd>
        </div>
        {item.mnemonic && (
          <div>
            <dt className="text-xs text-muted">Memory hint</dt>
            <dd>{item.mnemonic}</dd>
          </div>
        )}
        {example && (
          <div>
            <dt className="text-xs text-muted">Example</dt>
            <dd className="text-lg">
              <button onClick={() => speak(example.jp)} className="text-left">
                <Ruby text={example.jp} reading={example.reading} />
              </button>
            </dd>
            <dd className="text-sm text-muted">{example.en}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-center text-xs text-muted">Tap the word to hear it.</p>
    </div>
  );
}

/** Paragraphs of notes; each may be ruby markup. */
function Paragraphs({ text }: { text: string }) {
  return (
    <div className="space-y-3 leading-relaxed">
      {text
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i}>
            {p.split("\n").map((line, j) => (
              <span key={j} className="block">
                <Ruby text={line} />
              </span>
            ))}
          </p>
        ))}
    </div>
  );
}

function GrammarStep({ grammar, notes }: { grammar: StudyItem | null; notes: string | null }) {
  return (
    <div>
      <p className="text-sm font-medium text-accent">Grammar</p>
      {grammar && (
        <div className="mt-2 rounded-xl border border-border bg-card p-4">
          <h2 className="text-2xl font-bold" lang="ja">
            {grammar.term}
          </h2>
          <p className="mt-1 text-lg">{grammar.meaning}</p>
          {grammar.examples?.map((e, i) => (
            <div key={i} className="mt-3">
              <button onClick={() => speak(e.jp)} className="text-left text-lg">
                <Ruby text={e.jp} reading={e.reading} />
              </button>
              <p className="text-sm text-muted">{e.en}</p>
            </div>
          ))}
        </div>
      )}
      {notes && (
        <div className="mt-4">
          <Paragraphs text={notes} />
        </div>
      )}
    </div>
  );
}

function DialogueStep({ lesson }: { lesson: LessonRow }) {
  const [showEnglish, setShowEnglish] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-accent">Dialogue</p>
        <button onClick={() => setShowEnglish((s) => !s)} className="text-sm text-muted underline">
          {showEnglish ? "Hide English" : "Show English"}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted">Tap a line to hear it.</p>
      <div className="mt-2">
        <RoleLegend />
      </div>
      <ol className="mt-4 space-y-3">
        {lesson.dialogue.map((line, i) => {
          const mine = line.speaker === "あなた";
          return (
            <li key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <button
                onClick={() => speak(line.jp, line.audio_url)}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-left ${
                  // A tint, not solid orange, so the grammar colours stay readable.
                  mine ? "border border-accent bg-accent/10" : "border border-border bg-card"
                }`}
              >
                <span className="block text-xs text-muted" lang="ja">
                  {line.speaker === "あなた" ? "You" : <Ruby text={line.speaker} />}
                </span>
                <span className="block text-lg leading-loose">
                  <Ruby text={line.jp} reading={line.reading} />
                </span>
                {showEnglish && <span className="block text-sm text-muted">{line.en}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CheckStep({
  lesson,
  index,
  picked,
  onPick,
}: {
  lesson: LessonRow;
  index: number;
  picked: number | null;
  onPick: (i: number) => void;
}) {
  const check = lesson.checks[index];
  const answered = picked !== null;
  const correct = picked === check.answer;
  return (
    <div>
      <p className="text-sm font-medium text-accent">
        Quick check {index + 1} of {lesson.checks.length}
      </p>
      <p className="mt-2 text-xl font-medium leading-loose">
        <Ruby text={check.prompt} />
      </p>
      <div className="mt-4 grid gap-3">
        {check.options.map((option, i) => {
          const style = !answered
            ? "border-border bg-card active:border-accent"
            : i === check.answer
              ? "border-green-600 bg-green-50 dark:bg-green-950"
              : i === picked
                ? "border-red-600 bg-red-50 dark:bg-red-950"
                : "border-border bg-card opacity-60";
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => {
                onPick(i);
                if (/[぀-ヿ㐀-鿿]/.test(option)) speak(stripMarkup(option));
              }}
              className={`min-h-14 rounded-xl border-2 px-4 py-3 text-left text-lg ${style}`}
            >
              <Ruby text={option} />
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          role="status"
          className={`mt-4 rounded-xl border p-4 ${
            correct ? "border-green-600 bg-green-50 dark:bg-green-950" : "border-red-600 bg-red-50 dark:bg-red-950"
          }`}
        >
          <p className="font-medium">{correct ? "Correct!" : "Not quite"}</p>
          {check.explanation && (
            <p className="mt-1 leading-loose">
              <Ruby text={check.explanation} />
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Finished({ lesson, result, replay }: { lesson: LessonRow; result: LessonResult; replay: boolean }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
      <div className="text-5xl">{result.score === result.max ? "🎉" : "👍"}</div>
      <h1 className="mt-4 text-2xl font-bold">Lesson complete</h1>
      <p className="mt-1 text-muted">
        <Ruby text={lesson.title} hide />
      </p>
      <p className="mt-4">
        {result.score}/{result.max} checks right · +{result.xpGained} XP · {result.streak}-day streak
      </p>
      <p className="mt-1 text-sm text-muted">
        {result.added > 0
          ? `${result.added} words added to your reviews.`
          : replay
            ? "Its words are already in your reviews."
            : "These words were already in your reviews."}
      </p>
      {result.nextSlug && (
        <a href={`/lessons/${result.nextSlug}`} className="mt-8 rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
          {isSituation(lesson.slug) ? "Next situation" : "Next lesson"}
        </a>
      )}
      {result.added > 0 && (
        <Link href="/study" className="mt-3 rounded-lg border border-border px-4 py-2.5 font-medium">
          Review the new words now
        </Link>
      )}
      <Link href={backHref(lesson.slug)} className="mt-3 rounded-lg border border-border px-4 py-2.5 font-medium">
        {isSituation(lesson.slug) ? "All situations" : "All lessons"}
      </Link>
    </main>
  );
}
