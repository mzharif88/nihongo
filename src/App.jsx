import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ProgressProvider, useProgress } from './hooks/useProgress'
import { XPFloat } from './lib/celebrate'
import BadgeUnlock from './lib/BadgeUnlock'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Flashcards from './pages/Flashcards'
import Quiz from './pages/Quiz'
import MockTest from './pages/MockTest'
import SentenceBuilder from './pages/SentenceBuilder'
import { Resources, Leaderboard, Profile, ModuleSelector, Onboarding, DailyChallenge } from './pages/Pages'

const NAV = [
  { key: 'dashboard',   label: 'Home' },
  { key: 'daily',       label: '⚡ Daily' },
  { key: 'mock',        label: 'JLPT Mock' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'resources',   label: 'Resources' },
  { key: 'profile',     label: 'Profile' },
]

// Inner app — has access to auth + progress contexts
function AppInner() {
  const { user, profile, loading, updateProfile } = useAuth()
  const progress = useProgress()
  const totalXP      = progress?.totalXP ?? 0
  const streak       = progress?.streak ?? 0
  const newBadge     = progress?.newBadge ?? null
  const clearNewBadge = progress?.clearNewBadge ?? (() => {})
  const earnXP       = progress?.earnXP ?? (() => {})

  const [screen, setScreen] = useState('landing')
  const [ctx, setCtx]       = useState({})
  const [xpPulse, setXpPulse] = useState(0)
  const [xpGain,  setXpGain]  = useState(null)

  function navigate(s, c = {}) { setCtx(c); setScreen(s) }

  async function handleXPEarned({ xp, module, level, srsResults, quizPerfect, jlptLevel, jlptPassed }) {
    if (!xp) return
    setXpGain({ amount: xp, t: Date.now() })
    setXpPulse(p => p + 1)
    await earnXP({ xp, module, level, srsResults, quizPerfect, jlptLevel, jlptPassed })
    updateProfile?.()
  }

  // Routing guards
  if (!loading && user && screen === 'landing') {
    setScreen(profile?.onboarded === false ? 'onboarding' : 'dashboard')
  }
  if (!loading && !user && screen !== 'landing') setScreen('landing')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="nav-logo" style={{ fontSize: 44 }}>
        日本<span className="go">GO!</span>
      </div>
    </div>
  )

  if (screen === 'onboarding') return (
    <Onboarding onComplete={() => { updateProfile?.(); setScreen('dashboard') }} />
  )

  return (
    <div style={{ minHeight: '100vh' }}>
      {user && (
        <nav className="nav">
          <div className="nav-logo">日本<span className="go">GO!</span></div>
          <div className="nav-links">
            {NAV.map(n => (
              <button key={n.key} className={`nav-btn ${screen === n.key ? 'active' : ''}`}
                onClick={() => navigate(n.key)}>{n.label}</button>
            ))}
          </div>
          <div className="nav-right">
            {streak > 0 && (
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)', background: 'rgba(255,90,95,0.12)', padding: '5px 12px', borderRadius: 999, border: '1px solid var(--red-dim)' }}>
                🔥 {streak}
              </span>
            )}
            <span className={`nav-xp ${xpPulse ? 'bump' : ''}`} key={xpPulse}>
              ⚡ {totalXP.toLocaleString()} XP
            </span>
            <div className="nav-avatar" onClick={() => navigate('profile')}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="u" />
                : '🧑'}
            </div>
          </div>
        </nav>
      )}

      {xpGain && <XPFloat amount={xpGain.amount} trigger={xpGain.t} />}
      {newBadge && <BadgeUnlock badge={newBadge} onDone={clearNewBadge} />}

      <main className="main">
        {screen === 'landing'     && <Landing />}
        {screen === 'dashboard'   && <Dashboard onNavigate={navigate} />}
        {screen === 'module'      && (
          <ModuleSelector
            module={ctx.module}
            onBack={() => navigate('dashboard')}
            onSelect={(lv, mode, subDeck) => navigate(mode, { module: ctx.module, level: lv, subDeck })}
          />
        )}
        {screen === 'flashcards'  && (
          <Flashcards module={ctx.module || 'hiragana'} level={ctx.level || 'beginner'}
            onBack={() => navigate('dashboard')} onXPEarned={handleXPEarned} ctx={ctx} />
        )}
        {screen === 'quiz'        && (
          <Quiz module={ctx.module || 'hiragana'} level={ctx.level || 'beginner'}
            onBack={() => navigate('dashboard')} onXPEarned={handleXPEarned} ctx={ctx} />
        )}
        {screen === 'daily'       && <DailyChallenge onBack={() => navigate('dashboard')} onXPEarned={handleXPEarned} />}
        {screen === 'mock'        && <MockTest onBack={() => navigate('dashboard')} onXPEarned={handleXPEarned} />}
        {screen === 'builder'     && <SentenceBuilder onBack={() => navigate('dashboard')} />}
        {screen === 'leaderboard' && <Leaderboard onBack={() => navigate('dashboard')} />}
        {screen === 'resources'   && <Resources onBack={() => navigate('dashboard')} />}
        {screen === 'profile'     && <Profile onBack={() => navigate('dashboard')} />}
      </main>
    </div>
  )
}

// ProgressProvider needs user/profile from AuthProvider — so it must be INSIDE AuthProvider
function AppWithAuth() {
  const { user, profile, updateProfile } = useAuth()
  return (
    <ProgressProvider user={user} profile={profile} onProfileUpdate={updateProfile}>
      <AppInner />
    </ProgressProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  )
}
