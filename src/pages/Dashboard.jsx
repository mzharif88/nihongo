import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { MODULE_META, LEVEL_META } from '../data/content'

export default function Dashboard({ onNavigate }) {
  const { profile }                           = useAuth()
  const { totalXP, streak, dueToday, earnedBadges, allBadges } = useProgress()

  const name     = profile?.display_name?.split(' ')[0] || 'Learner'
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'おはよう' : hour < 18 ? 'こんにちは' : 'こんばんは'

  // XP to next milestone (every 500 XP)
  const milestone     = Math.ceil((totalXP + 1) / 500) * 500
  const toNextMilestone = milestone - totalXP
  const milestoneProgress = ((500 - toNextMilestone) / 500) * 100

  return (
    <div className="page">
      <div className="page-title">{greeting}, {name} 👋</div>
      <div className="page-sub">
        Your Japanese mastery journey · JLPT goal: <strong style={{ color: 'var(--blue)' }}>{profile?.jlpt_goal || 'N5'}</strong>
      </div>

      {/* Top stats */}
      <div className="grid-3" style={{ marginBottom: 32 }}>
        <div className="card stat-card" style={{ borderTop: '3px solid var(--gold)' }}>
          <div className="stat-label">Total XP</div>
          <div className="stat-value stat-gold">{totalXP.toLocaleString()}</div>
          <div className="progress-bar" style={{ marginTop: 10 }}>
            <div className="progress-fill" style={{ width: `${milestoneProgress}%` }} />
          </div>
          <div className="stat-sub">{toNextMilestone} XP to next milestone</div>
        </div>
        <div className="card stat-card" style={{ borderTop: '3px solid var(--red)' }}>
          <div className="stat-label">Daily Streak</div>
          <div className="stat-value stat-red">🔥 {streak}</div>
          <div className="stat-sub">{streak > 0 ? 'Keep it going!' : 'Study today to start!'}</div>
        </div>
        <div className="card stat-card" style={{ borderTop: '3px solid var(--blue)', cursor: 'pointer' }}
          onClick={() => dueToday.length && onNavigate('flashcards', { module: 'review', level: 'due' })}>
          <div className="stat-label">Due Today</div>
          <div className="stat-value stat-blue">{dueToday.length}</div>
          <div className="stat-sub">{dueToday.length > 0 ? '← Tap to review!' : 'All caught up 🎉'}</div>
        </div>
      </div>

      {/* Due Today queue banner */}
      {dueToday.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(77,141,255,0.15), rgba(167,139,250,0.15))',
          border: '1px solid var(--blue)', borderRadius: 14, padding: '16px 20px',
          marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          cursor: 'pointer',
        }} onClick={() => onNavigate('flashcards', { module: 'hiragana', level: 'beginner', dueMode: true })}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>📬 {dueToday.length} cards due for review</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>SRS queue — cards your brain is ready to reinforce</div>
          </div>
          <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Review Now →</button>
        </div>
      )}

      {/* Modules */}
      <div className="section-label">— Study Modules</div>
      <div className="grid-3" style={{ marginBottom: 32 }}>
        {Object.entries(MODULE_META).map(([key, meta], i) => (
          <div key={key} className="card module-card pop-in"
            style={{ padding: 24, cursor: 'pointer', borderTop: `3px solid ${meta.color}`, animationDelay: `${i * 0.06}s` }}
            onClick={() => onNavigate('module', { module: key })}>
            <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 52, marginBottom: 10, lineHeight: 1, color: meta.color }}>{meta.char}</div>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 4 }}>{meta.label}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 16 }}>{meta.desc}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 999, background: `${meta.color}1a`, color: meta.color, border: `1px solid ${meta.color}` }}>🃏 Flashcards</span>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 999, background: 'var(--bg3)', color: 'var(--purple)', border: '1px solid var(--purple)' }}>🎮 Quiz</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="section-label">— Quick Actions</div>
      <div className="flex" style={{ flexWrap: 'wrap', marginBottom: 32 }}>
        <button className="btn btn-primary" onClick={() => onNavigate('flashcards', { module: 'hiragana', level: 'beginner' })}>🃏 Flashcards</button>
        <button className="btn btn-secondary" onClick={() => onNavigate('quiz', { module: 'hiragana', level: 'beginner' })}>🎮 Quick Quiz</button>
        <button className="btn btn-secondary" onClick={() => onNavigate('mock')}>📝 JLPT Mock</button>
        <button className="btn btn-secondary" onClick={() => onNavigate('resources')}>📺 Resources</button>
        <button className="btn btn-secondary" onClick={() => onNavigate('leaderboard')}>🏆 Leaderboard</button>
      </div>

      {/* Badges */}
      <div className="section-label">— Badges</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {allBadges.slice(0, 10).map(b => {
          const earned = earnedBadges.includes(b.slug)
          return (
            <div key={b.slug} className={`badge-chip ${earned ? '' : 'locked'} ${earned ? 'just-earned' : ''}`}
              style={{ cursor: earned ? 'default' : 'not-allowed' }}
              title={earned ? `${b.name} — ${b.description}` : `Locked: ${b.description}`}>
              {b.icon} {b.name}
              {earned && <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 800 }}>+{b.xp_reward}</span>}
            </div>
          )
        })}
        <button className="btn btn-icon" style={{ fontSize: 12 }} onClick={() => onNavigate('profile')}>View all →</button>
      </div>
    </div>
  )
}
