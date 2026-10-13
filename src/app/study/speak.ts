/** Play the item's recorded audio, or fall back to the browser's Japanese voice. */
export function speak(text: string, audioUrl?: string | null) {
  if (audioUrl) {
    void new Audio(audioUrl).play().catch(() => speakWithBrowser(text));
    return;
  }
  speakWithBrowser(text);
}

function speakWithBrowser(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.9;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("ja"));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
