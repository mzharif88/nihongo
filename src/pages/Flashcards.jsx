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

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Build 4 answer options — case-insensitive, deduplicated pool
function buildOptions(card, allCards) {
  const cardEnglish = (card.english || '').trim()
  if (!cardEnglish) return { options: [], answerIdx: 0 }

  // Only use cards that have valid english answers (filters out grammar exercises etc.)
  const validPool = allCards.filter(c => c.english && c.character)

  // Deduplicate pool by english (case-insensitive) to avoid duplicate wrong answers
  const seen = new Set([cardEnglish.toLowerCase()])
  const pool = validPool.filter(c => {
    const e = (c.english || '').trim()
    if (!e || e.toLowerCase() === cardEnglish.toLowerCase()) return false
    if (seen.has(e.toLowerCase())) return false
    seen.add(e.toLowerCase())
    return true
  })

  const wrong = shuffle(pool).slice(0, 3).map(c => c.english.trim())
  // Fallback if not enough wrong options
  while (wrong.length < 3) wrong.push(['(none)', '—', '...'][wrong.length] || '—')
  const opts  = shuffle([cardEnglish, ...wrong])
  // Use case-insensitive indexOf to find the answer
  const answerIdx = opts.findIndex(o => o.toLowerCase() === cardEnglish.toLowerCase())
  return { options: opts, answerIdx }
}

