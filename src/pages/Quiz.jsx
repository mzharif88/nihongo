import { useState } from 'react'
import { MODULES, MODULE_META } from '../data/content'
import { speak } from '../lib/audio'
import { Confetti } from '../lib/celebrate'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuestions(cards) {
  const shuffled = shuffle(cards).slice(0, Math.min(cards.length, 10))
  return shuffled.map(card => {
    const others = cards.filter(x => x.character !== card.character)
    const wrong  = shuffle(others).slice(0, 3).map(x => x.english)
    const opts   = shuffle([...wrong, card.english])
    return { card, options: opts, answer: opts.indexOf(card.english) }
  })
}

export default function Quiz({ module: mod, level, onBack, onXPEarned }) {
  const allCards = MODULES[mod]?.[level] || []
  const [questions] = useState(() => buildQuestions(allCards))
  const [qIdx, setQIdx]         = useState(0)
  const [selected, setSelected] = useState(null)
  const [hearts, setHearts]     = useState(5)
  const [score, setScore]       = useState(0)
  const [done, setDone]         = useState(false)

  if (!questions.length) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 32 }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="empty"><div className="empty-icon">🚧</div>No cards available for this level yet.</div>
    </div>
  )

  const q = questions[qIdx]

  function handleSelect(i) {
    if (selected !== null) return
    setSelected(i)
    if (i === q.answer) setScore(s => s + 1)
    else setHearts(h => Math.max(0, h - 1))
    speak(q.card.character)
  }

  function handleNext() {
    if (qIdx + 1 >= questions.length || hearts === 0) { setDone(true); return }
    setQIdx(i => i + 1)
    setSelected(null)
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100)
    const xp  = score * 15 + (pct === 100 ? 50 : 0)
    onXPEarned?.({ xp, module: mod, level, quizPerfect: pct === 100 })
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 32 }}>
        {pct >= 60 && <Confetti count={pct >= 80 ? 160 : 90} />}
        <div className="card pop-in" style={{ padding: 48, textAlign: 'center' }}>
          <div className="celebrate-burst" style={{ marginBottom: 12 }}>{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'}</div>
          <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 30, fontWeight: 900, marginBottom: 4 }}>{score} / {questions.length}</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 700, marginBottom: 12 }}>Accuracy: {pct}%</div>
          <div style={{ display: 'inline-block', fontSize: 18, fontWeight: 900, color: '#fff', background: 'var(--grad-fun)', padding: '8px 24px', borderRadius: 999, marginBottom: 32, boxShadow: '0 6px 20px rgba(255,90,95,0.4)' }}>+{xp} XP earned! ⚡</div>
          <div className="flex" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setQIdx(0); setSelected(null); setHearts(5); setScore(0); setDone(false) }}>Try Again</button>
            <button className="btn btn-secondary" onClick={onBack}>Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ fontSize: 18 }}>{i < hearts ? '❤️' : '🖤'}</span>)}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--gold)' }}>Score: {score}/{qIdx + 1}</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>{qIdx + 1}/{questions.length}</div>
      </div>
      <div className="card" style={{ padding: 32, marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--red)', marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>
          Recognition · {MODULE_META[mod].label} {level}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>What does this mean?</div>
        <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 80, fontWeight: 900, textAlign: 'center', margin: '16px 0', lineHeight: 1 }}>{q.card.character}</div>
        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-icon" style={{ fontSize: 13 }} onClick={() => speak(q.card.character)}>🔊 Play Audio</button>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 16 }}>
        {q.options.map((opt, i) => {
          let borderColor = 'var(--border)', color = 'var(--text)', bg = 'var(--bg3)'
          if (selected !== null) {
            if (i === q.answer) { borderColor = 'var(--green)'; color = '#4ade80'; bg = 'rgba(22,163,74,0.12)' }
            if (i === selected && i !== q.answer) { borderColor = 'var(--red)'; color = '#f87171'; bg = 'rgba(220,38,38,0.1)' }
          }
          return (
            <div key={i} onClick={() => handleSelect(i)}
              style={{ background: bg, border: `1px solid ${borderColor}`, color, padding: 16, borderRadius: 8, cursor: selected ? 'default' : 'pointer', fontSize: 15, fontWeight: 600, textAlign: 'center', transition: 'all 0.15s' }}>
              {opt}
            </div>
          )
        })}
      </div>
      {selected !== null && (
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }} onClick={handleNext}>
          {qIdx + 1 >= questions.length || hearts === 0 ? 'See Results' : 'Next →'}
        </button>
      )}
    </div>
  )
}
