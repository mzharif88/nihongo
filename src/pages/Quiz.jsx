import { useState } from 'react'
import { MODULES, MODULE_META } from '../data/content'
import { WORD_COLLECTIONS, ANIMAL_COLLECTIONS, THINGS_COLLECTIONS, ALL_WORDS, ALL_ANIMALS, ALL_THINGS } from '../data/vocab'
import { speak } from '../lib/audio'
import { Confetti } from '../lib/celebrate'

function resolveCards(mod, collectionId) {
  const MAPS = { words: WORD_COLLECTIONS, animals: ANIMAL_COLLECTIONS, things: THINGS_COLLECTIONS }
  const collections = MAPS[mod]
  if (!collections) return MODULES[mod]?.['beginner'] || []
  if (!collectionId || collectionId === 'all') {
    return { words: ALL_WORDS, animals: ALL_ANIMALS, things: ALL_THINGS }[mod] || []
  }
  return collections.find(c => c.id === collectionId)?.cards || ALL_WORDS
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuestions(cards) {
  if (!cards.length) return []
  const pool     = cards.length < 4 ? [...cards, ...cards, ...cards, ...cards] : cards
  const shuffled = shuffle(cards).slice(0, Math.min(cards.length, 10))
  return shuffled.map(card => {
    const others = pool.filter(x => x.character !== card.character)
    const wrong  = shuffle(others).slice(0, 3).map(x => x.english)
    const opts   = shuffle([card.english, ...wrong])
    return { card, options: opts, answer: opts.indexOf(card.english) }
  })
}

function getGrammarTip(card, mod) {
  if (card.mnemonic) return `💡 ${card.mnemonic}`
  if (mod === 'hiragana' || mod === 'katakana') return `💡 ${card.character} is pronounced "${card.romaji}" — try sounding it out!`
  if (mod === 'kanji') return `💡 The kanji ${card.character} (${card.romaji}) means "${card.english}"`
  return `💡 ${card.character} = ${card.english} (${card.romaji})`
}

export default function Quiz({ module: mod, level, onBack, onXPEarned, ctx }) {
  const allCards = resolveCards(mod, ctx?.subDeck)
  const [questions] = useState(() => buildQuestions(allCards))
  const [qIdx, setQIdx]         = useState(0)
  const [selected, setSelected] = useState(null)
  const [hearts, setHearts]     = useState(5)
  const [score, setScore]       = useState(0)
  const [done, setDone]         = useState(false)
  const [showTip, setShowTip]   = useState(false)

  if (!questions.length) return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 32 }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="empty"><div className="empty-icon">🚧</div>No cards available yet.</div>
    </div>
  )

  const q = questions[qIdx]
  const isWrong = selected !== null && selected !== q.answer

  function handleSelect(i) {
    if (selected !== null) return
    setSelected(i)
    speak(q.card.character)
    if (i === q.answer) { setScore(s => s + 1); setShowTip(false) }
    else { setHearts(h => Math.max(0, h - 1)); setShowTip(true) }
  }

  function handleNext() {
    setShowTip(false)
    if (qIdx + 1 >= questions.length || hearts === 0) { setDone(true); return }
    setQIdx(i => i + 1); setSelected(null)
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100)
    const xp  = score * 15 + (pct === 100 ? 50 : 0)
    onXPEarned?.({ xp, module: mod, level, quizPerfect: pct === 100 })
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 32 }}>
        {pct >= 60 && <Confetti count={pct === 100 ? 180 : 90} />}
        <div className="card pop-in" style={{ padding: 48, textAlign: 'center' }}>
          <div className="celebrate-burst" style={{ marginBottom: 12 }}>{pct === 100 ? '🌟' : pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'}</div>
          <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 30, fontWeight: 900, marginBottom: 4 }}>{score} / {questions.length}</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 700, marginBottom: 12 }}>Accuracy: {pct}%</div>
          <div style={{ display: 'inline-block', fontSize: 18, fontWeight: 900, color: '#fff', background: 'var(--grad-fun)', padding: '8px 24px', borderRadius: 999, marginBottom: 32 }}>+{xp} XP ⚡</div>
          <div className="flex" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setQIdx(0); setSelected(null); setHearts(5); setScore(0); setDone(false); setShowTip(false) }}>Try Again</button>
            <button className="btn btn-secondary" onClick={onBack}>Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
      <div className="flex-between" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ fontSize: 18, transition: 'all 0.3s', transform: i >= hearts ? 'scale(0.7)' : 'scale(1)' }}>
              {i < hearts ? '❤️' : '🖤'}
            </span>
          ))}
        </div>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--gold)' }}>⚡ {score * 15} XP</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>{qIdx + 1}/{questions.length}</div>
      </div>
      <div className="progress-bar" style={{ marginBottom: 24 }}>
        <div className="progress-fill" style={{ width: `${(qIdx / questions.length) * 100}%` }} />
      </div>
      <div className="card" style={{ padding: 32, marginBottom: 16 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--red)', marginBottom: 14, fontWeight: 800 }}>
          {MODULE_META[mod]?.label} · What does this mean?
        </div>
        <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 72, fontWeight: 900, textAlign: 'center', margin: '8px 0 16px', lineHeight: 1 }}>
          {q.card.character}
        </div>
        {q.card.romaji && (
          <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)', fontWeight: 700, marginBottom: 8 }}>{q.card.romaji}</div>
        )}
        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-icon" style={{ fontSize: 13 }} onClick={() => speak(q.card.character)}>🔊</button>
        </div>
      </div>
      <div className="grid-2" style={{ marginBottom: 14 }}>
        {q.options.map((opt, i) => {
          let border = 'var(--border)', color = 'var(--text)', bg = 'var(--bg3)'
          if (selected !== null) {
            if (i === q.answer)              { border = 'var(--green)'; color = 'var(--green)'; bg = 'rgba(52,211,153,0.1)' }
            if (i === selected && i !== q.answer) { border = 'var(--red)'; color = 'var(--red)'; bg = 'rgba(255,90,95,0.08)' }
          }
          return (
            <div key={i} onClick={() => handleSelect(i)}
              style={{ background: bg, border: `2px solid ${border}`, color, padding: '16px 12px', borderRadius: 12, cursor: selected ? 'default' : 'pointer', fontSize: 15, fontWeight: 700, textAlign: 'center', transition: 'all 0.15s' }}>
              {opt}
            </div>
          )
        })}
      </div>
      {showTip && isWrong && (
        <div className="slide-up" style={{ background: 'rgba(255,178,62,0.09)', border: '1px solid rgba(255,178,62,0.35)', borderRadius: 12, padding: '14px 18px', marginBottom: 14, fontSize: 13, color: 'var(--gold)', fontWeight: 700, lineHeight: 1.6 }}>
          {getGrammarTip(q.card, mod)}
          {q.card.example_jp && (
            <div style={{ marginTop: 8, fontFamily: "'Noto Serif JP', serif", fontSize: 13, color: 'var(--text)', fontWeight: 400 }}>
              例：{q.card.example_jp}<br />
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{q.card.example_en}</span>
            </div>
          )}
        </div>
      )}
      {selected !== null && (
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15 }} onClick={handleNext}>
          {qIdx + 1 >= questions.length || hearts === 0 ? 'See Results 🎯' : 'Next →'}
        </button>
      )}
    </div>
  )
}
