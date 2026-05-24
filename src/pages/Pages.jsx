import { useState } from 'react'
import { RESOURCES, BADGES, JLPT_LEVELS, MODULE_META, LEVEL_META } from '../data/content'
import { useAuth } from '../hooks/useAuth'

// ─── Resources Hub ────────────────────────────────────────────────────────
export function Resources({ onBack }) {
  const [tab, setTab] = useState('podcasts')
  const items = RESOURCES[tab]
  return (
    <div className="page">
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="page-title">Resources Hub 📚</div>
      <div className="page-sub">Curated content to immerse yourself in real Japanese — organized by level</div>

      <div className="flex" style={{ marginBottom: 24 }}>
        {[['podcasts','🎙️ Podcasts'], ['youtube','📺 YouTube']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ background: tab === k ? 'rgba(220,38,38,0.1)' : 'none', border: `1px solid ${tab === k ? 'var(--red)' : 'var(--border)'}`, color: tab === k ? 'var(--red)' : 'var(--muted)', padding: '8px 20px', borderRadius: 4, cursor: 'pointer', fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, transition: 'all 0.15s' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {items.map(r => (
          <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 18, textDecoration: 'none', color: 'var(--text)', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{r.name}</div>
            <div style={{ fontSize: 10, color: 'var(--red)', fontFamily: "'DM Mono', monospace", letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{r.level}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'DM Mono', monospace", lineHeight: 1.5, marginBottom: 10 }}>{r.desc}</div>
            <div style={{ fontSize: 11, color: 'var(--blue)', fontFamily: "'DM Mono', monospace" }}>→ Open {tab === 'youtube' ? 'YouTube' : 'Podcast'}</div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────
export function Leaderboard({ onBack }) {
  const { profile } = useAuth()
  const mock = [
    { rank: 1, name: 'Yuki T.',                              xp: 4820, badge: '🏆', streak: 45 },
    { rank: 2, name: 'Hana M.',                              xp: 3960, badge: '🎌', streak: 30 },
    { rank: 3, name: 'Kenji R.',                             xp: 3120, badge: '🔥', streak: 21 },
    { rank: 4, name: profile?.display_name || 'You',         xp: 0,    badge: '⭐', streak: 0, isYou: true },
    { rank: 5, name: 'Alex W.',                              xp: 0,    badge: '',   streak: 0 },
  ]
  const rankDisplay = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`
  const rankColor   = r => r === 1 ? '#D97706' : r === 2 ? '#9CA3AF' : r === 3 ? '#92400E' : 'var(--muted)'

  return (
    <div className="page">
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="page-title">Leaderboard 🏆</div>
      <div className="page-sub">Weekly XP rankings — resets every Monday 00:00 UTC</div>

      <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Rank','Player','Streak','Weekly XP'].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)', fontFamily: "'DM Mono', monospace", fontWeight: 400, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mock.map(r => (
              <tr key={r.rank} style={{ background: r.isYou ? 'rgba(220,38,38,0.05)' : '' }}>
                <td style={{ padding: '14px 16px', fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: rankColor(r.rank), borderBottom: '1px solid var(--border)' }}>{rankDisplay(r.rank)}</td>
                <td style={{ padding: '14px 16px', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{r.name}{r.isYou ? ' (you)' : ''} {r.badge}</td>
                <td style={{ padding: '14px 16px', fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>🔥 {r.streak}d</td>
                <td style={{ padding: '14px 16px', fontFamily: "'DM Mono', monospace", color: 'var(--gold)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>{r.xp.toLocaleString()} XP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
        Study daily to climb the ranks. More users join as the app grows!
      </div>
    </div>
  )
}

// ─── Profile ──────────────────────────────────────────────────────────────
export function Profile({ onBack }) {
  const { profile, updateProfile, signOut } = useAuth()
  const [goal, setGoal] = useState(profile?.jlpt_goal || 'N5')

  async function handleGoal(lv) {
    setGoal(lv)
    await updateProfile({ jlpt_goal: lv })
  }

  return (
    <div className="page">
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="page-title">My Profile</div>

      {/* Profile header */}
      <div className="card" style={{ padding: 28, display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--red)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--red-dim)', fontSize: 32 }}>
          {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" /> : '🧑'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{profile?.display_name || 'Learner'}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>{profile?.email || ''}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>JLPT Goal:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {JLPT_LEVELS.map(lv => (
                <button key={lv} onClick={() => handleGoal(lv)}
                  style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", padding: '4px 10px', borderRadius: 2, border: `1px solid ${goal === lv ? 'var(--red)' : 'var(--border)'}`, color: goal === lv ? 'var(--red)' : 'var(--muted)', background: goal === lv ? 'rgba(220,38,38,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {lv}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={signOut}>Sign Out</button>
      </div>

      {/* Stats */}
      <div className="section-label">— Stats Overview</div>
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[['Total XP', '0', 'pts'], ['Streak', '0', 'days'], ['Cards Reviewed', '0', 'cards'], ['Mock Tests', '0', 'taken']].map(([l, v, s]) => (
          <div key={l} className="card stat-card">
            <div className="stat-label">{l}</div>
            <div className="stat-value">{v}</div>
            <div className="stat-sub">{s}</div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="section-label">— Badges</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {BADGES.map(b => (
          <div key={b.slug} className="badge-chip locked" title={b.desc}>{b.icon} {b.name}</div>
        ))}
      </div>
    </div>
  )
}

// ─── Module Selector ──────────────────────────────────────────────────────
export function ModuleSelector({ module: mod, onSelect, onBack }) {
  const meta = MODULE_META[mod]
  return (
    <div className="page">
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="page-title">{meta.emoji} {meta.label}</div>
      <div className="page-sub">{meta.desc} — choose your level</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
        {Object.entries(LEVEL_META).map(([lv, lm]) => {
          const locked = lv !== 'beginner'
          return (
            <div key={lv} className="card" style={{ padding: 24, borderTop: `2px solid ${locked ? 'var(--border)' : meta.color}`, opacity: locked ? 0.55 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>
              <div className="flex-between" style={{ marginBottom: locked ? 0 : 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{lm.label} {locked ? '🔒' : ''}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'DM Mono', monospace" }}>
                    JLPT {lm.jlpt} · {locked ? `Requires ${lm.xpRequired} XP to unlock` : 'Available now'}
                  </div>
                </div>
                <span className="tag tag-red">{lm.jlpt}</span>
              </div>
              {!locked && (
                <div className="flex">
                  <button className="btn btn-primary" style={{ padding: '8px 18px', fontSize: 13 }}
                    onClick={() => onSelect(lv, 'flashcards')}>🃏 Flashcards</button>
                  <button className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: 13 }}
                    onClick={() => onSelect(lv, 'quiz')}>🎮 Quiz</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
