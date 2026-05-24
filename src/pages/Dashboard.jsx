import { useAuth } from '../hooks/useAuth'
import { MODULE_META, LEVEL_META } from '../data/content'

export default function Dashboard({ onNavigate }) {
  const { profile } = useAuth()
  const name = profile?.display_name?.split(' ')[0] || 'Learner'
  const xp = 0
  const streak = 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'おはよう' : hour < 18 ? 'こんにちは' : 'こんばんは'

  return (
    <div className="page">
      <div className="page-title">{greeting}, {name} 👋</div>
      <div className="page-sub">Your Japanese mastery journey. Every card gets you closer to JLPT {profile?.jlpt_goal || 'N5'}.</div>

      {/* Top stats */}
      <div className="grid-3" style={{ marginBottom: 32 }}>
        {[
          { label: 'Total XP',     value: xp.toLocaleString(), cls: 'stat-gold', sub: 'points earned' },
          { label: 'Daily Streak', value: `🔥 ${streak}`,       cls: 'stat-red',  sub: streak ? 'Keep it going!' : 'Study today to start!' },
          { label: 'JLPT Goal',    value: profile?.jlpt_goal || 'N5', cls: '',   sub: 'Update in Profile' },
        ].map(s => (
          <div key={s.label} className="card stat-card">
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.cls}`}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Modules */}
      <div className="section-label">— Study Modules</div>
      <div className="grid-3" style={{ marginBottom: 32 }}>
        {Object.entries(MODULE_META).map(([key, meta], i) => (
          <div key={key} className="card module-card pop-in" style={{ padding: 24, cursor: 'pointer', borderTop: `3px solid ${meta.color}`, animationDelay: `${i * 0.06}s` }}
            onClick={() => onNavigate('module', { module: key })}>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 52, marginBottom: 10, lineHeight: 1, color: meta.color }}>{meta.char}</div>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 4 }}>{meta.label}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 16 }}>{meta.desc}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(LEVEL_META).map(([lv, lm]) => (
                <span key={lv} style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                  padding: '4px 10px', borderRadius: 999, textTransform: 'uppercase',
                  border: `1px solid ${lv === 'beginner' ? meta.color : 'var(--border)'}`,
                  color: lv === 'beginner' ? meta.color : 'var(--muted)',
                  background: lv === 'beginner' ? `${meta.color}1a` : 'transparent',
                }}>
                  {lv === 'beginner' ? '✓ ' : '🔒 '}{lm.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="section-label">— Quick Actions</div>
      <div className="flex" style={{ flexWrap: 'wrap', marginBottom: 32 }}>
        <button className="btn btn-primary" onClick={() => onNavigate('flashcards', { module: 'hiragana', level: 'beginner' })}>🃏 Flashcards</button>
        <button className="btn btn-secondary" onClick={() => onNavigate('quiz', { module: 'hiragana', level: 'beginner' })}>🎮 Quick Quiz</button>
        <button className="btn btn-secondary" onClick={() => onNavigate('mock')}>📝 JLPT Mock Test</button>
        <button className="btn btn-secondary" onClick={() => onNavigate('resources')}>📺 Resources Hub</button>
        <button className="btn btn-secondary" onClick={() => onNavigate('leaderboard')}>🏆 Leaderboard</button>
      </div>

      {/* Badges preview */}
      <div className="section-label">— Badges</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { icon: '⭐', name: 'First Steps',   earned: false },
          { icon: '🔵', name: 'Hiragana Hero', earned: false },
          { icon: '🔴', name: 'Katakana Master', earned: false },
          { icon: '🟡', name: 'Kanji Crusher', earned: false },
          { icon: '🔥', name: '7-Day Streak',  earned: false },
          { icon: '🎌', name: 'N5 Cleared',    earned: false },
          { icon: '🏆', name: 'N1 Champion',   earned: false },
        ].map(b => (
          <div key={b.name} className={`badge-chip ${b.earned ? '' : 'locked'}`}>{b.icon} {b.name}</div>
        ))}
        <button className="btn btn-icon" style={{ fontSize: 12 }} onClick={() => onNavigate('profile')}>View all →</button>
      </div>
    </div>
  )
}
