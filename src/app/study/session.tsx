"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { KanjiScope, useKanjiAllowance } from "@/components/kanji-scope";
import { Ruby } from "@/components/ruby";
import { groupsWith } from "@/lib/kanji/groups";
import { higherLevel, kanjiAllowed } from "@/lib/kanji-levels";
import { isMarkup, stripMarkup } from "@/lib/furigana";
import type { StudyCard } from "@/lib/study/cards";
import { introGroup, shuffleFront } from "@/lib/study/intro";
import { XP_CORRECT, XP_WRONG } from "@/lib/study/streak";
import { recordAnswer } from "./actions";
import { speak } from "./speak";

/** Cards that come due again within this window (FSRS learning steps) are repeated in the same session. */
const REQUEUE_WINDOW_MS = 15 * 60 * 1000;
/** A card missed again and again comes back at most this often in one session; the rest waits for tomorrow. */
const MAX_REPEATS = 2;
/**
 * Taps this soon after a card or phase appears are ignored: on phones a quick
 * double tap on "Next" (or a delayed ghost click) would otherwise land on the
 * next card's button in the same spot and skip its intro or answer it.
 */
const TAP_GUARD_MS = 400;

type Phase = "intro" | "question" | "answered";

interface Props {
  /** The topic being studied, or "Everything". */
  title: string;
  cards: StudyCard[];
  /** Where "Keep going" loads the next batch, or null when nothing is left. */
  keepGoingHref: string | null;
  /** Logged with each answer; course units say "course". */
  source?: "srs" | "course";
  /** The finish screen's way out. */
  doneLink?: { href: string; label: string };
  /**
   * The learner's kanji stage: a word shows kanji up to the higher of its
   * own level and the stage, plus kanji already started; the rest in kana,
   * as the JLPT prints them. Omit for no limit.
   */
  kanji?: { stage: string; known: string };
}

