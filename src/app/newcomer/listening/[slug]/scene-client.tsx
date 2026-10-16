"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Scene } from "@/lib/newcomer/listening";
import { japaneseVoice, keepAwake, loadVoices, otherJapaneseVoice, say, stopSpeaking } from "@/lib/newcomer/voice";
import { recordListen } from "../../actions";
import { Japanese, MeaningToggle, ScriptToggle, useMeaningLang } from "../../ui";

type Phase = "listen" | "question" | "read";

const PAUSE_BETWEEN_LINES = 700;

/** Listen with no text → one gist question → the transcript, line by line. */
export function SceneClient({ scene, nextSlug }: { scene: Scene; nextSlug: string | null }) {
  const [phase, setPhase] = useState<Phase>("listen");
  const [playing, setPlaying] = useState<number | null>(null);
  const [heard, setHeard] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [meanings, setMeanings] = useState(false);
  const [lang] = useMeaningLang();
  const voices = useRef<SpeechSynthesisVoice[]>([]);
  const run = useRef(0);

  useEffect(() => {
    void loadVoices().then((v) => (voices.current = v));
    const runs = run;
    return () => {
      runs.current++;
      stopSpeaking();
    };
  }, []);

  const voiceFor = (speaker: "A" | "B") => (speaker === "B" ? otherJapaneseVoice(voices.current) : undefined) ?? japaneseVoice(voices.current);

  async function playAll() {
    const token = ++run.current;
    const release = await keepAwake();
    for (let i = 0; i < scene.lines.length && run.current === token; i++) {
      setPlaying(i);
      await say(scene.lines[i].jp, "ja", voices.current, voiceFor(scene.lines[i].speaker));
      await new Promise((r) => setTimeout(r, PAUSE_BETWEEN_LINES));
    }
    release?.();
    if (run.current !== token) return;
    setPlaying(null);
    setHeard((n) => n + 1);
    void recordListen({ slug: scene.slug }).catch(() => {});
  }

  async function playLine(i: number) {
    ++run.current;
    setPlaying(i);
    await say(scene.lines[i].jp, "ja", voices.current, voiceFor(scene.lines[i].speaker));
    setPlaying((p) => (p === i ? null : p));
  }

  function stop() {
    run.current++;
    stopSpeaking();
    setPlaying(null);
  }

  const q = scene.question;
  const text = (x: { en: string; ms: string }) => (lang === "ms" ? x.ms : x.en);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <Link href="/newcomer/listening" className="underline">
          ← Scenes
        </Link>
        <span className="flex gap-2">
          <MeaningToggle />
          {phase === "read" && <ScriptToggle />}
        </span>
      </div>
      <h1 className="mt-3 text-xl font-bold">{scene.title}</h1>
      <p className="mt-1 text-sm text-muted">{scene.setting}</p>

      {phase === "listen" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="text-6xl">{playing !== null ? "🔊" : "🎧"}</div>
          <p className="mt-4 text-sm text-muted">
            {playing !== null
              ? `Listening… ${playing + 1}/${scene.lines.length}`
              : heard
                ? "Again, or answer when you're ready."
                : "No text yet. Just listen and catch what you can."}
          </p>
        </div>
      )}

      {phase === "question" && (
        <div className="mt-6 flex-1">
          <p className="font-medium">{text(q)}</p>
          <div className="mt-3 space-y-2">
            {q.options.map((o, i) => {
              const state = picked === null ? "" : i === q.answer ? "border-green-600 bg-green-600/10" : i === picked ? "border-red-600 bg-red-600/10" : "opacity-60";
              return (
                <button
                  key={i}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => {
                    setPicked(i);
                    void recordListen({ slug: scene.slug, gistCorrect: i === q.answer }).catch(() => {});
                  }}
                  className={`w-full rounded-xl border border-border bg-card p-3 text-left ${state}`}
                >
                  {text(o)}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <p className={`mt-3 text-sm ${picked === q.answer ? "text-green-700 dark:text-green-400" : "text-muted"}`}>
              {picked === q.answer ? "You caught it." : "Not quite. Read along and listen again."}
            </p>
          )}
        </div>
      )}

      {phase === "read" && (
        <div className="mt-4 flex-1 space-y-2">
          {scene.lines.map((l, i) => (
            <button
              key={i}
              type="button"
              onClick={() => void playLine(i)}
              className={`flex w-full gap-3 rounded-xl border bg-card p-3 text-left ${playing === i ? "border-accent" : "border-border"}`}
            >
              <span className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-white ${l.speaker === "A" ? "bg-accent" : "bg-indigo-600"}`}>
                {l.speaker}
              </span>
              <span className="min-w-0">
                <Japanese kana={l.kana} jp={l.jp} reading={l.reading} className="block text-lg" />
                {meanings && <span className="block text-sm text-muted">{text(l)}</span>}
              </span>
            </button>
          ))}
          <button type="button" onClick={() => setMeanings((m) => !m)} className="text-sm text-muted underline">
            {meanings ? "Hide meanings" : "Show meanings"}
          </button>
        </div>
      )}

      <div className="sticky bottom-0 mt-4 bg-background pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {phase === "listen" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (playing !== null ? stop() : void playAll())}
              className={`flex-1 rounded-xl py-4 text-lg font-semibold ${heard ? "border border-border" : "bg-accent text-white"}`}
            >
              {playing !== null ? "■ Stop" : heard ? "▶ Again" : "▶ Listen"}
            </button>
            {heard > 0 && playing === null && (
              <button type="button" onClick={() => setPhase("question")} className="flex-1 rounded-xl bg-accent py-4 text-lg font-semibold text-white">
                Answer
              </button>
            )}
          </div>
        )}
        {phase === "question" && (
          <button
            type="button"
            disabled={picked === null}
            onClick={() => setPhase("read")}
            className="w-full rounded-xl bg-accent py-4 text-lg font-semibold text-white disabled:opacity-40"
          >
            Read it
          </button>
        )}
        {phase === "read" && (
          <div className="flex gap-2">
            <button type="button" onClick={() => (playing !== null ? stop() : void playAll())} className="flex-1 rounded-xl border border-border py-4 text-lg font-semibold">
              {playing !== null ? "■ Stop" : "▶ Play all"}
            </button>
            <Link
              href={nextSlug ? `/newcomer/listening/${nextSlug}` : "/newcomer/listening"}
              className="flex flex-1 items-center justify-center rounded-xl bg-accent py-4 text-lg font-semibold text-white"
            >
              {nextSlug ? "Next scene" : "Done"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
