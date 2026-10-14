"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ExamText } from "@/components/exam-text";
import type { Answers, MockRow, QuestionRow } from "@/lib/mock/mock";
import { spokenScript } from "@/lib/mock/mock";
import { readSaved, useHydrated, writeSaved } from "@/lib/saved-progress";
import { speak } from "@/app/study/speak";
import { submitMock } from "../actions";

export type PublicQuestion = Omit<QuestionRow, "answer" | "explanation" | "item_slugs">;

interface Paper {
  id: string;
  title: string;
  minutes: number;
  questions: PublicQuestion[];
}

type Mode = "exam" | "practice";

/** Everything needed to resume after leaving: saved per browser. */
interface Saved {
  mode: Mode;
  paper: number;
  /** Paper intro shown, questions not started yet. */
  between: boolean;
  question: number;
  answers: Answers;
  /** When the current paper's time runs out (exam mode), ms since epoch. */
  deadline: number | null;
  startedAt: string;
}

const storageKey = (slug: string) => `mock:${slug}`;

export function MockPlayer(props: { mock: MockRow; papers: Paper[] }) {
  const hydrated = useHydrated();
  return <Player key={hydrated ? "client" : "server"} {...props} resume={hydrated} />;
}

function Player({ mock, papers, resume }: { mock: MockRow; papers: Paper[]; resume: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<Saved | null>(() => (resume ? readSaved<Saved>(storageKey(mock.slug)) : null));
  const [now, setNow] = useState(() => Date.now());
  const [plays, setPlays] = useState<Record<string, number>>({});
  const [showScript, setShowScript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const total = papers.reduce((n, p) => n + p.questions.length, 0);

  function save(next: Saved | null) {
    setState(next);
    writeSaved(storageKey(mock.slug), next);
  }

  function submit(final: Saved) {
    startSubmit(async () => {
      try {
        const { attemptId } = await submitMock(mock.slug, final.answers, { startedAt: final.startedAt, mode: final.mode });
        writeSaved(storageKey(mock.slug), null);
        router.push(`/mock/attempts/${attemptId}`);
      } catch {
        setError("Couldn't submit. Check your connection and try again — your answers are kept.");
      }
    });
  }

  function finishPaper(s: Saved) {
    if (s.paper >= papers.length - 1) {
      const done = { ...s, deadline: null };
      save(done);
      submit(done);
      return;
    }
    save({ ...s, paper: s.paper + 1, between: true, question: 0, deadline: null });
  }

  // Exam clock: tick every second and end the paper when time is up.
  const timed = state?.mode === "exam" && !state.between && state.deadline !== null;
  useEffect(() => {
    if (!timed) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timed]);
  const remainingMs = state?.deadline ? state.deadline - now : null;
  useEffect(() => {
    if (state && timed && remainingMs !== null && remainingMs <= 0 && !submitting) {
      const id = window.setTimeout(() => finishPaper(state), 0);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timed, remainingMs, submitting]);

  if (!state) {
    return <Intro mock={mock} papers={papers} total={total} onStart={(mode) => save({ mode, paper: 0, between: true, question: 0, answers: {}, deadline: null, startedAt: new Date().toISOString() })} />;
  }

  const paper = papers[state.paper];
  if (state.between) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <p className="text-sm text-muted">
          Paper {state.paper + 1} of {papers.length}
        </p>
        <h1 className="mt-2 text-2xl font-bold" lang="ja">
          {paper.title}
        </h1>
        <p className="mt-2 text-muted">
          {paper.questions.length} questions{state.mode === "exam" ? ` · ${paper.minutes} minutes` : " · untimed practice"}
        </p>
        {paper.questions[0]?.section === "listening" && (
          <p className="mt-3 text-sm text-muted">Turn your sound on. Each question has a ▶ button that reads it aloud.</p>
        )}
        <button
          onClick={() =>
            save({ ...state, between: false, question: 0, deadline: state.mode === "exam" ? Date.now() + paper.minutes * 60_000 : null })
          }
          className="mt-8 rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white"
        >
          Start paper {state.paper + 1}
        </button>
        <Link href="/mock" className="mt-4 text-sm text-muted underline">
          Leave (your progress is kept)
        </Link>
      </main>
    );
  }

  const q = paper.questions[state.question];
  const furigana = state.mode === "practice";
  const isTarget = /漢字読み|表記/.test(q.part ?? "");
  const answered = paper.questions.filter((x) => typeof state.answers[x.id] === "number").length;
  const prevPart = state.question > 0 ? paper.questions[state.question - 1].part : null;

  function pick(i: number) {
    save({ ...state!, answers: { ...state!.answers, [q.id]: i } });
  }
  function go(to: number) {
    setShowScript(false);
    save({ ...state!, question: to });
    window.scrollTo(0, 0);
  }
  function play() {
    if (!q.passage) return;
    speak(spokenScript(q.passage));
    setPlays((p) => ({ ...p, [q.id]: (p[q.id] ?? 0) + 1 }));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-4">
      <header className="flex items-center justify-between gap-2 text-sm text-muted">
        <Link href="/mock" aria-label="Leave (progress is kept)">
          ✕
        </Link>
        <span className="truncate" lang="ja">
          {paper.title.split(" · ")[1] ?? paper.title}
        </span>
        <span className={`tabular-nums ${remainingMs !== null && remainingMs < 120_000 ? "font-bold text-red-600 dark:text-red-400" : ""}`}>
          {remainingMs !== null ? clock(remainingMs) : "practice"}
        </span>
      </header>

      {/* Question map: tap to jump; filled = answered. */}
      <nav className="mt-3 flex flex-wrap gap-1" aria-label="Questions">
        {paper.questions.map((x, i) => (
          <button
            key={x.id}
            onClick={() => go(i)}
            className={`h-7 min-w-7 rounded-md px-1 text-xs ${
              i === state.question
                ? "bg-accent text-white"
                : typeof state.answers[x.id] === "number"
                  ? "bg-border text-foreground"
                  : "border border-border text-muted"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <section className="flex flex-1 flex-col pt-4">
        {q.part && q.part !== prevPart && (
          <p className="mb-2 rounded-lg bg-card px-3 py-1.5 text-xs text-muted" lang="ja">
            {q.part}
          </p>
        )}
        {q.part && q.part === prevPart && (
          <p className="mb-2 text-xs text-muted" lang="ja">
            {q.part}
          </p>
        )}

        {q.section === "listening" ? (
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <button onClick={play} className="rounded-full bg-accent px-6 py-3 text-lg font-medium text-white">
              ▶ Play
            </button>
            <p className="mt-2 text-xs text-muted">
              {plays[q.id] ? `Played ${plays[q.id]}×` : "Listen, then choose."}
              {state.mode === "exam" ? " In the real exam you hear it once." : ""}
            </p>
            {furigana && (
              <button onClick={() => setShowScript((s) => !s)} className="mt-2 text-xs text-muted underline">
                {showScript ? "Hide script" : "Show script"}
              </button>
            )}
            {showScript && q.passage && (
              <p className="mt-3 text-left leading-loose" lang="ja">
                <ExamText text={q.passage} furigana={furigana} />
              </p>
            )}
          </div>
        ) : (
          q.passage && (
            <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-border bg-card p-4 leading-loose" lang="ja">
              <ExamText text={q.passage} furigana={furigana} />
            </div>
          )
        )}

        <p className="mt-4 text-lg font-medium leading-loose" lang="ja">
          <span className="mr-2 text-muted">{state.question + 1}.</span>
          <ExamText text={q.prompt} furigana={furigana} hideTarget={isTarget} />
        </p>

        <div className="mt-3 grid gap-2" lang="ja">
          {q.options.map((option, i) => {
            const chosen = state.answers[q.id] === i;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                className={`flex min-h-12 items-start gap-3 rounded-xl border-2 px-4 py-2.5 text-left text-lg ${
                  chosen ? "border-accent bg-card" : "border-border bg-card active:border-accent"
                }`}
              >
                <span className={`mt-0.5 text-sm ${chosen ? "text-accent" : "text-muted"}`}>{i + 1}</span>
                <span className="leading-loose">
                  <ExamText text={option} furigana={furigana && q.section !== "vocabulary"} />
                </span>
              </button>
            );
          })}
        </div>

        <div className="action-bar mt-auto flex gap-3 pt-6">
          <button
            onClick={() => go(state.question - 1)}
            disabled={state.question === 0}
            className="rounded-xl border border-border px-4 py-3.5 text-lg font-medium disabled:opacity-40"
            aria-label="Previous question"
          >
            ←
          </button>
          {state.question < paper.questions.length - 1 ? (
            <button onClick={() => go(state.question + 1)} className="flex-1 rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white">
              Next
            </button>
          ) : (
            <button
              onClick={() => {
                const blank = paper.questions.length - answered;
                if (blank === 0 || window.confirm(`${blank} question${blank > 1 ? "s" : ""} left blank. Finish this paper anyway?`)) {
                  finishPaper(state);
                }
              }}
              disabled={submitting}
              className="flex-1 rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Submitting…" : state.paper === papers.length - 1 ? "Finish test" : "Finish paper"}
            </button>
          )}
        </div>
        <p className="text-center text-xs text-muted">
          {answered}/{paper.questions.length} answered in this paper
        </p>
        {error && (
          <div className="mt-2 text-center text-sm text-red-600 dark:text-red-400">
            {error}{" "}
            <button onClick={() => submit(state)} className="underline">
              Retry
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function Intro({ mock, papers, total, onStart }: { mock: MockRow; papers: Paper[]; total: number; onStart: (mode: Mode) => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <p className="text-sm text-muted">{mock.jlpt_level} mock test</p>
      <h1 className="mt-1 text-2xl font-bold">{mock.title}</h1>
      <ol className="mt-4 space-y-2">
        {papers.map((p, i) => (
          <li key={p.id} className="rounded-xl border border-border bg-card p-3">
            <div className="font-medium" lang="ja">
              {i + 1}. {p.title}
            </div>
            <div className="text-sm text-muted">
              {p.questions.length} questions · {p.minutes} min
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted">
        {total} questions. Papers run in order with their own timer, like the real exam; you can move freely within a paper.
      </p>
      <button onClick={() => onStart("exam")} className="mt-6 rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white">
        Exam conditions
      </button>
      <p className="mt-1 text-center text-xs text-muted">Timed, no furigana — counts towards your pass record.</p>
      <button onClick={() => onStart("practice")} className="mt-4 rounded-xl border border-border px-4 py-3.5 text-lg font-medium">
        Practice mode
      </button>
      <p className="mt-1 text-center text-xs text-muted">Untimed, furigana on (never on the answer), listening scripts available.</p>
      <Link href="/mock" className="mt-6 text-center text-sm text-muted underline">
        Back
      </Link>
    </main>
  );
}

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
