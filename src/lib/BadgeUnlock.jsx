import { useEffect, useState } from 'react'
import { Confetti } from './celebrate'

/**
 * BadgeUnlock — animated badge notification overlay
 * Appears when useProgress().newBadge is set, then auto-dismisses.
 */
export default function BadgeUnlock({ badge, onDone }) {
  const [phase, setPhase] = useState('in')   // in → show → out

  useEffect(() => {
    if (!badge) return
    const t1 = setTimeout(() => setPhase('show'), 50)
    const t2 = setTimeout(() => setPhase('out'),  3800)
    const t3 = setTimeout(() => { onDone?.(); setPhase('in') }, 4400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [badge?.slug])

  if (!badge) return null

  const visible = phase === 'in' || phase === 'show'

  return (
    <>
      <Confetti count={80} duration={4000} />
      <div style={{
        position: 'fixed', bottom: 32, left: '50%',
        transform: `translateX(-50%) translateY(${phase === 'show' ? '0' : '120px'})`,
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 400,
        background: 'linear-gradient(135deg, #1b1b28, #25253a)',
        border: '2px solid var(--gold)',
        borderRadius: 20,
        padding: '20px 32px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: '0 8px 40px rgba(255,178,62,0.4), 0 2px 0 rgba(0,0,0,0.3)',
        minWidth: 320, maxWidth: 420,
        opacity: visible ? 1 : 0,
        pointerEvents: phase === 'show' ? 'auto' : 'none',
      }}>
        {/* Badge icon with pulse ring */}
        <div className="glow-ring" style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(255,178,62,0.15)',
          border: '2px solid var(--gold)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, flexShrink: 0,
        }}>
          {badge.icon}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 2 }}>
            🏅 Badge Unlocked!
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>
            {badge.name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
            {badge.description}
          </div>
          {badge.xp_reward > 0 && (
            <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 800, marginTop: 4 }}>
              +{badge.xp_reward} XP bonus ⚡
            </div>
          )}
        </div>

        <button onClick={() => { setPhase('out'); setTimeout(onDone, 500) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, flexShrink: 0, padding: 4, borderRadius: 8 }}>
          ✕
        </button>
      </div>
    </>
  )
}
