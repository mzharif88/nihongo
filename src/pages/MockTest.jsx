import { useState, useEffect } from 'react'
import { MOCK_QUESTIONS, JLPT_LEVELS, JLPT_META } from '../data/content'
import { Confetti } from '../lib/celebrate'

const SECTIONS = ['Vocabulary', 'Grammar', 'Reading', 'Listening']

export default function MockTest({ onBack }) {
  const [level, setLevel]     = useState(null)
  const [qIdx, setQIdx]       = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [done, setDone]       = useState(false)

  useEffect(() => {
    if (!level || done) return
    const secs = (JLPT_META[level]?.time || 50) * 60
    setTimeLeft(secs)
    const t = setInterval(() => setTimeLeft(s => { if (s <= 1) { setDone(true); return 0 } return s - 1 }), 1000)
    return () => clearInterval(t)
  }, [level])

  const questions = level ? MOCK_QUESTIONS[level] : []
  const q = questions[qIdx]

  function fmt(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}` }

  function handleSelect(i) {
    if (selected !== null) return
    setSelected(i)
  }

  function handleNext() {
    setAnswers(a => [...a, { q, selected }])
    if (qIdx + 1 >= questions.length) { setDone(true); return }
    setQIdx(i => i + 1)
    setSelected(null)
  }

  function restart() { setLevel(null); setQIdx(0); setSelected(null); setAnswers([]); setDone(false) }

  // Level select screen
  if (!level) return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="page-title">JLPT Mock Tests 📝</div>
      <div className="page-sub">Timed exam simulations — section-by-section scoring, pass/fail verdict</div>

      <div className="grid-5" style={{ marginBottom: 32 }}>
        {JLPT_LEVELS.map(lv => (
          <div key={lv} className="card" style={{ padding: 20, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
            onClick={() => setLevel(lv)}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 32, fontWeight: 900, color: 'var(--red)', marginBottom: 6 }}>{lv}</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{JLPT_META[lv].label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>
              {JLPT_META[lv].vocab}<br />{JLPT_META[lv].time} min
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div className="section-label">— How It Works</div>
        <div className="grid-2">
          {[
            { icon: '📚', t: '4 Sections', d: 'Vocabulary · Grammar · Reading · Listening' },
            { icon: '⏱️', t: 'Real Timing', d: '50 min (N5) up to 110 min (N1)' },
            { icon: '📊', t: 'Score Report', d: 'Section breakdown + pass/fail at 60% threshold' },
            { icon: '🔁', t: 'Retake Freely', d: 'Track improvement across multiple attempts' },
          ].map(x => (
            <div key={x.t} style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 20 }}>{x.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{x.t}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'DM Mono', monospace" }}>{x.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Results screen
  if (done) {
    const correct = answers.filter(a => a.selected === a.q.answer).length
    const total   = answers.length || questions.length
    const pct     = Math.round((correct / total) * 100)
    const passed  = pct >= 60

    const sectionScores = SECTIONS.map(sec => {
      const sqs = answers.filter(a => a.q.section === sec)
      const sc  = sqs.filter(a => a.selected === a.q.answer).length
      return { sec, sc, total: sqs.length }
    })

    return (
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
        {passed && <Confetti count={170} duration={3500} />}
        <div className="card pop-in" style={{ padding: 40, textAlign: 'center' }}>
          <div className={passed ? 'celebrate-burst' : ''} style={{ fontSize: passed ? 80 : 64, marginBottom: 12 }}>{passed ? '🎌' : '📚'}</div>
          <div style={{ fontSize: 14, color: 'var(--red)', fontWeight: 800, marginBottom: 8 }}>JLPT {level} Mock Test</div>
          <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 52, fontWeight: 900, marginBottom: 8 }}>{pct}%</div>
          <div style={{ display: 'inline-block', fontSize: 18, fontWeight: 900, color: '#fff', background: passed ? 'var(--grad-mint)' : 'linear-gradient(135deg,#FF5A5F,#7f1d2d)', padding: '8px 24px', borderRadius: 999, marginBottom: 32 }}>
            {passed ? '✅ PASSED!' : '💪 Keep Studying'}
          </div>

          <div className="grid-2" style={{ marginBottom: 32, textAlign: 'left' }}>
            {sectionScores.map(({ sec, sc, total: t }) => (
              <div key={sec} className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'DM Mono', monospace", marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{sec}</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{t > 0 ? `${sc}/${t}` : '—'}</div>
                {t > 0 && <div className="progress-bar" style={{ marginTop: 8 }}><div className="progress-fill" style={{ width: `${Math.round((sc/t)*100)}%` }} /></div>}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'DM Mono', monospace", marginBottom: 24 }}>
            Pass threshold: 60% · Your score: {correct}/{total} correct
          </div>

          <div className="flex" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={restart}>Back to Level Select</button>
            <button className="btn btn-secondary" onClick={onBack}>Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  // Test screen
  const timeColor = timeLeft < 300 ? 'var(--red)' : 'var(--gold)'
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: timeColor }}>⏱️ {fmt(timeLeft)}</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--muted)' }}>{qIdx + 1}/{questions.length} · JLPT {level}</div>
        <div style={{ background: 'var(--red-dim)', color: 'var(--red)', fontSize: 11, padding: '4px 10px', borderRadius: 2, fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: 'uppercase' }}>{q.section}</div>
      </div>

      <div className="card" style={{ padding: 32, marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5, fontFamily: "'Noto Serif JP', serif" }}>{q.q}</div>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        {q.options.map((opt, i) => {
          let borderColor = 'var(--border)', color = 'var(--text)', bg = 'var(--bg3)'
          if (selected !== null) {
            if (i === q.answer)   { borderColor = 'var(--green)'; color = '#4ade80'; bg = 'rgba(22,163,74,0.12)' }
            if (i === selected && i !== q.answer) { borderColor = 'var(--red)'; color = '#f87171'; bg = 'rgba(220,38,38,0.1)' }
          }
          return (
            <div key={i} onClick={() => handleSelect(i)}
              style={{ background: bg, border: `1px solid ${borderColor}`, color, padding: 16, borderRadius: 8, cursor: selected ? 'default' : 'pointer', fontSize: 15, fontWeight: 600, transition: 'all 0.15s' }}>
              {opt}
            </div>
          )
        })}
      </div>

      {selected !== null && (
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }} onClick={handleNext}>
          {qIdx + 1 >= questions.length ? 'See Results' : 'Next Question →'}
        </button>
      )}
    </div>
  )
}
