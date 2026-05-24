import { useState, useRef, useEffect } from 'react'
import { MODULE_META, KANA_MAP, COLLECTION_MAP, MODULE_ALL_CARDS } from '../data/index.js'
import { sm2 } from '../lib/srs'
import { speak } from '../lib/audio'
import { Confetti } from '../lib/celebrate'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function resolveCards(mod, collectionId) {
  const collections = COLLECTION_MAP[mod]
  if (!collections) return MODULE_ALL_CARDS[mod] || []
  if (!collectionId || collectionId === 'all') return MODULE_ALL_CARDS[mod] || []
  return collections.find(c => c.id === collectionId)?.cards || MODULE_ALL_CARDS[mod] || []
}

// ─── Swipe hint overlay ────────────────────────────────────────
function SwipeHint() {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
        <span style={{ fontSize: 16 }}>←</span> swipe left to move on
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
        swipe right to save ⭐ <span style={{ fontSize: 16 }}>→</span>
      </div>
    </div>
  )
}

// ─── Saved Library modal ───────────────────────────────────────
function SavedLibrary({ saved, onClose, onRemove }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 600, margin: '0 auto', background: 'var(--bg2)', borderRadius: '20px 20px 0 0', padding: 28, maxHeight: '75vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>⭐ Saved Cards</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{saved.length} cards saved for review</div>
          </div>
          <button className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={onClose}>Close</button>
        </div>
        {saved.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontWeight: 700 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            No saved cards yet — swipe right on any card to save it
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {saved.map((card, i) => (
              <div key={i} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: '3px solid var(--gold)' }}>
                <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 32, fontWeight: 900, flexShrink: 0, color: 'var(--gold)', minWidth: 48, textAlign: 'center' }}>
                  {card.character}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 14, color: 'var(--blue)', marginBottom: 2 }}>{card.romaji}</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{card.english}</div>
                  {card.mnemonic && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>💡 {card.mnemonic}</div>}
                </div>
                <button onClick={() => onRemove(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, padding: 4 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Flashcards({ module: mod, level, onBack, onXPEarned, ctx }) {
  const { user } = useAuth()
  const cards = resolveCards(mod, ctx?.subDeck)

  const [idx, setIdx]           = useState(0)
  const [flipped, setFlipped]   = useState(false)
  const [results, setResults]   = useState([])
  const [finished, setFinished] = useState(false)
  const [saved, setSaved]       = useState([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [swipeAnim, setSwipeAnim]     = useState(null) // 'left' | 'right' | null
  const [justSaved, setJustSaved]     = useState(false)

  // Touch / swipe state
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const cardRef     = useRef(null)

  // Load saved cards from Supabase on mount
  useEffect(() => {
    if (!user) return
    supabase.from('flashcard_sessions')
      .select('card_id, flashcard_content(character, romaji, english, mnemonic)')
      .eq('user_id', user.id)
      .eq('saved', true)
      .then(({ data }) => {
        if (data?.length) {
          const loaded = data.map(r => r.flashcard_content).filter(Boolean)
          setSaved(loaded)
        }
      })
  }, [user?.id])

  if (!cards.length) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="empty"><div className="empty-icon">🚧</div>Content for this level is coming soon!</div>
    </div>
  )

  const card    = cards[idx]
  const progress = (idx / cards.length) * 100

  // ─── Swipe gesture handlers ──────────────────────────────────
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null

    // Only count horizontal swipes (not scrolling)
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 50) {
      // Short tap = flip
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && !flipped) setFlipped(true)
      return
    }

    if (!flipped) {
      // If not flipped, tap to flip
      setFlipped(true)
      return
    }

    if (dx > 50) handleSave()   // swipe right = save ⭐
    if (dx < -50) handleNext()  // swipe left  = move on
  }

  // Mouse drag support for desktop
  const mouseStart = useRef(null)
  function handleMouseDown(e) { mouseStart.current = e.clientX }
  function handleMouseUp(e) {
    if (mouseStart.current === null) return
    const dx = e.clientX - mouseStart.current
    mouseStart.current = null
    if (!flipped || Math.abs(dx) < 50) { if (Math.abs(dx) < 5 && !flipped) setFlipped(true); return }
    if (dx > 50) handleSave()
    if (dx < -50) handleNext()
  }

  // ─── Actions ─────────────────────────────────────────────────
  function handleNext() {
    const srsResult = sm2({ ease_factor: 2.5, interval_days: 1, repetitions: 0 }, 3)
    setResults(r => [...r, { card, quality: 3, xp: 5, ...srsResult }])
    setSwipeAnim('left')
    setTimeout(() => {
      setSwipeAnim(null)
      setFlipped(false)
      setTimeout(() => {
        if (idx + 1 >= cards.length) setFinished(true)
        else setIdx(i => i + 1)
      }, 80)
    }, 280)
  }

  function handleSave() {
    // Mark as easy (quality 5) + add to saved library
    const srsResult = sm2({ ease_factor: 2.5, interval_days: 1, repetitions: 0 }, 5)
    setResults(r => [...r, { card, quality: 5, xp: 10, ...srsResult }])
    setSaved(s => {
      if (s.some(c => c.character === card.character)) return s
      return [...s, card]
    })
    setJustSaved(true)
    setSwipeAnim('right')

    // Persist to Supabase
    if (user) {
      const cardId = `${mod}_${level}_${card.character}`
      supabase.from('flashcard_sessions').upsert({
        user_id: user.id, card_id: cardId, saved: true,
        ease_factor: srsResult.ease_factor, interval_days: srsResult.interval_days,
        repetitions: srsResult.repetitions, next_review: srsResult.next_review,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,card_id' })
    }

    setTimeout(() => {
      setSwipeAnim(null)
      setJustSaved(false)
      setFlipped(false)
      setTimeout(() => {
        if (idx + 1 >= cards.length) setFinished(true)
        else setIdx(i => i + 1)
      }, 80)
    }, 350)
  }

  function removeFromSaved(i) {
    setSaved(s => s.filter((_, j) => j !== i))
  }

  // ─── Finished screen ─────────────────────────────────────────
  if (finished) {
    const easy  = results.filter(r => r.quality === 5).length
    const again = results.filter(r => r.quality === 1).length
    const totalXP = results.reduce((sum, r) => sum + r.xp, 0)
    const perfect = again === 0
    onXPEarned?.({ xp: totalXP, module: mod, level, srsResults: results, quizPerfect: perfect })

    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <Confetti count={perfect ? 160 : 80} />
        <div className="card pop-in" style={{ padding: 40, textAlign: 'center', marginBottom: 16 }}>
          <div className="celebrate-burst" style={{ marginBottom: 8 }}>{perfect ? '🏆' : '🎉'}</div>
          <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
            {perfect ? 'Perfect Run!' : 'Session Complete!'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, marginBottom: 16 }}>
            {MODULE_META[mod]?.label} · {results.length} cards
          </div>
          <div style={{ display: 'inline-block', fontSize: 20, fontWeight: 900, color: '#fff', background: 'var(--grad-fun)', padding: '8px 24px', borderRadius: 999, marginBottom: 24 }}>
            +{totalXP} XP earned! ⚡
          </div>
          <div className="grid-2" style={{ marginBottom: 24 }}>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--gold)' }}>{easy}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>⭐ Saved</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue)' }}>{results.length - easy}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>✓ Reviewed</div>
            </div>
          </div>
          <div className="flex" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => { setIdx(0); setFlipped(false); setResults([]); setFinished(false) }}>Review Again</button>
            {saved.length > 0 && (
              <button className="btn btn-secondary" style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
                onClick={() => setShowLibrary(true)}>⭐ Saved ({saved.length})</button>
            )}
            <button className="btn btn-secondary" onClick={onBack}>Back</button>
          </div>
        </div>

        {showLibrary && <SavedLibrary saved={saved} onClose={() => setShowLibrary(false)} onRemove={removeFromSaved} />}
      </div>
    )
  }

  // ─── Card swipe animation styles ──────────────────────────────
  const cardTransform = swipeAnim === 'left'
    ? 'translateX(-120%) rotate(-12deg)'
    : swipeAnim === 'right'
    ? 'translateX(120%) rotate(12deg)'
    : 'translateX(0) rotate(0)'

  const cardOpacity = swipeAnim ? 0 : 1

  // ─── Main card view ───────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={onBack}>← Back</button>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>
          {idx + 1} / {cards.length} · {MODULE_META[mod]?.label}
        </div>
        <button className="btn btn-icon" style={{ fontSize: 13, color: saved.length ? 'var(--gold)' : 'var(--muted)', borderColor: saved.length ? 'var(--gold-dim)' : undefined }}
          onClick={() => setShowLibrary(true)}>
          ⭐ {saved.length}
        </button>
      </div>

      {/* Progress */}
      <div className="progress-bar" style={{ marginBottom: 20 }}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Swipe hint */}
      {flipped && <SwipeHint />}

      {/* Swipe overlay feedback */}
      {justSaved && (
        <div className="pop-in" style={{ textAlign: 'center', marginBottom: 8, fontSize: 14, fontWeight: 800, color: 'var(--gold)' }}>
          ⭐ Saved to library!
        </div>
      )}

      {/* Card */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={() => !flipped && !swipeAnim && setFlipped(true)}
        style={{
          perspective: 1000, height: 340, cursor: flipped ? 'grab' : 'pointer',
          userSelect: 'none', marginBottom: 16,
          transition: swipeAnim ? 'transform 0.28s ease, opacity 0.28s ease' : 'none',
          transform: cardTransform, opacity: cardOpacity,
        }}>
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'none',
        }}>
          {/* FRONT */}
          <div className="card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: card.character?.length > 4 ? 56 : 96, fontWeight: 900, lineHeight: 1, marginBottom: 10 }}>
              {card.character}
            </div>
            {KANA_MAP[card.character] && (
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20, color: 'var(--blue)', fontWeight: 500, letterSpacing: 3, marginBottom: 10 }}>
                {KANA_MAP[card.character]}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              tap to reveal
            </div>
          </div>

          {/* BACK */}
          <div className="card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <button className="btn btn-icon" style={{ marginBottom: 12, fontSize: 13 }}
              onClick={e => { e.stopPropagation(); speak(card.character) }}>🔊 Play Audio</button>
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

      {/* Action area — keyboard shortcuts for desktop, gesture cues for mobile */}
      {flipped ? (
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleNext}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '2px solid var(--border)', background: 'var(--bg3)', color: 'var(--muted)', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
            ← Move On
          </button>
          <button onClick={handleSave}
            style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '2px solid var(--gold-dim)', background: 'rgba(255,178,62,0.08)', color: 'var(--gold)', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,178,62,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,178,62,0.08)' }}>
            Save ⭐ →
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
          tap card to reveal · then swipe or tap buttons
        </div>
      )}

      {showLibrary && <SavedLibrary saved={saved} onClose={() => setShowLibrary(false)} onRemove={removeFromSaved} />}
    </div>
  )
}
