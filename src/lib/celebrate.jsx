import { useEffect, useState } from 'react'

const CONFETTI_COLORS = ['#FF5A5F', '#FFB23E', '#4D8DFF', '#34D399', '#A78BFA', '#F472B6']

/**
 * Confetti — fires a burst of falling confetti pieces for `duration` ms.
 * Render conditionally: {show && <Confetti count={120} />}
 */
export function Confetti({ count = 110, duration = 3000 }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 2.2 + Math.random() * 1.6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 7 + Math.random() * 8,
      round: Math.random() > 0.6,
    }))
  )
  const [alive, setAlive] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setAlive(false), duration)
    return () => clearTimeout(t)
  }, [duration])
  if (!alive) return null
  return (
    <div className="confetti-wrap" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.round ? '50%' : 2,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/**
 * XPFloat — a "+N XP" toast that floats up and fades near the nav XP counter.
 * Pass a unique `trigger` value (e.g. a timestamp) to re-fire; the element
 * remounts via `key` and the CSS animation handles its own lifetime.
 */
export function XPFloat({ amount, trigger }) {
  if (!trigger || !amount) return null
  return <XPFloatToast key={trigger} amount={amount} />
}

function XPFloatToast({ amount }) {
  const [gone, setGone] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 1300)
    return () => clearTimeout(t)
  }, [])
  if (gone) return null
  return <div className="xp-float">+{amount} XP ⚡</div>
}

/**
 * useConfetti — small helper to trigger a one-shot confetti burst.
 * const { burst, fire } = useConfetti(); ... fire(); ... {burst && <Confetti/>}
 */
export function useConfetti(duration = 3000) {
  const [burst, setBurst] = useState(false)
  function fire() {
    setBurst(false)
    requestAnimationFrame(() => setBurst(true))
    setTimeout(() => setBurst(false), duration + 200)
  }
  return { burst, fire }
}