export function StudySession({
  title,
  cards: initial,
  keepGoingHref,
  source = "srs",
  doneLink = { href: "/", label: "Pick another topic" },
  kanji,
}: Props) {
  const [queue, setQueue] = useState(initial);
  const [repeats, setRepeats] = useState<Record<string, number>>({});
  const [introduced, setIntroduced] = useState<ReadonlySet<string>>(() => new Set());
  /** Which card of the current intro group is showing. */
  const [introAt, setIntroAt] = useState(0);
  const [phase, setPhase] = useState<Phase>(initial[0]?.isNew ? "intro" : "question");
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(false);
  const [shownAt, setShownAt] = useState(() => Date.now());
  const [answerMs, setAnswerMs] = useState(0);
  const [stats, setStats] = useState({ done: 0, right: 0, xp: 0, streak: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const readyAt = useRef(0);
  const settled = () => Date.now() >= readyAt.current;

  const card = queue[0];
  const remaining = queue.length;
  const group = phase === "intro" ? introGroup(queue, introduced) : [];
  /** The card on screen: during an intro group, the one being introduced. */
  const shown = group[introAt] ?? card;

  function answer(isCorrect: boolean, choice?: number) {
    if (phase !== "question" || !settled()) return;
    readyAt.current = Date.now() + TAP_GUARD_MS;
    setAnswerMs(Date.now() - shownAt);
    setCorrect(isCorrect);
    if (choice !== undefined) setPicked(choice);
    setPhase("answered");
    speak(spoken(card), card.reveal.audioUrl);
  }

  /** Next intro in the group, or (after the last) quiz the whole group. */
  function nextIntro() {
    if (!settled()) return;
    readyAt.current = Date.now() + TAP_GUARD_MS;
    if (introAt + 1 < group.length) {
      setIntroAt(introAt + 1);
      return;
    }
    setIntroduced((s) => new Set([...s, ...group.map((c) => c.key)]));
    setQueue((q) => shuffleFront(q, group.length));
    setIntroAt(0);
    setPhase("question");
    setShownAt(Date.now());
  }

  /** Save the answer and move on to the next card. */
  function save() {
    if (saving || !settled()) return;
    const current = card;
    const wasCorrect = correct;
    startSaving(async () => {
      try {
        // Practice cards are shown and scored here only; they never reach the scheduler.
        const result = current.practice
          ? { streak: stats.streak, due: "" }
          : await recordAnswer({
              itemId: current.itemId,
              cardType: current.cardType,
              correct: wasCorrect,
              msTaken: answerMs,
              given: current.options?.[picked ?? -1],
              source,
            });
        setError(null);
        setStats((s) => ({
          done: s.done + 1,
          right: s.right + (wasCorrect ? 1 : 0),
          xp: s.xp + (current.practice ? 0 : wasCorrect ? XP_CORRECT : XP_WRONG),
          streak: result.streak,
        }));
        const count = repeats[current.key] ?? 0;
        const again = !current.practice && new Date(result.due).getTime() - Date.now() < REQUEUE_WINDOW_MS && count < MAX_REPEATS;
        const rest = queue.slice(1);
        const nextQueue = again ? [...rest, { ...current, isNew: false }] : rest;
        if (again) setRepeats((r) => ({ ...r, [current.key]: count + 1 }));
        readyAt.current = Date.now() + TAP_GUARD_MS;
        setQueue(nextQueue);
        setPicked(null);
        setPhase(nextQueue[0]?.isNew && !introduced.has(nextQueue[0].key) ? "intro" : "question");
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
        {keepGoingHref && (
          // A full load (not <Link>) so the server builds the next batch instead of reusing this component's state.
          <a href={keepGoingHref} className="mt-8 rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
            Keep going
          </a>
        )}
        <Link href={doneLink.href} className="mt-3 rounded-lg border border-border px-4 py-2.5 font-medium">
          {doneLink.label}
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
        <span className="truncate px-2">
          {title} · {remaining} left
        </span>
        <span>+{stats.xp} XP</span>
      </header>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${(stats.done / (stats.done + remaining)) * 100}%` }}
        />
      </div>

      <KanjiScope
        all={!kanji || shown.itemType === "kanji" || shown.itemType === "radical"}
        level={kanji ? higherLevel(shown.level, kanji.stage) : undefined}
        known={kanji?.known}
      >
      {phase === "intro" && group.length > 0 ? (
        <Intro card={shown} position={group.length > 1 ? { at: introAt + 1, of: group.length } : null} onDone={nextIntro} />
      ) : (
        <section className="flex flex-1 flex-col">
          <p className="mt-8 text-center text-sm text-muted">
            {card.isNew ? "New · " : ""}
            {card.question}
          </p>
          <div
            className={`my-6 text-center font-bold ${
              !card.promptIsJapanese ? "text-3xl" : stripMarkup(card.prompt).length > 8 ? "text-2xl leading-loose" : "text-6xl"
            } break-words`}
            lang={card.promptIsJapanese ? "ja" : "en"}
          >
            {card.promptIsJapanese ? <Ruby text={card.prompt} reading={card.promptReading} /> : card.prompt}
          </div>

          <Choices card={card} phase={phase} picked={picked} onPick={(i) => answer(i === card.answerIndex, i)} />

          {phase === "answered" && <Feedback card={card} correct={correct} />}

          <div className="action-bar mt-auto pt-6">
            {error && <p className="mb-2 text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
            {phase === "answered" && (
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
      </KanjiScope>
    </main>
  );
}

function Intro({ card, position, onDone }: { card: StudyCard; position: { at: number; of: number } | null; onDone: () => void }) {
  const r = card.reveal;
  // Kanji above this stage: say so (the exam prints these with furigana).
  const aboveStage = !kanjiAllowed(stripMarkup(r.term), useKanjiAllowance());
  return (
    <section className="flex flex-1 flex-col">
      <p className="mt-8 text-center text-sm font-medium text-accent">
        New item{position ? ` ${position.at} of ${position.of}` : ""}
      </p>
      <button
        onClick={() => speak(spoken(card), r.audioUrl)}
        className="my-4 text-center text-6xl font-bold"
        lang="ja"
        aria-label={`Play ${r.term}`}
      >
        <Ruby text={r.term} reading={r.reading} />
      </button>
      <dl className="space-y-3 rounded-xl border border-border bg-card p-4">
        {kanjiReadings(r) ? (
          <div>
            <dt className="text-xs text-muted">Readings</dt>
            <dd className="text-lg" lang="ja">
              {kanjiReadings(r)}
            </dd>
          </div>
        ) : (
          (plainReading(r.reading) || r.romaji) && (
            <div>
              <dt className="text-xs text-muted">{card.itemType === "radical" ? "Name" : "Reading"}</dt>
              <dd className="text-lg" lang="ja">
                {[plainReading(r.reading), r.romaji].filter(Boolean).join(" · ")}
              </dd>
            </div>
          )
        )}
        <div>
          <dt className="text-xs text-muted">Meaning</dt>
          <dd className="text-lg">{r.meaning}</dd>
        </div>
        {aboveStage && (
          <p className="text-sm text-muted">Its kanji come later: at this level the exam prints them with furigana, so learn the word by its reading for now.</p>
        )}
        {r.mnemonic && (
          <div>
            <dt className="text-xs text-muted">Memory hint</dt>
            <dd>{r.mnemonic}</dd>
          </div>
        )}
        {card.itemType === "kanji" && groupsWith(r.term).length > 0 && (
          <div>
            <dt className="text-xs text-muted">Compare with</dt>
            <dd className="flex flex-wrap gap-2">
              {groupsWith(r.term).map((g) => (
                <Link key={g.slug} href={`/kanji/${g.slug}`} className="text-accent underline" lang="ja">
                  {g.kanji.join(" ")}
                </Link>
              ))}
            </dd>
          </div>
        )}
        {r.example && (
          <div>
            <dt className="text-xs text-muted">Example</dt>
            <dd className="text-lg">
              <Ruby text={r.example.jp} reading={r.example.reading} />
            </dd>
            <dd className="text-sm text-muted">{r.example.en}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 text-center text-xs text-muted">Tap the character to hear it.</p>
      <div className="action-bar mt-auto pt-6">
        <button onClick={onDone} className="w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-medium text-white">
          {!position || position.at === position.of ? (position ? `Got them, quiz me on these ${position.of}` : "Got it, quiz me") : "Next new item"}
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
            <Ruby text={option} />
          </button>
        );
      })}
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
        <button onClick={() => speak(spoken(card), r.audioUrl)} className="font-bold underline decoration-dotted">
          <Ruby text={r.term} reading={r.reading} />
        </button>
        {kanjiReadings(r)
          ? ` · ${kanjiReadings(r)}`
          : [plainReading(r.reading), r.romaji].filter(Boolean).length > 0 && ` · ${[plainReading(r.reading), r.romaji].filter(Boolean).join(" · ")}`}
      </p>
      <p className="text-sm">{r.meaning}</p>
      {r.mnemonic && !correct && <p className="mt-2 text-sm text-muted">💡 {r.mnemonic}</p>}
    </div>
  );
}

/** A kanji's readings on one line: 音 (on) and 訓 (kun). */
function kanjiReadings(r: StudyCard["reveal"]): string | null {
  if (!r.readings) return null;
  return [r.readings.on.length ? `音 ${r.readings.on.join("・")}` : "", r.readings.kun.length ? `訓 ${r.readings.kun.join("・")}` : ""]
    .filter(Boolean)
    .join("　");
}

/** What to say aloud: a radical's name (the character alone has no sound), otherwise the term. */
function spoken(card: StudyCard): string {
  return card.itemType === "radical" && card.reveal.reading ? card.reveal.reading.split("・")[0] : card.reveal.term;
}

/** A reading worth printing on its own line: plain kana, not the ruby markup that sentences carry. */
function plainReading(reading: string | null): string | null {
  return reading && !isMarkup(reading) ? reading : null;
}
