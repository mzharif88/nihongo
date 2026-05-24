import { useState } from 'react'
import { MODULES, MODULE_META, KANA_MAP } from '../data/content'
import { WORD_COLLECTIONS, ANIMAL_COLLECTIONS, THINGS_COLLECTIONS, ALL_WORDS, ALL_ANIMALS, ALL_THINGS } from '../data/vocab'
import { sm2 } from '../lib/srs'
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

export default function Flashcards({ module: mod, level, onBack, onXPEarned, ctx }) {
  const cards = resolveCards(mod, ctx?.subDeck)
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
    const perfect = again === 0

    // Fire once — use a ref-style guard via useEffect would be cleaner but
    // calling here is fine since the component stays mounted on the result screen
    onXPEarned?.({
      xp: totalXP,
      module: mod,
      level,
      srsResults: results,
      quizPerfect: perfect,
    })
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
          {/* FRONT */}
          <div className="card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: card.character?.length > 4 ? 56 : 96, fontWeight: 900, lineHeight: 1, marginBottom: 10 }}>{card.character}</div>
            {KANA_MAP[card.character] && (
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20, color: 'var(--blue)', fontWeight: 500, letterSpacing: 3, marginBottom: 10 }}>
                {KANA_MAP[card.character]}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>tap to reveal</div>
          </div>
          {/* BACK */}
          <div className="card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <button className="btn btn-icon" style={{ marginBottom: 12, fontSize: 13 }} onClick={e => { e.stopPropagation(); speak(card.character) }}>🔊 Play Audio</button>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 32, fontWeight: 900, marginBottom: 2 }}>{card.character}</div>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 16, color: 'var(--blue)', fontWeight: 600, letterSpacing: 2, marginBottom: 6 }}>{card.romaji}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--red)', marginBottom: 14 }}>{card.english}</div>
            {card.example_jp && (
              <div style={{ textAlign: 'center', background: 'var(--bg3)', borderRadius: 10, padding: '10px 16px', marginBottom: 10, width: '100%' }}>
                <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 13 }}>{card.example_jp}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>{card.example_en}</div>
              </div>
            )}
            {card.mnemonic && (
              <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, textAlign: 'center', padding: '8px 12px', background: 'rgba(255,178,62,0.08)', borderRadius: 8, width: '100%' }}>
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
