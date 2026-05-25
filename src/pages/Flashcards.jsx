import { useState, useRef, useEffect, useCallback } from 'react'
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

// ─── Saved Library bottom sheet ────────────────────────────────
function SavedLibrary({ saved, onClose, onRemove }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 600, margin: '0 auto', background: 'var(--bg2)', borderRadius: '20px 20px 0 0', padding: 28, maxHeight: '75vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>⭐ Saved Cards</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{saved.length} cards saved · swipe right on any card</div>
          </div>
          <button className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={onClose}>Close</button>
        </div>
        {saved.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontWeight: 700 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            No saved cards yet — swipe right to save a card
          </div>
        ) : saved.map((card, i) => (
          <div key={i} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, borderLeft: '3px solid var(--gold)', marginBottom: 10 }}>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 32, fontWeight: 900, color: 'var(--gold)', minWidth: 48, textAlign: 'center' }}>{card.character}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 13, color: 'var(--blue)', marginBottom: 2 }}>{card.romaji}</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{card.english}</div>
              {card.mnemonic && <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>💡 {card.mnemonic}</div>}
            </div>
            <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, padding: 4 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── The swipeable card ────────────────────────────────────────
function SwipeCard({ card, flipped, onFlip, onSwipeLeft, onSwipeRight }) {
  const startX    = useRef(0)
  const startY    = useRef(0)
  const dragging  = useRef(false)
  const [dragX, setDragX]     = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [exiting, setExiting] = useState(null) // 'left'|'right'|null

  const THRESHOLD = 80  // px to trigger swipe

  // Direction indicator color
  const swipeColor = dragX > 40 ? 'var(--gold)' : dragX < -40 ? 'var(--blue)' : 'transparent'
  const swipeLabel = dragX > 40 ? '⭐ Save' : dragX < -40 ? '→ Next' : ''
  const cardRotate = dragX / 18  // degrees
  const cardOpacity = exiting ? 0 : 1

  function getClientX(e) { return e.touches ? e.touches[0].clientX : e.clientX }
  function getClientY(e) { return e.touches ? e.touches[0].clientY : e.clientY }

  function onStart(e) {
    startX.current = getClientX(e)
    startY.current = getClientY(e)
    dragging.current = true
  }

  function onMove(e) {
    if (!dragging.current) return
    const dx = getClientX(e) - startX.current
    const dy = getClientY(e) - startY.current
    // Lock to horizontal only — if vertical drift dominates, don't drag
    if (!isDragging && Math.abs(dx) < 8 && Math.abs(dy) > 12) {
      dragging.current = false
      return
    }
    if (Math.abs(dx) > 6) {
      setIsDragging(true)
      setDragX(dx)
      if (e.cancelable) e.preventDefault()
    }
  }

  function onEnd(e) {
    if (!dragging.current) return
    dragging.current = false
    const dx = isDragging ? dragX : 0
    const totalDx = getClientX(e.changedTouches?.[0] || e) - startX.current
    const totalDy = getClientY(e.changedTouches?.[0] || e) - startY.current

    setIsDragging(false)
    setDragX(0)

    // Was it a tap (tiny movement)?
    if (Math.abs(totalDx) < 12 && Math.abs(totalDy) < 12) {
      if (!flipped) onFlip()
      return
    }

    // Was it a swipe?
    if (Math.abs(dx) >= THRESHOLD) {
      setExiting(dx > 0 ? 'right' : 'left')
      setTimeout(() => {
        setExiting(null)
        if (dx > 0) onSwipeRight()
        else onSwipeLeft()
      }, 320)
    }
    // else snap back (dragX already reset to 0)
  }

  const exitTransform = exiting === 'left'
    ? 'translateX(-130%) rotate(-20deg)'
    : exiting === 'right'
    ? 'translateX(130%) rotate(20deg)'
    : `translateX(${dragX}px) rotate(${cardRotate}deg)`

  const transition = isDragging ? 'none' : exiting ? 'transform 0.3s ease, opacity 0.3s ease' : 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)'

  return (
    <div style={{ position: 'relative', height: 360, marginBottom: 12, touchAction: 'pan-y' }}>

      {/* Swipe direction indicator */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 16, zIndex: 0,
        background: dragX > 40 ? 'rgba(255,178,62,0.12)' : dragX < -40 ? 'rgba(77,141,255,0.10)' : 'transparent',
        border: dragX > 40 ? '2px solid var(--gold)' : dragX < -40 ? '2px solid var(--blue)' : '2px solid transparent',
        transition: 'all 0.1s', borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: dragX > 40 ? 'flex-end' : 'flex-start',
        padding: '0 24px',
        pointerEvents: 'none',
      }}>
        {swipeLabel && (
          <span style={{ fontSize: 16, fontWeight: 900, color: swipeColor, opacity: Math.min(1, Math.abs(dragX) / 60) }}>
            {swipeLabel}
          </span>
        )}
      </div>

      {/* The card itself */}
      <div
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={e => { if (dragging.current) onEnd(e) }}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        style={{
          position: 'absolute', inset: 0, zIndex: 1,
          cursor: isDragging ? 'grabbing' : flipped ? 'grab' : 'pointer',
          userSelect: 'none',
          transform: exitTransform,
          opacity: cardOpacity,
          transition,
          perspective: 1000,
        }}>
        {/* 3D flip inner */}
        <div style={{
          width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'none',
        }}>

          {/* FRONT */}
          <div className="card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: card.character?.length > 4 ? 52 : 88, fontWeight: 900, lineHeight: 1, marginBottom: 10 }}>
              {card.character}
            </div>
            {KANA_MAP[card.character] && (
              <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 20, color: 'var(--blue)', fontWeight: 500, letterSpacing: 3, marginBottom: 10 }}>
                {KANA_MAP[card.character]}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>tap to reveal</div>
          </div>

          {/* BACK */}
          <div className="card" style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 0 }}>
            <button className="btn btn-icon" style={{ marginBottom: 10, fontSize: 12 }}
              onClick={e => { e.stopPropagation(); speak(card.character) }}>🔊 Play</button>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 30, fontWeight: 900, marginBottom: 2 }}>{card.character}</div>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 15, color: 'var(--blue)', fontWeight: 600, letterSpacing: 2, marginBottom: 6 }}>{card.romaji}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)', marginBottom: 12 }}>{card.english}</div>
            {card.example_jp && (
              <div style={{ textAlign: 'center', background: 'var(--bg3)', borderRadius: 10, padding: '10px 16px', marginBottom: 8, width: '100%' }}>
                <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 13 }}>{card.example_jp}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>{card.example_en}</div>
              </div>
            )}
            {card.mnemonic && (
              <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700, textAlign: 'center', padding: '8px 12px', background: 'rgba(255,178,62,0.08)', borderRadius: 8, width: '100%' }}>
                💡 {card.mnemonic}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Flashcards page ──────────────────────────────────────
