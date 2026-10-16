"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  keepAwake,
  loadVoices,
  pickJapaneseVoice,
  japaneseVoice,
  say,
  setShadowGap,
  setSpeechRate,
  shadowGap,
  speechRate,
  stopSpeaking,
  voicesFor,
} from "@/lib/newcomer/voice";
import { Japanese, MeaningToggle, ScriptToggle, useMeaningLang } from "../ui";

export interface Track {
  jp: string;
  kana: string;
  reading: string;
  meaning: string;
  meaningMs: string | null;
  /** The language the learner wrote it in (their own phrases); null for starter phrases. */
  lang: "en" | "ms" | null;
}

type Step = "jp" | "shadow" | "meaning";

/**
 * Japanese → silence to shadow it (as long as the phrase took, plus the gap)
 * → the meaning. No grading: this is for hearing and saying, over and over.
 */
export function PlaylistClient({ title, tracks, starter }: { title: string; tracks: Track[]; starter: boolean }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState<Step | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState("");
  // Read from the phone's storage; the settings panel that shows them starts closed, so hydration agrees.
  const [rate, setRate] = useState(() => (typeof window === "undefined" ? 0.85 : speechRate()));
  const [gap, setGap] = useState(() => (typeof window === "undefined" ? 2 : shadowGap()));
  const [sayMeaning, setSayMeaning] = useState(true);
  const [settings, setSettings] = useState(false);
  const [meaningLang] = useMeaningLang();
  const run = useRef(0);
  const release = useRef<(() => void) | null>(null);
  const prefs = useRef({ gap, sayMeaning, meaningLang });
  useEffect(() => {
    prefs.current = { gap, sayMeaning, meaningLang };
  }, [gap, sayMeaning, meaningLang]);

  useEffect(() => {
    const runs = run;
    const lock = release;
    void loadVoices().then((v) => {
      setVoices(v);
      setVoiceName(japaneseVoice(v)?.name ?? "");
    });
    return () => {
      runs.current++;
      stopSpeaking();
      lock.current?.();
    };
  }, []);

  // The phone drops the wake lock when the page is hidden; take it again on return.
  useEffect(() => {
    const again = async () => {
      if (document.visibilityState === "visible" && playing) {
        release.current?.();
        release.current = await keepAwake();
      }
    };
    document.addEventListener("visibilitychange", again);
    return () => document.removeEventListener("visibilitychange", again);
  }, [playing]);

  const jaVoices = voicesFor(voices, "ja");
  const hasMalay = voicesFor(voices, "ms").length > 0;

  async function playFrom(start: number) {
    const token = ++run.current;
    const alive = () => run.current === token;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ms);
        const check = setInterval(() => !alive() && (clearTimeout(t), clearInterval(check), resolve()), 100);
        setTimeout(() => clearInterval(check), ms + 50);
      });
    setPlaying(true);
    release.current?.();
    release.current = await keepAwake();
    for (let i = start; alive(); i = (i + 1) % tracks.length) {
      const t = tracks[i];
      setIndex(i);
      setStep("jp");
      const took = await say(t.jp, "ja", voices);
      if (!alive()) return;
      setStep("shadow");
      await wait(took + prefs.current.gap * 1000);
      if (!alive()) return;
      setStep("meaning");
      if (prefs.current.sayMeaning) {
        const ms = t.lang === null && prefs.current.meaningLang === "ms" && t.meaningMs;
        await say(ms ? t.meaningMs! : t.meaning, ms ? "ms" : (t.lang ?? "en"), voices);
      }
      if (!alive()) return;
      await wait(1200);
    }
  }

  function pause() {
    run.current++;
    stopSpeaking();
    setPlaying(false);
    setStep(null);
    release.current?.();
    release.current = null;
  }

  const go = (i: number) => {
    const next = (i + tracks.length) % tracks.length;
    if (playing) void playFrom(next);
    else setIndex(next);
  };

  if (tracks.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted">No phrases to play yet.</p>
        <Link href="/newcomer/phrases" className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-white">
          Add your phrases
        </Link>
      </div>
    );
  }

  const t = tracks[index];
  const meaning = t.lang === null && meaningLang === "ms" && t.meaningMs ? t.meaningMs : t.meaning;
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col">
      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span>
          {title} · {index + 1}/{tracks.length}
        </span>
        <span className="flex gap-2">
          {starter && <MeaningToggle />}
          <ScriptToggle />
        </span>
      </div>

      <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center">
        <Japanese kana={t.kana} jp={t.jp} reading={t.reading} className={`text-3xl ${step === "jp" ? "text-accent" : ""}`} />
        <div className={`mt-6 text-lg transition-opacity ${step === "meaning" || !playing ? "opacity-100" : "opacity-0"}`}>{meaning}</div>
        <div className="mt-6 h-6 text-sm font-medium text-accent">
          {step === "jp" ? "Listen" : step === "shadow" ? "Your turn: say it" : step === "meaning" ? "Meaning" : ""}
        </div>
      </div>

      {settings && (
        <div className="mt-3 space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
          <label className="block">
            Japanese voice
            <select
              value={voiceName}
              onChange={(e) => {
                setVoiceName(e.target.value);
                pickJapaneseVoice(e.target.value);
              }}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2"
            >
              {jaVoices.length === 0 && <option value="">No Japanese voice on this device</option>}
              {jaVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-muted">
              For a male voice on iPhone: Settings → Accessibility → Spoken Content → Voices → Japanese → download Otoya (Enhanced), then reopen this page.
            </span>
          </label>
          <label className="block">
            Speed {rate.toFixed(2)}×
            <input
              type="range"
              min={0.6}
              max={1.1}
              step={0.05}
              value={rate}
              onChange={(e) => {
                setRate(Number(e.target.value));
                setSpeechRate(Number(e.target.value));
              }}
              className="w-full"
            />
          </label>
          <label className="block">
            Shadow pause: the phrase&apos;s length + {gap}s
            <input
              type="range"
              min={0}
              max={6}
              step={0.5}
              value={gap}
              onChange={(e) => {
                setGap(Number(e.target.value));
                setShadowGap(Number(e.target.value));
              }}
              className="w-full"
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sayMeaning} onChange={(e) => setSayMeaning(e.target.checked)} className="h-5 w-5" />
            Say the meaning aloud
          </label>
          {!hasMalay && (starter ? meaningLang === "ms" : tracks.some((x) => x.lang === "ms")) && (
            <p className="text-xs text-muted">No Malay voice found. On iPhone, download Amira under Spoken Content → Voices → Malay.</p>
          )}
        </div>
      )}

      <div className="sticky bottom-0 mt-3 bg-background pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go(index - 1)} className="rounded-xl border border-border px-5 py-4 text-lg" aria-label="Previous">
            ⏮
          </button>
          <button
            type="button"
            onClick={() => (playing ? pause() : void playFrom(index))}
            className="flex-1 rounded-xl bg-accent py-4 text-lg font-semibold text-white"
          >
            {playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <button type="button" onClick={() => go(index + 1)} className="rounded-xl border border-border px-5 py-4 text-lg" aria-label="Next">
            ⏭
          </button>
          <button
            type="button"
            onClick={() => setSettings((s) => !s)}
            className={`rounded-xl border px-4 py-4 text-lg ${settings ? "border-accent" : "border-border"}`}
            aria-label="Voice and timing"
          >
            ⚙
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-muted">Keeps the screen on while playing. Loops until you pause.</p>
      </div>
    </div>
  );
}
