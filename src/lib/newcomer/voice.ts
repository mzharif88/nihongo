// Newcomer audio: the phone's own voices (on iPhone, download Otoya or
// Kyoko in Settings → Accessibility → Spoken Content → Voices → Japanese).
// Speech is awaited, so the playlist can time its shadowing gap to how
// long each phrase actually took to say.

export type VoiceLang = "ja" | "en" | "ms";

const STORAGE = { ja: "nc-voice-ja", rate: "nc-rate", gap: "nc-gap" } as const;

export function storedGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function storedSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or storage blocked: the choice just isn't remembered.
  }
}

/** The voices, once the browser has loaded them (iOS fills the list a moment after load). */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
}

const LANG_PREFIX: Record<VoiceLang, string> = { ja: "ja", en: "en", ms: "ms" };

export const voicesFor = (voices: SpeechSynthesisVoice[], lang: VoiceLang) =>
  voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(LANG_PREFIX[lang]));

/** The Japanese voice: the learner's pick, else Otoya, else Kyoko, else any Japanese voice. */
export function japaneseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const ja = voicesFor(voices, "ja");
  const picked = storedGet(STORAGE.ja);
  return (
    ja.find((v) => v.name === picked) ??
    ja.find((v) => /otoya/i.test(v.name) && /enhanced|premium/i.test(v.name)) ??
    ja.find((v) => /otoya/i.test(v.name)) ??
    ja.find((v) => /kyoko/i.test(v.name)) ??
    ja[0]
  );
}

export const pickJapaneseVoice = (name: string) => storedSet(STORAGE.ja, name);

/** Speaking rate for Japanese (0.6–1.1); a little slow by default, for shadowing. */
export const speechRate = () => Math.min(1.1, Math.max(0.6, Number(storedGet(STORAGE.rate)) || 0.85));
export const setSpeechRate = (rate: number) => storedSet(STORAGE.rate, String(rate));

/** Extra seconds of silence after the phrase's own length, for shadowing. */
export const shadowGap = () => Math.min(8, Math.max(0, Number(storedGet(STORAGE.gap) ?? 2) || 0));
export const setShadowGap = (seconds: number) => storedSet(STORAGE.gap, String(seconds));

/**
 * Say `text` and resolve with how long it took, in ms. Resolves early (with
 * the time so far) if stopped. A rough length is used if the browser never
 * reports the end, which some iOS versions occasionally skip.
 */
export async function say(text: string, lang: VoiceLang, voices?: SpeechSynthesisVoice[]): Promise<number> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return 0;
  const list = voices ?? (await loadVoices());
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "ja" ? "ja-JP" : lang === "ms" ? "ms-MY" : "en-US";
  const voice = lang === "ja" ? japaneseVoice(list) : voicesFor(list, lang)[0];
  if (voice) u.voice = voice;
  u.rate = lang === "ja" ? speechRate() : 1;
  window.speechSynthesis.cancel();
  const start = performance.now();
  return new Promise((resolve) => {
    const limit = 2000 + text.length * (lang === "ja" ? 350 : 120) / u.rate;
    const timer = setTimeout(finish, limit);
    function finish() {
      clearTimeout(timer);
      u.onend = u.onerror = null;
      resolve(performance.now() - start);
    }
    u.onend = finish;
    u.onerror = finish;
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Keep the screen on while audio plays (the phone stops speech when it locks). */
export async function keepAwake(): Promise<(() => void) | null> {
  const wl = (navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock;
  if (!wl) return null;
  try {
    const lock = await wl.request("screen");
    return () => void lock.release().catch(() => {});
  } catch {
    return null;
  }
}