export default function Flashcards({ module: mod, level, onBack, onXPEarned, ctx }) {
  const { user } = useAuth()
  const cards = resolveCards(mod, ctx?.subDeck)

  const [idx, setIdx]           = useState(0)
  const [flipped, setFlipped]   = useState(false)
  const [results, setResults]   = useState([])
  const [finished, setFinished] = useState(false)
  const [saved, setSaved]       = useState([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [justSaved, setJustSaved]     = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('flashcard_sessions')
      .select('card_id, flashcard_content(character, romaji, english, mnemonic)')
      .eq('user_id', user.id)
      .eq('saved', true)
      .then(({ data }) => {
        if (data?.length) setSaved(data.map(r => r.flashcard_content).filter(Boolean))
      })
  }, [user?.id])

  if (!cards.length) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="empty"><div className="empty-icon">🚧</div>No cards available yet.</div>
    </div>
  )

  const card     = cards[idx]
  const progress = (idx / cards.length) * 100

  function advance(quality, isSave = false) {
    const srsResult = sm2({ ease_factor: 2.5, interval_days: 1, repetitions: 0 }, quality)
    const xpMap = { 5: 10, 3: 5, 1: 1 }
    setResults(r => [...r, { card, quality, xp: xpMap[quality], ...srsResult }])
    if (isSave) {
      setSaved(s => s.some(c => c.character === card.character) ? s : [...s, card])
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 1200)
      if (user) {
        supabase.from('flashcard_sessions').upsert({
          user_id: user.id,
          card_id: `${mod}_${card.character}`,
          saved: true,
          ease_factor: srsResult.ease_factor,
          interval_days: srsResult.interval_days,
          repetitions: srsResult.repetitions,
          next_review: srsResult.next_review,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,card_id' })
      }
    }
    setFlipped(false)
    setTimeout(() => {
      if (idx + 1 >= cards.length) setFinished(true)
      else setIdx(i => i + 1)
    }, 50)
  }

  if (finished) {
    const savedCount   = results.filter(r => r.quality === 5).length
    const totalXP      = results.reduce((sum, r) => sum + r.xp, 0)
    const perfect      = results.every(r => r.quality >= 3)
    onXPEarned?.({ xp: totalXP, module: mod, level, srsResults: results, quizPerfect: perfect })
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <Confetti count={perfect ? 140 : 80} />
        <div className="card pop-in" style={{ padding: 40, textAlign: 'center' }}>
          <div className="celebrate-burst" style={{ marginBottom: 8 }}>{perfect ? '🏆' : '🎉'}</div>
          <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
            {perfect ? 'Perfect Run!' : 'Session Complete!'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, marginBottom: 16 }}>
            {MODULE_META[mod]?.label} · {results.length} cards
          </div>
          <div style={{ display: 'inline-block', fontSize: 20, fontWeight: 900, color: '#fff', background: 'var(--grad-fun)', padding: '8px 24px', borderRadius: 999, marginBottom: 24 }}>
            +{totalXP} XP ⚡
          </div>
          <div className="grid-2" style={{ marginBottom: 24 }}>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--gold)' }}>{savedCount}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>⭐ Saved</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--blue)' }}>{results.length - savedCount}</div>
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
        {showLibrary && <SavedLibrary saved={saved} onClose={() => setShowLibrary(false)} onRemove={i => setSaved(s => s.filter((_, j) => j !== i))} />}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 14px' }} onClick={onBack}>← Back</button>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>{idx + 1} / {cards.length}</div>
        <button
          className="btn btn-icon"
          style={{ fontSize: 13, color: saved.length ? 'var(--gold)' : 'var(--muted)', borderColor: saved.length ? 'var(--gold-dim)' : undefined }}
          onClick={() => setShowLibrary(true)}>
          ⭐ {saved.length}
        </button>
      </div>

      {/* Progress bar */}
      <div className="progress-bar" style={{ marginBottom: 20 }}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Saved toast */}
      {justSaved && (
        <div className="pop-in" style={{ textAlign: 'center', marginBottom: 8, fontSize: 14, fontWeight: 800, color: 'var(--gold)' }}>
          ⭐ Saved to library!
        </div>
      )}

      {/* Swipe hints — always visible */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
        <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 700, opacity: 0.7 }}>← swipe left · next</span>
        <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, opacity: 0.7 }}>save ⭐ · swipe right →</span>
      </div>

      {/* Swipeable card — key forces remount on idx change */}
      <SwipeCard
        key={idx}
        card={card}
        flipped={flipped}
        onFlip={() => setFlipped(true)}
        onSwipeLeft={() => advance(3)}
        onSwipeRight={() => advance(5, true)}
      />

      {/* Fallback buttons for desktop / accessibility */}
      {flipped ? (
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button onClick={() => advance(3)}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '2px solid var(--border)', background: 'var(--bg3)', color: 'var(--muted)', fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
            ← Move On
          </button>
          <button onClick={() => advance(5, true)}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '2px solid var(--gold-dim)', background: 'rgba(255,178,62,0.08)', color: 'var(--gold)', fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,178,62,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,178,62,0.08)' }}>
            Save ⭐ →
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
          tap card to reveal · then swipe or use buttons
        </div>
      )}

      {showLibrary && <SavedLibrary saved={saved} onClose={() => setShowLibrary(false)} onRemove={i => setSaved(s => s.filter((_, j) => j !== i))} />}
    </div>
  )
}