// ─── Saved Library ─────────────────────────────────────────────
function SavedLibrary({ saved, onClose, onRemove }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:200, display:'flex', alignItems:'flex-end' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width:'100%', maxWidth:600, margin:'0 auto', background:'var(--bg2)', borderRadius:'20px 20px 0 0', padding:28, maxHeight:'75vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900 }}>⭐ Saved Cards</div>
            <div style={{ fontSize:12, color:'var(--muted)', fontWeight:600 }}>{saved.length} cards · swipe right or tap Save to add</div>
          </div>
          <button className="btn btn-secondary" style={{ fontSize:13, padding:'6px 14px' }} onClick={onClose}>Close</button>
        </div>
        {saved.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--muted)', fontWeight:700 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>📭</div>No saved cards yet
          </div>
        ) : saved.map((card, i) => (
          <div key={i} className="card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:16, borderLeft:'3px solid var(--gold)', marginBottom:10 }}>
            <div style={{ fontFamily:"'Noto Serif JP',serif", fontSize:32, fontWeight:900, color:'var(--gold)', minWidth:48, textAlign:'center' }}>{card.character}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Noto Serif JP',serif", fontSize:13, color:'var(--blue)', marginBottom:2 }}>{card.romaji}</div>
              <div style={{ fontSize:15, fontWeight:800 }}>{card.english}</div>
              {card.mnemonic && <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, marginTop:2 }}>💡 {card.mnemonic}</div>}
            </div>
            <button onClick={() => onRemove(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:20, padding:4 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Swipe card with front answers + back reveal ───────────────
function SwipeCard({ card, allCards, onNext, onSave, onRepeat }) {
  // answer: null | { idx: number, correct: boolean } — set atomically in one setState
  const [answer, setAnswer]         = useState(null)
  const [flipped, setFlipped]       = useState(false)
  const [dragX, setDragX]           = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [exiting, setExiting]       = useState(null)
  const startX   = useRef(0)
  const startY   = useRef(0)
  const dragging = useRef(false)
  const THRESHOLD = 80

  // Build options once at mount using a lazy useState initializer (runs exactly once, immune to StrictMode double-invoke)
  const [{ options, answerIdx }] = useState(() => buildOptions(card, allCards))

  const selectedIdx = answer?.idx ?? null
  const isCorrect   = answer?.correct ?? false

  function pickAnswer(i) {
    if (flipped || answer !== null) return
    const correct = i === answerIdx
    setAnswer({ idx: i, correct })
    speak(card.character)
    // Longer delay when correct so user sees the green flash
    setTimeout(() => setFlipped(true), correct ? 700 : 500)
  }

  // ── Swipe / drag handlers ─────────────────────────────────────
  function getX(e) { return e.touches ? e.touches[0].clientX : e.clientX }
  function getY(e) { return e.touches ? e.touches[0].clientY : e.clientY }

  function onStart(e) { startX.current = getX(e); startY.current = getY(e); dragging.current = true }

  function onMove(e) {
    if (!dragging.current) return
    const dx = getX(e) - startX.current
    const dy = getY(e) - startY.current
    if (!isDragging && Math.abs(dx) < 8 && Math.abs(dy) > 12) { dragging.current = false; return }
    if (Math.abs(dx) > 6) { setIsDragging(true); setDragX(dx); if (e.cancelable) e.preventDefault() }
  }

  function onEnd(e) {
    if (!dragging.current) return
    dragging.current = false
    const totalDx = getX(e.changedTouches?.[0] || e) - startX.current
    const totalDy = getY(e.changedTouches?.[0] || e) - startY.current
    setIsDragging(false); setDragX(0)

    // Tap = flip (only if not yet answered)
    if (Math.abs(totalDx) < 12 && Math.abs(totalDy) < 12) {
      if (!flipped && answer === null) setFlipped(f => !f)
      return
    }

    if (Math.abs(totalDx) >= THRESHOLD) {
      const dir = totalDx > 0 ? 'right' : 'left'
      setExiting(dir)
      setTimeout(() => { setExiting(null); dir === 'right' ? onSave() : onNext() }, 300)
    }
  }

  const cardTransform = exiting === 'left'  ? 'translateX(-130%) rotate(-18deg)'
    : exiting === 'right' ? 'translateX(130%) rotate(18deg)'
    : `translateX(${dragX}px) rotate(${dragX / 20}deg)`

  const transition = isDragging ? 'none' : exiting ? 'transform 0.28s ease, opacity 0.28s ease' : 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)'

  // Swipe glow
  const showLeft  = dragX < -40
  const showRight = dragX > 40

  return (
    <div style={{ position:'relative', marginBottom:14, touchAction:'pan-y' }}>

      {/* Swipe glow underlay */}
      <div style={{
        position:'absolute', inset:0, borderRadius:16, zIndex:0, pointerEvents:'none',
        background: showRight ? 'rgba(255,178,62,0.10)' : showLeft ? 'rgba(77,141,255,0.09)' : 'transparent',
        border: showRight ? '2px solid var(--gold)' : showLeft ? '2px solid var(--blue)' : '2px solid transparent',
        transition:'all 0.1s',
        display:'flex', alignItems:'center',
        justifyContent: showRight ? 'flex-end' : 'flex-start', padding:'0 20px',
      }}>
        {(showRight || showLeft) && (
          <span style={{ fontSize:13, fontWeight:900, color: showRight ? 'var(--gold)' : 'var(--blue)', opacity: Math.min(1, Math.abs(dragX)/60) }}>
            {showRight ? '⭐ Save' : '→ Next'}
          </span>
        )}
      </div>

      {/* Card wrapper — drag & flip */}
      <div
        onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd}
        onMouseLeave={e => { if (dragging.current) onEnd(e) }}
        onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
        style={{
          position:'relative', zIndex:1, userSelect:'none',
          transform: cardTransform, opacity: exiting ? 0 : 1,
          transition, perspective:1000,
        }}>

        {/* 3D flip container */}
        <div style={{
          transformStyle:'preserve-3d',
          transition:'transform 0.42s cubic-bezier(0.4,0,0.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'none',
        }}>

          {/* ── FRONT — character + kana + 4 answer options ── */}
          <div className="card" style={{
            backfaceVisibility:'hidden', padding:'20px 16px',
            // Green border glow when correct, red when wrong
            transition: 'border-color 0.15s, box-shadow 0.15s',
            border: answer !== null
              ? answer.correct
                ? '2px solid var(--green)'
                : '2px solid var(--red)'
              : '1px solid var(--border)',
            boxShadow: answer?.correct
              ? '0 0 28px rgba(52,211,153,0.5), inset 0 0 20px rgba(52,211,153,0.08)'
              : answer?.correct === false
              ? '0 0 20px rgba(255,90,95,0.3)'
              : 'none',
            animation: answer?.correct === true ? 'correctFlash 0.65s ease' : answer?.correct === false ? 'wrongFlash 0.4s ease' : 'none',
          }}>
            {/* Character */}
            <div style={{ textAlign:'center', marginBottom:12, cursor:'default', position:'relative' }}>
              {/* Big ✓ burst when correct */}
              {answer?.correct === true && (
                <div style={{
                  position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:72, pointerEvents:'none', zIndex:10,
                  animation:'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  ✅
                </div>
              )}
              <div style={{
                fontFamily:"'Noto Serif JP',serif",
                fontSize: card.character?.length <= 1 ? 88 : card.character?.length <= 2 ? 72 : card.character?.length <= 4 ? 54 : card.character?.length <= 7 ? 36 : card.character?.length <= 12 ? 26 : 20,
                fontWeight:900, lineHeight:1.2, marginBottom:6,
                transition:'opacity 0.2s',
                opacity: answer?.correct === true ? 0.3 : 1,
              }}>
                {card.character}
              </div>
              {KANA_MAP[card.character] && (
                <div style={{ fontFamily:"'Noto Serif JP',serif", fontSize: card.character?.length > 8 ? 12 : 16, color:'var(--blue)', fontWeight:500, letterSpacing:2 }}>
                  {KANA_MAP[card.character]}
                </div>
              )}
            </div>

            {/* 4 answer options — only for vocab cards with english */}
            {card.english && options.length > 0 && (
              <>
                <div style={{ height:1, background:'var(--border)', margin:'12px 0', opacity:0.5 }} />
                <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'var(--muted)', textAlign:'center', marginBottom:10 }}>
                  What does this mean?
                </div>
                <div className="grid-2" style={{ gap:10 }}>
                  {options.map((opt, i) => {
                    let bg = 'var(--bg3)', border = 'var(--border)', color = 'var(--text)', scale = 'scale(1)'
                    if (answer !== null) {
                      if (i === answerIdx)                              { bg='rgba(52,211,153,0.14)'; border='var(--green)'; color='var(--green)'; scale='scale(1.03)' }
                      else if (i === answer.idx && !answer.correct)    { bg='rgba(255,90,95,0.12)';  border='var(--red)';   color='var(--red)' }
                      else                                               { bg='var(--bg3)'; border='var(--border)'; color='var(--muted)' }
                    }
                    return (
                      <div key={i} onClick={() => pickAnswer(i)} style={{
                        background:bg, border:`2px solid ${border}`, color,
                        padding:'13px 10px', borderRadius:12,
                        cursor: answer !== null ? 'default' : 'pointer',
                        fontSize:14, fontWeight:700, textAlign:'center',
                        transition:'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                        transform: scale, minHeight:48,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {opt}
                        {answer !== null && i === answerIdx && ' ✓'}
                        {answer !== null && i === answer.idx && !answer.correct && ' ✗'}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            {/* Grammar/sentence cards — just show tap to reveal */}
            {(!card.english || options.length === 0) && (
              <div style={{ textAlign:'center', fontSize:12, color:'var(--muted)', fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginTop:16 }}>tap to reveal</div>
            )}
          </div>

          {/* ── BACK — full answer reveal ── */}
          <div className="card" style={{ backfaceVisibility:'hidden', transform:'rotateY(180deg)', position:'absolute', inset:0, padding:'20px 16px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            {/* Result badge — only shown after answer picked */}
            {answer !== null && (
              <div style={{
                fontSize:13, fontWeight:900, letterSpacing:1, marginBottom:10,
                color: answer.correct ? 'var(--green)' : 'var(--red)',
                background: answer.correct ? 'rgba(52,211,153,0.12)' : 'rgba(255,90,95,0.10)',
                border: `1px solid ${answer.correct ? 'var(--green)' : 'var(--red)'}`,
                padding:'4px 14px', borderRadius:999,
              }}>
                {answer.correct ? '✅ Correct!' : `❌ It was「${card.english}」`}
              </div>
            )}

            <button className="btn btn-icon" style={{ marginBottom:10, fontSize:12 }}
              onClick={e => { e.stopPropagation(); speak(card.character) }}>🔊 Play</button>

            <div style={{ fontFamily:"'Noto Serif JP',serif", fontSize:34, fontWeight:900, marginBottom:2 }}>{card.character}</div>
            <div style={{ fontFamily:"'Noto Serif JP',serif", fontSize:15, color:'var(--blue)', fontWeight:600, letterSpacing:2, marginBottom:6 }}>{card.romaji}</div>
            <div style={{ fontSize:26, fontWeight:800, color:'var(--red)', marginBottom:12 }}>{card.english}</div>

            {card.example_jp && (
              <div style={{ textAlign:'center', background:'var(--bg3)', borderRadius:10, padding:'10px 14px', marginBottom:8, width:'100%' }}>
                <div style={{ fontFamily:"'Noto Serif JP',serif", fontSize:13 }}>{card.example_jp}</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:4, fontWeight:600 }}>{card.example_en}</div>
              </div>
            )}
            {card.mnemonic && (
              <div style={{ fontSize:12, color:'var(--gold)', fontWeight:700, textAlign:'center', padding:'8px 12px', background:'rgba(255,178,62,0.08)', borderRadius:8, width:'100%' }}>
                💡 {card.mnemonic}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 3 action buttons — only after flip ── */}
      {flipped && (
        <div className="slide-up" style={{ display:'flex', gap:10, marginTop:2 }}>
          {/* Left: Repeat — go back to front for retry */}
          <button onClick={onRepeat}
            style={{ flex:1, padding:'14px 0', borderRadius:12, border:'2px solid var(--border)', background:'var(--bg3)', color:'var(--muted)', fontWeight:800, fontSize:13, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, transition:'all 0.15s', minHeight:56 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--purple)'; e.currentTarget.style.color='var(--purple)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--muted)' }}>
            <span style={{ fontSize:16 }}>🔁</span>
            <span>Repeat</span>
          </button>
          {/* Center: Save */}
          <button onClick={onSave}
            style={{ flex:1, padding:'14px 0', borderRadius:12, border:'2px solid var(--gold-dim)', background:'rgba(255,178,62,0.08)', color:'var(--gold)', fontWeight:800, fontSize:13, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, transition:'all 0.15s', minHeight:56 }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,178,62,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,178,62,0.08)' }}>
            <span style={{ fontSize:16 }}>⭐</span>
            <span>Save</span>
          </button>
          {/* Right: Next */}
          <button onClick={onNext}
            style={{ flex:1, padding:'14px 0', borderRadius:12, border:'2px solid var(--blue-dim)', background:'rgba(77,141,255,0.08)', color:'var(--blue)', fontWeight:800, fontSize:13, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:2, transition:'all 0.15s', minHeight:56 }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(77,141,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(77,141,255,0.08)' }}>
            <span style={{ fontSize:16 }}>→</span>
            <span>Next</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main Flashcards page ──────────────────────────────────────
export default function Flashcards({ module: mod, level, onBack, onXPEarned, ctx }) {
  const { user } = useAuth()
  const allCards = resolveCards(mod, ctx?.subDeck)

  const [idx, setIdx]           = useState(0)
  const [cardKey, setCardKey]   = useState(0)   // increment to force SwipeCard remount (repeat)
  const [results, setResults]   = useState([])
  const [finished, setFinished] = useState(false)
  const [saved, setSaved]       = useState([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [justSaved, setJustSaved]     = useState(false)
  const xpFired = useRef(false)

  useEffect(() => {
    if (!finished || xpFired.current) return
    xpFired.current = true
    const totalXP = results.reduce((sum, r) => sum + r.xp, 0)
    const perfect  = results.every(r => r.quality >= 3)
    onXPEarned?.({ xp: totalXP, module: mod, level, srsResults: results, quizPerfect: perfect })
  }, [finished])

  useEffect(() => {
    if (!user) return
    supabase.from('flashcard_sessions')
      .select('card_id, flashcard_content(character, romaji, english, mnemonic)')
      .eq('user_id', user.id).eq('saved', true)
      .then(({ data }) => { if (data?.length) setSaved(data.map(r => r.flashcard_content).filter(Boolean)) })
  }, [user?.id])

  if (!allCards.length) return (
    <div style={{ maxWidth:600, margin:'0 auto', padding:32 }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom:24 }}>← Back</button>
      <div className="empty"><div className="empty-icon">🚧</div>No cards available yet.</div>
    </div>
  )

  const card = allCards[idx]
  const progress = (idx / allCards.length) * 100

  function advance(quality, isSave = false) {
    const srsResult = sm2({ ease_factor:2.5, interval_days:1, repetitions:0 }, quality)
    const xpMap = { 5:10, 3:5, 1:1 }
    setResults(r => [...r, { card, quality, xp: xpMap[quality], ...srsResult }])
    if (isSave) {
      setSaved(s => s.some(c => c.character === card.character) ? s : [...s, card])
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 1200)
      if (user) {
        supabase.from('flashcard_sessions').upsert({
          user_id: user.id, card_id: `${mod}_${card.character}`, saved: true,
          ease_factor: srsResult.ease_factor, interval_days: srsResult.interval_days,
          repetitions: srsResult.repetitions, next_review: srsResult.next_review,
          updated_at: new Date().toISOString(),
        }, { onConflict:'user_id,card_id' })
      }
    }
    setTimeout(() => {
      if (idx + 1 >= allCards.length) setFinished(true)
      else { setIdx(i => i + 1); setCardKey(k => k + 1) }
    }, 50)
  }

  function handleNext()   { advance(3) }
  function handleSave()   { advance(5, true) }
  function handleRepeat() {
    // Reset same card — increment key to remount SwipeCard fresh
    setCardKey(k => k + 1)
  }

  // ── Results screen ───────────────────────────────────────────
  if (finished) {
    const savedCount = results.filter(r => r.quality === 5).length
    const totalXP    = results.reduce((sum, r) => sum + r.xp, 0)
    const perfect    = results.every(r => r.quality >= 3)
    return (
      <div style={{ maxWidth:600, margin:'0 auto', padding:32 }}>
        <Confetti count={perfect ? 140 : 80} />
        <div className="card pop-in" style={{ padding:40, textAlign:'center' }}>
          <div className="celebrate-burst" style={{ marginBottom:8 }}>{perfect ? '🏆' : '🎉'}</div>
          <div style={{ fontFamily:"'Noto Serif JP',serif", fontSize:28, fontWeight:900, marginBottom:8 }}>
            {perfect ? 'Perfect Run!' : 'Session Complete!'}
          </div>
          <div style={{ fontSize:13, color:'var(--muted)', fontWeight:700, marginBottom:16 }}>
            {MODULE_META[mod]?.label} · {results.length} cards
          </div>
          <div style={{ display:'inline-block', fontSize:20, fontWeight:900, color:'#fff', background:'var(--grad-fun)', padding:'8px 24px', borderRadius:999, marginBottom:24 }}>
            +{totalXP} XP ⚡
          </div>
          <div className="grid-2" style={{ marginBottom:24 }}>
            <div className="card" style={{ padding:16, textAlign:'center' }}>
              <div style={{ fontSize:24, fontWeight:900, color:'var(--gold)' }}>{savedCount}</div>
              <div style={{ fontSize:11, color:'var(--muted)', fontWeight:700 }}>⭐ Saved</div>
            </div>
            <div className="card" style={{ padding:16, textAlign:'center' }}>
              <div style={{ fontSize:24, fontWeight:900, color:'var(--blue)' }}>{results.length - savedCount}</div>
              <div style={{ fontSize:11, color:'var(--muted)', fontWeight:700 }}>✓ Reviewed</div>
            </div>
          </div>
          <div className="flex" style={{ justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn btn-primary" onClick={() => { setIdx(0); setCardKey(k=>k+1); setResults([]); setFinished(false); xpFired.current=false }}>Review Again</button>
            {saved.length > 0 && (
              <button className="btn btn-secondary" style={{ borderColor:'var(--gold)', color:'var(--gold)' }} onClick={() => setShowLibrary(true)}>⭐ Saved ({saved.length})</button>
            )}
            <button className="btn btn-secondary" onClick={onBack}>Back</button>
          </div>
        </div>
        {showLibrary && <SavedLibrary saved={saved} onClose={() => setShowLibrary(false)} onRemove={i => setSaved(s => s.filter((_,j) => j!==i))} />}
      </div>
    )
  }

  return (
    <div style={{ maxWidth:600, margin:'0 auto', padding:'24px 20px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <button className="btn btn-secondary" style={{ fontSize:13, padding:'6px 14px' }} onClick={onBack}>← Back</button>
        <div style={{ fontSize:13, color:'var(--muted)', fontWeight:700 }}>{idx + 1} / {allCards.length}</div>
        <button className="btn btn-icon"
          style={{ fontSize:13, color: saved.length ? 'var(--gold)' : 'var(--muted)', borderColor: saved.length ? 'var(--gold-dim)' : undefined }}
          onClick={() => setShowLibrary(true)}>
          ⭐ {saved.length}
        </button>
      </div>

      {/* Progress */}
      <div className="progress-bar" style={{ marginBottom:16 }}>
        <div className="progress-fill" style={{ width:`${progress}%` }} />
      </div>

      {/* Swipe hints */}
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, padding:'0 2px' }}>
        <span style={{ fontSize:11, color:'var(--blue)', fontWeight:700, opacity:0.7 }}>← swipe left · next</span>
        <span style={{ fontSize:11, color:'var(--gold)', fontWeight:700, opacity:0.7 }}>save ⭐ · swipe right →</span>
      </div>

      {/* Saved toast */}
      {justSaved && (
        <div className="pop-in" style={{ textAlign:'center', marginBottom:8, fontSize:14, fontWeight:800, color:'var(--gold)' }}>
          ⭐ Saved to library!
        </div>
      )}

      {/* SwipeCard — key = idx + cardKey so Repeat remounts without advancing */}
      <SwipeCard
        key={`${idx}-${cardKey}`}
        card={card}
        allCards={allCards}
        onNext={handleNext}
        onSave={handleSave}
        onRepeat={handleRepeat}
      />

      {showLibrary && <SavedLibrary saved={saved} onClose={() => setShowLibrary(false)} onRemove={i => setSaved(s => s.filter((_,j) => j!==i))} />}
    </div>
  )
}
