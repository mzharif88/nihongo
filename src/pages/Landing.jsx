import { useAuth } from '../hooks/useAuth'

const FEATURES = [
  { icon: '🃏', title: 'SRS Flashcards',     color: 'var(--blue)',   desc: 'Spaced repetition shows weak cards more often — proven science for long-term retention.' },
  { icon: '🎮', title: 'Gamified XP',         color: 'var(--gold)',   desc: 'Earn XP, maintain daily streaks, unlock new levels, and climb the weekly leaderboard.' },
  { icon: '📝', title: 'JLPT Mock Tests',     color: 'var(--red)',    desc: 'Full timed simulations N5–N1 with section-by-section score breakdown and pass/fail verdict.' },
  { icon: '🔊', title: 'Native Audio',        color: 'var(--green)',  desc: 'Every character and word pronounced by native Japanese TTS — train your ear from day one.' },
  { icon: '🏆', title: 'Badges & Goals',      color: 'var(--purple)', desc: 'Earn 15+ badges from "First Steps" to "N1 Champion" as you hit real milestones.' },
  { icon: '📺', title: 'Resources Hub',       color: 'var(--pink)',   desc: 'Curated podcasts and YouTube channels organized by your proficiency level.' },
]

export default function Landing() {
  const { signInWithGoogle } = useAuth()

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 50%, rgba(220,38,38,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(217,119,6,0.06) 0%, transparent 50%)', pointerEvents: 'none' }} />

      {/* Decorative kanji */}
      <div style={{ position: 'absolute', right: '3%', top: '42%', transform: 'translateY(-50%)', fontFamily: "'Noto Serif JP', serif", fontSize: '300px', fontWeight: 900, color: 'rgba(255,255,255,0.025)', lineHeight: 0.85, pointerEvents: 'none', userSelect: 'none' }}>日本</div>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 640 }}>
        <div style={{ display: 'inline-block', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gold)', background: 'rgba(255,178,62,0.12)', border: '1px solid var(--gold-dim)', padding: '6px 16px', borderRadius: 999, marginBottom: 24, fontWeight: 800 }}>
          ✨ JLPT N5 → N1 · Complete Mastery Path
        </div>

        <h1 style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 'clamp(52px, 9vw, 92px)', fontWeight: 900, lineHeight: 0.95, marginBottom: 8, letterSpacing: -2 }}>
          日本<span className="go" style={{ fontFamily: 'var(--font)', fontStyle: 'italic', background: 'var(--grad-fun)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', display: 'inline-block', transform: 'rotate(-4deg)' }}>GO!</span>
        </h1>

        <p style={{ fontSize: 17, color: 'var(--muted)', margin: '20px 0 40px', lineHeight: 1.6, fontWeight: 600 }}>
          Master Japanese with <strong style={{ color: 'var(--text)' }}>spaced-repetition flashcards</strong>, gamified quizzes,<br />
          and JLPT mock tests — built to get you to <strong style={{ color: 'var(--green)' }}>real fluency</strong>. 🎌
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 48, flexWrap: 'wrap' }}>
          {[['92', 'Kana chars', 'var(--blue)'], ['2,000+', 'Kanji', 'var(--gold)'], ['5', 'JLPT levels', 'var(--green)'], ['15+', 'Badges', 'var(--purple)']].map(([n, l, c]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: c, letterSpacing: -1 }}>{n}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button className="btn btn-primary" onClick={signInWithGoogle} style={{ fontSize: 15, padding: '14px 36px' }}>
          <GoogleIcon /> Continue with Google
        </button>
      </div>

      {/* Feature grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 72, maxWidth: 900, width: '100%', position: 'relative', zIndex: 1 }}>
        {FEATURES.map((f, i) => (
          <div key={f.title} className="card module-card slide-up" style={{ padding: 22, animationDelay: `${i * 0.08}s`, borderTop: `3px solid ${f.color}` }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, fontWeight: 600 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
    </svg>
  )
}
