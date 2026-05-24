let voices = []

if (typeof window !== 'undefined') {
  window.speechSynthesis.onvoiceschanged = () => {
    voices = window.speechSynthesis.getVoices()
  }
}

export function speak(text, rate = 0.85) {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = rate
  if (!voices.length) voices = window.speechSynthesis.getVoices()
  const jpVoice = voices.find(v => v.lang.startsWith('ja'))
  if (jpVoice) u.voice = jpVoice
  window.speechSynthesis.speak(u)
}
