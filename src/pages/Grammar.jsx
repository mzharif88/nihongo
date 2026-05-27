import { useState, useEffect, useRef } from 'react'
import { GRAMMAR_COLLECTIONS, ALL_GRAMMAR } from '../data/index.js'
import { Confetti } from '../lib/celebrate'

function GrammarCard({ item, onAnswer }) {
  const [selected, setSelected] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)

  const correct = selected === item.answer
  const answered = selected !== null

  function handleSelect(i) {
    if (answered) return
    setSelected(i)
    setTimeout(() => setShowExplanation(true), 300)
  }

  // Parse sentence — replace ___ with a blank display
  const parts = item.sentence.split('___')

  return (
    <div>
      {/* Grammar point label */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--purple)', marginBottom: 12 }}>
        📐 {item.point}
      </div>

      {/* Sentence with blank */}
      <div className="card" style={{ padding: '24px 20px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, marginBottom: 14 }}>
          Fill in the blank:
        </div>
        <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 22, fontWeight: 700, lineHeight: 1.8, letterSpacing: 1 }}>
          {parts[0]}
          <span className={`grammar-blank ${answered ? (correct ? 'correct' : 'wrong') : ''}`}>
            {answered ? item.options[selected] : '　　'}
          </span>
          {parts[1] || ''}
        </div>
        {item.hint && !answered && (
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 12, fontStyle: 'italic' }}>
            💭 Hint: {item.hint}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="grid-2" style={{ marginBottom: 14 }}>
        {item.options.map((opt, i) => {
          let bg = 'var(--bg3)', border = 'var(--border)', color = 'var(--text)'
          if (answered) {
            if (i === item.answer)              { bg = 'rgba(52,211,153,0.12)'; border = 'var(--green)'; color = 'var(--green)' }
            if (i === selected && !correct)     { bg = 'rgba(255,90,95,0.10)'; border = 'var(--red)'; color = 'var(--red)' }
          }
          return (
            <div key={i} onClick={() => handleSelect(i)}
              style={{ background: bg, border: `2px solid ${border}`, color, padding: '14px 12px', borderRadius: 12,
                cursor: answered ? 'default' : 'pointer', textAlign: 'center', fontSize: 18,
                fontFamily: "'Noto Serif JP', serif", fontWeight: 700,
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                transform: answered && i === item.answer ? 'scale(1.02)' : 'scale(1)',
              }}>
              {opt}
              {answered && i === item.answer && ' ✓'}
              {answered && i === selected && !correct && ' ✗'}
            </div>
          )
        })}
      </div>

      {/* Explanation — slides in after answering */}
      {showExplanation && (
        <div className="slide-up" style={{ borderRadius: 12, padding: '16px 18px', marginBottom: 14, border: `1px solid ${correct ? 'var(--green-dim)' : 'var(--gold-dim)'}`, background: correct ? 'rgba(52,211,153,0.07)' : 'rgba(255,178,62,0.07)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: correct ? 'var(--green)' : 'var(--gold)', marginBottom: 8 }}>
            {correct ? '✅ Correct!' : `❌ The answer is「${item.options[item.answer]}」`}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.7, marginBottom: 8 }}>
            {item.explanation}
          </div>
          <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 13, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
            例: {item.example}
          </div>
        </div>
      )}

      {/* Next button */}
      {answered && (
        <button className="btn btn-primary pop-in"
          style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15 }}
          onClick={() => onAnswer(correct)}>
          Next Question →
        </button>
      )}
    </div>
  )
}

