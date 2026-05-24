import { useState } from 'react'
import { MODULES, MODULE_META } from '../data/content'
import { sm2 } from '../lib/srs'
import { speak } from '../lib/audio'
import { Confetti } from '../lib/celebrate'

export default function Flashcards({ module: mod, level, onBack, onXPEarned }) {
  const cards = MODULES[mod]?.[level] || []
  const [idx, setIdx]         = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState([])
  const [finished, setFinished] = useState(false)

  if (!cards.length) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="empty"><div className="empty-icon">🚧</div>Content for this level is coming soon!</div>
    </div>
  )

  const card = cards[idx]
  const progress = (idx / cards.length) * 100

  function handleRate(quality) {
    const xpMap = { 5: 10, 3: 5, 1: 1 }
    const xp = xpMap[quality] || 1
    const srsResult = sm2({ ease_factor: 2.5, interval_days: 1, repetitions: 0 }, quality)
    setResults(r => [...r, { card, quality, xp, ...srsResult }])
    setFlipped(false)
    setTimeout(() => {
      if (idx + 1 >= cards.length) setFinished(true)
      else setIdx(i => i + 1)
    }, 150)
  }

  if (finished) {
    const easy  = results.filter(r => r.quality === 5).length
    const ok    = results.filter(r => r.quality === 3).length
    const again = results.filter(r => r.quality === 1).length
    const totalXP = results.reduce((sum, r) => sum + r.xp, 0)
    onXPEarned?.(totalXP)
    const perfect = again === 0
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <Confetti count={perfect ? 160 : 100} />
        <div className="card pop-in" style={{ padding: 40, textAlign: 'center' }}>
          <div className="celebrate-burst" style={{ marginBottom: 8 }}>{perfect ? '🏆' : '🎉'}</div>
          <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 30, fontWeight: 900, marginBottom: 8 }}>
            {perfect ? 'Perfect Run!' : 'Session Complete!'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, marginBottom: 16 }}>
            {MODULE_META[mod].label} · {level} · {results.length} cards
          </div>
          <div style={{ display: 'inline-block', fontSize: 22, fontWeight: 900, color: '#fff', background: 'var(--grad-fun)', padding: '8px 24px', borderRadius: 999, marginBottom: 24, boxShadow: '0 6px 20px rgba(255,90,95,0.4)' }}>+{totalXP} XP earned! ⚡</div>
          <div className="grid-3" style={{ marginBottom: 32 }}>
            {[['😊 Easy', easy, 'var(--green)'], ['😐 OK', ok, 'var(--gold)'], ['😓 Again', again, 'var(--red)']].map(([l, v, c]) => (
              <div key={l} className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: c }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="flex" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setIdx(0); setFlipped(false); setResults([]); setFinished(false) }}>Review Again</button>
            <button className="btn btn-secondary" onClick={onBack}>Back</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px' }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
      <div className="progress-bar" style={{ marginBottom: 8 }}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', fontFamily: "'DM Mono', monospace", marginBottom: 24 }}>
        {idx + 1} / {cards.length} · {MODULE_META[mod].label} {level}
      </div>
      <div style={{ perspective: 1000, height: 320, cursor: 'pointer', marginBottom: 24 }} onClick={() => !flipped && setFlipped(true)}>
        <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.5s cubic-bezier(0.4,0,0.2,1)', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
          <div className="card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 100, fontWeight: 900, lineHeight: 1, marginBottom: 16 }}>{card.character}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: "'DM Mono', monospace" }}>tap to reveal</div>
          </div>
          <div className="card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <button className="btn btn-icon" style={{ marginBottom: 16, fontSize: 13 }} onClick={e => { e.stopPropagation(); speak(card.character) }}>🔊 Play Audio</button>
            <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--red)', marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>{card.romaji}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{card.english}</div>
            {card.example_jp && (
              <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: "'DM Mono', monospace", textAlign: 'center', lineHeight: 1.7 }}>
                <div>{card.example_jp}</div>
                <div style={{ marginTop: 2 }}>{card.example_en}</div>
              </div>
            )}
            {card.mnemonic && (
              <div style={{ fontSize: 12, color: 'var(--gold)', fontFamily: "'DM Mono', monospace", marginTop: 12, fontStyle: 'italic', textAlign: 'center' }}>
                💡 {card.mnemonic}
              </div>
            )}
          </div>
        </div>
      </div>
      {flipped ? (
        <div className="flex" style={{ justifyContent: 'center' }}>
          {[
            { label: '😓 Again', q: 1, border: 'var(--red)',   color: 'var(--red)',   bg: 'rgba(220,38,38,0.08)' },
            { label: '😐 OK',    q: 3, border: '#555',         color: '#ccc',         bg: 'transparent' },
            { label: '😊 Easy',  q: 5, border: 'var(--green)', color: 'var(--green)', bg: 'rgba(22,163,74,0.08)' },
          ].map(r => (
            <button key={r.label} onClick={() => handleRate(r.q)}
              style={{ flex: 1, maxWidth: 160, padding: 13, borderRadius: 6, border: `1px solid ${r.border}`, color: r.color, background: r.bg, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
              {r.label}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>click the card to reveal answer</div>
      )}
    </div>
  )
}
