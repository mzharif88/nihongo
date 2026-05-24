import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import { XPFloat } from './lib/celebrate'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Flashcards from './pages/Flashcards'
import Quiz from './pages/Quiz'
import MockTest from './pages/MockTest'
import { Resources, Leaderboard, Profile, ModuleSelector } from './pages/Pages'

const NAV = [
  { key: 'dashboard',   label: 'Home' },
  { key: 'mock',        label: 'JLPT Mock' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'resources',   label: 'Resources' },
  { key: 'profile',     label: 'Profile' },
]

function AppInner() {
  const { user, profile, loading } = useAuth()
  const [screen, setScreen] = useState('landing')
  const [ctx, setCtx]       = useState({})
  const [totalXP, setTotalXP] = useState(0)
  const [xpPulse, setXpPulse] = useState(0)      // bumps the nav chip
  const [xpGain, setXpGain]   = useState(null)   // drives the floating toast

  function navigate(s, c = {}) { setCtx(c); setScreen(s) }

  async function handleXPEarned(xp) {
    if (!xp) return
    const newXP = totalXP + xp
    setTotalXP(newXP)
    setXpGain({ amount: xp, t: Date.now() })
    setXpPulse(p => p + 1)
    if (!user) return
    // Persist to Supabase
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('progress').upsert({
      user_id: user.id,
      module: ctx.module || 'general',
      level: ctx.level || 'beginner',
      xp: newXP,
      last_study_date: today,
      unlocked: true,
    }, { onConflict: 'user_id,module,level' })
  }

  if (!loading && user && screen === 'landing') setScreen('dashboard')
  if (!loading && !user && screen !== 'landing') setScreen('landing')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="nav-logo" style={{ fontSize: 40 }}>
        日本<span className="go">GO!</span>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh' }}>
      {user && (
        <nav className="nav">
          <div className="nav-logo">日本<span className="go">GO!</span></div>
          <div className="nav-links">
            {NAV.map(n => (
              <button key={n.key} className={`nav-btn ${screen === n.key ? 'active' : ''}`} onClick={() => navigate(n.key)}>{n.label}</button>
            ))}
          </div>
          <div className="nav-right">
            <span className={`nav-xp ${xpPulse ? 'bump' : ''}`} key={xpPulse}>⚡ {totalXP} XP</span>
            <div className="nav-avatar" onClick={() => navigate('profile')}>
              {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="u" /> : '🧑'}
            </div>
          </div>
        </nav>
      )}
      {xpGain && <XPFloat amount={xpGain.amount} trigger={xpGain.t} />}
      <main className="main">
        {screen === 'landing'     && <Landing />}
        {screen === 'dashboard'   && <Dashboard onNavigate={navigate} totalXP={totalXP} />}
        {screen === 'module'      && <ModuleSelector module={ctx.module} onBack={() => navigate('dashboard')} onSelect={(lv, mode) => navigate(mode, { module: ctx.module, level: lv })} />}
        {screen === 'flashcards'  && <Flashcards module={ctx.module || 'hiragana'} level={ctx.level || 'beginner'} onBack={() => navigate('dashboard')} onXPEarned={handleXPEarned} />}
        {screen === 'quiz'        && <Quiz module={ctx.module || 'hiragana'} level={ctx.level || 'beginner'} onBack={() => navigate('dashboard')} onXPEarned={handleXPEarned} />}
        {screen === 'mock'        && <MockTest onBack={() => navigate('dashboard')} onXPEarned={handleXPEarned} />}
        {screen === 'leaderboard' && <Leaderboard onBack={() => navigate('dashboard')} totalXP={totalXP} />}
        {screen === 'resources'   && <Resources onBack={() => navigate('dashboard')} />}
        {screen === 'profile'     && <Profile onBack={() => navigate('dashboard')} totalXP={totalXP} />}
      </main>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}