export default function Grammar({ onBack, onXPEarned }) {
  const [collectionIdx, setCollectionIdx] = useState(null) // null = picker
  const [qIdx, setQIdx]       = useState(0)
  const [results, setResults] = useState([])
  const [done, setDone]       = useState(false)
  const xpFired = useRef(false)

  const collection = collectionIdx !== null ? GRAMMAR_COLLECTIONS[collectionIdx] : null
  const questions  = collection?.cards || []
  const q          = questions[qIdx]

  const correctCount = results.filter(Boolean).length
  const pct = questions.length ? Math.round((correctCount / questions.length) * 100) : 0
  const xp  = correctCount * 20 + (pct === 100 ? 80 : 0)

  useEffect(() => {
    if (!done || xpFired.current) return
    xpFired.current = true
    onXPEarned?.({ xp, module: 'grammar', level: collection?.id || 'n5' })
  }, [done])

  function handleAnswer(correct) {
    const newResults = [...results, correct]
    setResults(newResults)
    if (qIdx + 1 >= questions.length) setDone(true)
    else setQIdx(i => i + 1)
  }

  // ── Collection picker ─────────────────────────────────────────
  if (collectionIdx === null) {
    return (
      <div className="page">
        <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
        <div className="page-title">📐 Grammar</div>
        <div className="page-sub">Fill-in-the-blank exercises — master Japanese particles, verb forms and sentence patterns</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {GRAMMAR_COLLECTIONS.map((col, i) => (
            <div key={col.id} className="card module-card pop-in"
              style={{ padding: 20, cursor: 'pointer', borderTop: '3px solid var(--purple)', animationDelay: `${i * 0.05}s` }}
              onClick={() => { setCollectionIdx(i); setQIdx(0); setResults([]); setDone(false); xpFired.current = false }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📐</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{col.label}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                {col.cards.length} exercises · Fill in the blank
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Done screen ───────────────────────────────────────────────
  if (done) {
    const perfect = pct === 100
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 20px' }}>
        {pct >= 60 && <Confetti count={perfect ? 160 : 90} />}
        <div className="card pop-in" style={{ padding: 36, textAlign: 'center' }}>
          <div className="celebrate-burst" style={{ fontSize: 72 }}>{perfect ? '🏆' : pct >= 60 ? '🎉' : '💪'}</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 8, marginBottom: 4 }}>
            {perfect ? 'Grammar Master!' : pct >= 60 ? 'Well Done!' : 'Keep Practicing!'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600, marginBottom: 20 }}>{collection.label}</div>
          <div style={{ fontSize: 56, fontWeight: 900, color: perfect ? 'var(--gold)' : pct >= 60 ? 'var(--green)' : 'var(--red)', marginBottom: 4 }}>
            {correctCount}<span style={{ fontSize: 28, color: 'var(--muted)' }}>/{questions.length}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{pct}% correct</div>
          <div style={{ display: 'inline-block', fontSize: 18, fontWeight: 900, color: '#fff', background: 'var(--grad-fun)', padding: '10px 28px', borderRadius: 999, marginBottom: 28 }}>
            +{xp} XP ⚡
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => { setQIdx(0); setResults([]); setDone(false); xpFired.current = false }}>
              Try Again
            </button>
            <button className="btn btn-secondary" onClick={() => { setCollectionIdx(null); setQIdx(0); setResults([]); setDone(false); xpFired.current = false }}>
              More Grammar
            </button>
            <button className="btn btn-secondary" onClick={onBack}>← Home</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Question screen ───────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }}
          onClick={() => setCollectionIdx(null)}>← Collections</button>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>
          {qIdx + 1} / {questions.length}
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)' }}>
          ⚡ {results.filter(Boolean).length * 20} XP
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: '50%', transition: 'all 0.3s',
            background: i < results.length
              ? (results[i] ? 'var(--green)' : 'var(--red)')
              : i === qIdx ? 'var(--purple)' : 'var(--border)',
          }} />
        ))}
      </div>

      <div className="progress-bar" style={{ marginBottom: 24 }}>
        <div className="progress-fill" style={{ width: `${(qIdx / questions.length) * 100}%`, background: 'linear-gradient(135deg, var(--purple), var(--blue))' }} />
      </div>

      {/* Grammar card — key forces remount on new question */}
      <GrammarCard key={`${collectionIdx}-${qIdx}`} item={q} onAnswer={handleAnswer} />
    </div>
  )
}
