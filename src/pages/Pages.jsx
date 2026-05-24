import { useState, useEffect } from 'react'
import { RESOURCES, JLPT_LEVELS, MODULE_META, VOCAB_WORDS } from '../data/content'
import { WORD_COLLECTIONS, ANIMAL_COLLECTIONS, THINGS_COLLECTIONS } from '../data/vocab'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { supabase } from '../lib/supabase'

// ─── Resources Hub ────────────────────────────────────────────────────────
export function Resources({ onBack }) {
  const [tab, setTab] = useState('podcasts')
  const items = RESOURCES[tab] || []
  return (
    <div className="page">
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="page-title">Resources Hub 📚</div>
      <div className="page-sub">Curated content to immerse yourself in real Japanese — organized by level</div>
      <div className="flex" style={{ marginBottom: 24 }}>
        {[['podcasts','🎙️ Podcasts'], ['youtube','📺 YouTube']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 14 }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {items.map(r => (
          <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer" className="card module-card"
            style={{ display: 'block', padding: 20, textDecoration: 'none', color: 'var(--text)', borderTop: '3px solid var(--blue)' }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{r.level}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5, marginBottom: 10 }}>{r.desc}</div>
            <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 800 }}>→ Open {tab === 'youtube' ? 'YouTube' : 'Podcast'}</div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ─── Leaderboard — real data from Supabase ────────────────────────────────
export function Leaderboard({ onBack }) {
  const { user, profile } = useAuth()
  const { totalXP, streak } = useProgress()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLeaderboard() }, [])

  async function loadLeaderboard() {
    setLoading(true)
    // Upsert current user's score first
    if (user) {
      await supabase.from('leaderboard').upsert({
        user_id: user.id,
        display_name: profile?.display_name || 'Learner',
        avatar_url: profile?.avatar_url || null,
        weekly_xp: totalXP,
        streak_days: streak,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .order('weekly_xp', { ascending: false })
      .limit(20)
    setRows(data || [])
    setLoading(false)
  }

  const rankIcon = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
  const rankColor = i => i === 0 ? 'var(--gold)' : i === 1 ? '#9CA3AF' : i === 2 ? '#CD7F32' : 'var(--muted)'

  return (
    <div className="page">
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="page-title">Leaderboard 🏆</div>
      <div className="page-sub">Weekly XP rankings — study every day to climb the ranks</div>

      {loading ? (
        <div className="empty"><div className="empty-icon" style={{ animation: 'float 1.5s ease-in-out infinite' }}>⏳</div>Loading rankings...</div>
      ) : rows.length === 0 ? (
        <div className="empty"><div className="empty-icon">🎌</div>Be the first on the leaderboard! Complete a study session.</div>
      ) : (
        <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
          {rows.map((r, i) => {
            const isYou = r.user_id === user?.id
            return (
              <div key={r.user_id} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px',
                borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                background: isYou ? 'rgba(255,178,62,0.06)' : 'transparent',
                transition: 'background 0.2s',
              }}>
                <div style={{ fontSize: i < 3 ? 24 : 16, fontWeight: 900, color: rankColor(i), minWidth: 36, textAlign: 'center' }}>{rankIcon(i)}</div>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--grad-cool)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, overflow: 'hidden' }}>
                  {r.avatar_url ? <img src={r.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '🧑'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{r.display_name}{isYou ? ' (you)' : ''}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>🔥 {r.streak_days} day streak</div>
                </div>
                <div style={{ fontWeight: 900, fontSize: 16, color: isYou ? 'var(--gold)' : 'var(--text)' }}>{(r.weekly_xp || 0).toLocaleString()} <span style={{ fontSize: 12, color: 'var(--muted)' }}>XP</span></div>
              </div>
            )
          })}
        </div>
      )}
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
        Study every day to climb — rankings are cumulative total XP
      </div>
    </div>
  )
}

// ─── Profile — live stats + real badges ───────────────────────────────────
export function Profile({ onBack }) {
  const { profile, updateProfile, signOut } = useAuth()
  const { totalXP, streak, allBadges, earnedBadges } = useProgress()
  const [goal, setGoal] = useState(profile?.jlpt_goal || 'N5')
  const [cardCount, setCardCount] = useState(0)

  useEffect(() => {
    if (profile?.id) {
      supabase.from('flashcard_sessions').select('id', { count: 'exact' }).eq('user_id', profile.id)
        .then(({ count }) => setCardCount(count || 0))
    }
  }, [profile?.id])

  async function handleGoal(lv) {
    setGoal(lv)
    await updateProfile({ jlpt_goal: lv })
  }

  const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-MY', { year: 'numeric', month: 'long' }) : '—'
  const level = totalXP < 500 ? 'Beginner' : totalXP < 2000 ? 'Elementary' : totalXP < 5000 ? 'Intermediate' : totalXP < 10000 ? 'Advanced' : 'Master'
  const levelColor = totalXP < 500 ? 'var(--blue)' : totalXP < 2000 ? 'var(--green)' : totalXP < 5000 ? 'var(--gold)' : totalXP < 10000 ? 'var(--purple)' : 'var(--red)'

  return (
    <div className="page">
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="page-title">My Profile</div>

      {/* Profile header */}
      <div className="card" style={{ padding: 28, display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, borderTop: `3px solid ${levelColor}` }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', border: `3px solid ${levelColor}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg3)', fontSize: 32 }}>
          {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" /> : '🧑'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 2 }}>{profile?.display_name || 'Learner'}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 10 }}>{profile?.email || ''} · Joined {joinedDate}</div>
          <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 800, color: '#fff', background: levelColor, padding: '4px 14px', borderRadius: 999 }}>
            {level} Learner
          </span>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: 13, padding: '8px 16px' }} onClick={signOut}>Sign Out</button>
      </div>

      {/* Stats */}
      <div className="section-label">— Stats</div>
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {[
          { l: 'Total XP',      v: totalXP.toLocaleString(), c: 'stat-gold' },
          { l: 'Day Streak',    v: `🔥 ${streak}`,           c: 'stat-red' },
          { l: 'Cards Reviewed',v: cardCount,                 c: '' },
          { l: 'Badges Earned', v: earnedBadges.length,       c: '' },
        ].map(s => (
          <div key={s.l} className="card stat-card">
            <div className="stat-label">{s.l}</div>
            <div className={`stat-value ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* JLPT goal */}
      <div className="section-label">— JLPT Goal</div>
      <div className="card" style={{ padding: 20, marginBottom: 28 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 12 }}>Which JLPT level are you working toward?</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {JLPT_LEVELS.map(lv => (
            <button key={lv} onClick={() => handleGoal(lv)} className={`btn ${goal === lv ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 20px', fontSize: 14 }}>{lv}</button>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="section-label">— Badges ({earnedBadges.length}/{allBadges.length})</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {allBadges.map(b => {
          const earned = earnedBadges.includes(b.slug)
          return (
            <div key={b.slug} className={`card ${earned ? '' : ''}`}
              style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, opacity: earned ? 1 : 0.4, filter: earned ? 'none' : 'grayscale(1)', transition: 'all 0.2s', border: earned ? `1px solid var(--gold)` : '1px solid var(--border)' }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{b.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{b.description}</div>
                {earned && <div style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 800 }}>+{b.xp_reward} XP ✓</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Onboarding Flow — 3-step first-time setup ────────────────────────────
export function Onboarding({ onComplete }) {
  const { updateProfile } = useAuth()
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState('N5')
  const [studyTime, setStudyTime] = useState(10)
  const [startModule, setStartModule] = useState('hiragana')

  async function finish() {
    await updateProfile({ jlpt_goal: goal, study_time_pref: studyTime, onboarded: true })
    onComplete?.()
  }

  const stepLabels = ['Set Your Goal', 'Study Time', 'Start Module']

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {stepLabels.map((l, i) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 14, transition: 'all 0.3s',
                background: i + 1 <= step ? 'var(--grad-fun)' : 'var(--bg3)',
                color: i + 1 <= step ? '#fff' : 'var(--muted)',
                boxShadow: i + 1 === step ? '0 4px 14px rgba(255,90,95,0.4)' : 'none',
              }}>{i + 1 < step ? '✓' : i + 1}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: i + 1 === step ? 'var(--text)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</div>
            </div>
          ))}
        </div>

        <div className="card pop-in" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{step === 1 ? '🎯' : step === 2 ? '⏱️' : '🌸'}</div>

          {step === 1 && (<>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>What's your JLPT goal?</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600, marginBottom: 28 }}>We'll tailor your study path around it</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
              {[
                { lv: 'N5', desc: 'Total beginner' },
                { lv: 'N4', desc: 'Some basics' },
                { lv: 'N3', desc: 'Intermediate' },
                { lv: 'N2', desc: 'Upper advanced' },
                { lv: 'N1', desc: 'Near-native' },
              ].map(({ lv, desc }) => (
                <div key={lv} onClick={() => setGoal(lv)}
                  className="card" style={{ padding: '14px 20px', cursor: 'pointer', border: `2px solid ${goal === lv ? 'var(--red)' : 'var(--border)'}`, background: goal === lv ? 'rgba(255,90,95,0.08)' : 'var(--card-bg)', transition: 'all 0.2s', minWidth: 80 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: goal === lv ? 'var(--red)' : 'var(--text)' }}>{lv}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{desc}</div>
                </div>
              ))}
            </div>
          </>)}

          {step === 2 && (<>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Daily study goal?</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600, marginBottom: 28 }}>Consistency beats intensity — pick what's realistic</div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
              {[
                { mins: 5, label: '5 min', emoji: '🌱', desc: 'Light' },
                { mins: 10, label: '10 min', emoji: '🌿', desc: 'Steady' },
                { mins: 20, label: '20 min', emoji: '🌳', desc: 'Focused' },
              ].map(({ mins, label, emoji, desc }) => (
                <div key={mins} onClick={() => setStudyTime(mins)}
                  className="card" style={{ padding: '20px 24px', cursor: 'pointer', border: `2px solid ${studyTime === mins ? 'var(--green)' : 'var(--border)'}`, background: studyTime === mins ? 'rgba(52,211,153,0.08)' : 'var(--card-bg)', transition: 'all 0.2s', flex: 1 }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{emoji}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: studyTime === mins ? 'var(--green)' : 'var(--text)' }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{desc}</div>
                </div>
              ))}
            </div>
          </>)}

          {step === 3 && (<>
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Where do you want to start?</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600, marginBottom: 28 }}>You can switch anytime from the dashboard</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {[
                { key: 'hiragana', emoji: 'あ', label: 'Hiragana', desc: 'Start from scratch — the alphabet first' },
                { key: 'words',    emoji: '💬', label: 'Words',    desc: 'Jump straight into vocabulary' },
                { key: 'kanji',    emoji: '漢', label: 'Kanji',    desc: 'I know kana, want to tackle kanji' },
              ].map(({ key, emoji, label, desc }) => (
                <div key={key} onClick={() => setStartModule(key)}
                  className="card" style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, border: `2px solid ${startModule === key ? 'var(--blue)' : 'var(--border)'}`, background: startModule === key ? 'rgba(77,141,255,0.08)' : 'var(--card-bg)', transition: 'all 0.2s' }}>
                  <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 32, lineHeight: 1 }}>{emoji}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: startModule === key ? 'var(--blue)' : 'var(--text)' }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </>)}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>}
            {step < 3
              ? <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>Continue →</button>
              : <button className="btn btn-primary" onClick={finish}>Let's Go! 🚀</button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Daily Challenge ───────────────────────────────────────────────────────
export function DailyChallenge({ onBack, onXPEarned }) {
  const { totalXP } = useProgress()

  // Date-seeded shuffle — same questions for everyone on the same day
  function seededRandom(seed) {
    let s = seed
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
  }
  function seededShuffle(arr, rand) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const [questions] = useState(() => {
    const today = new Date().toISOString().split('T')[0]
    const seed  = today.split('-').reduce((acc, n) => acc * 31 + parseInt(n), 0)
    const rand  = seededRandom(Math.abs(seed))
    const pool  = VOCAB_WORDS.filter(c => c.english && c.character)
    const picked = seededShuffle(pool, rand).slice(0, 5)
    return picked.map(card => {
      const others = pool.filter(x => x.character !== card.character)
      const wrong  = seededShuffle(others, rand).slice(0, 3).map(x => x.english)
      const opts   = seededShuffle([...wrong, card.english], rand)
      return { card, options: opts, answer: opts.indexOf(card.english) }
    })
  })

  const [qIdx, setQIdx]         = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore]       = useState(0)
  const [done, setDone]         = useState(false)
  const today = new Date().toLocaleDateString('en-MY', { weekday: 'long', month: 'short', day: 'numeric' })

  function handleSelect(i) {
    if (selected !== null) return
    setSelected(i)
    if (i === questions[qIdx].answer) setScore(s => s + 1)
  }

  function handleNext() {
    if (qIdx + 1 >= questions.length) { setDone(true); return }
    setQIdx(i => i + 1)
    setSelected(null)
  }

  const q = questions[qIdx]

  if (done) {
    const pct = Math.round((score / questions.length) * 100)
    const xp  = score * 20 + (pct === 100 ? 60 : 0)
    onXPEarned?.({ xp, module: 'daily_challenge', level: 'mixed' })
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: 32 }}>
        <div className="card pop-in" style={{ padding: 40, textAlign: 'center' }}>
          <div className="celebrate-burst">{pct === 100 ? '🌟' : pct >= 60 ? '🎉' : '💪'}</div>
          <div style={{ fontSize: 26, fontWeight: 900, margin: '12px 0 4px' }}>Daily Challenge Done!</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600, marginBottom: 20 }}>{today}</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: pct >= 60 ? 'var(--green)' : 'var(--red)', marginBottom: 4 }}>{score}/{questions.length}</div>
          <div style={{ display: 'inline-block', fontSize: 16, fontWeight: 900, color: '#fff', background: 'var(--grad-fun)', padding: '8px 24px', borderRadius: 999, marginBottom: 28 }}>+{xp} XP ⚡</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 24 }}>Come back tomorrow for a new challenge!</div>
          <button className="btn btn-secondary" onClick={onBack}>← Back to Home</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px' }}>
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 4 }}>⚡ Daily Challenge</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>{today}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Same questions for all learners today · {qIdx + 1} of {questions.length}</div>
      </div>
      <div className="progress-bar" style={{ marginBottom: 24 }}>
        <div className="progress-fill" style={{ width: `${((qIdx) / questions.length) * 100}%` }} />
      </div>
      <div className="card" style={{ padding: 32, marginBottom: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700, marginBottom: 16 }}>What does this mean?</div>
        <div style={{ fontFamily: "'Noto Serif JP', serif", fontSize: 72, fontWeight: 900, lineHeight: 1, marginBottom: 12 }}>{q.card.character}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{q.card.romaji}</div>
      </div>
      <div className="grid-2" style={{ marginBottom: 16 }}>
        {q.options.map((opt, i) => {
          let border = 'var(--border)', color = 'var(--text)', bg = 'var(--bg3)'
          if (selected !== null) {
            if (i === q.answer)              { border = 'var(--green)'; color = 'var(--green)'; bg = 'rgba(52,211,153,0.1)' }
            if (i === selected && i !== q.answer) { border = 'var(--red)'; color = 'var(--red)'; bg = 'rgba(255,90,95,0.08)' }
          }
          return (
            <div key={i} onClick={() => handleSelect(i)}
              style={{ background: bg, border: `1px solid ${border}`, color, padding: 16, borderRadius: 12, cursor: selected ? 'default' : 'pointer', fontSize: 15, fontWeight: 700, textAlign: 'center', transition: 'all 0.15s' }}>
              {opt}
            </div>
          )
        })}
      </div>
      {selected !== null && (
        <>
          {selected !== q.answer && q.card.mnemonic && (
            <div style={{ background: 'rgba(255,178,62,0.08)', border: '1px solid var(--gold-dim)', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>
              💡 {q.card.mnemonic}
            </div>
          )}
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }} onClick={handleNext}>
            {qIdx + 1 >= questions.length ? 'See Results 🎯' : 'Next →'}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Module Selector — collection picker ──────────────────────
export function ModuleSelector({ module: mod, onSelect, onBack }) {
  const meta = MODULE_META[mod]
  const [collection, setCollection] = useState(null)

  const COLLECTION_MAP = {
    words:   WORD_COLLECTIONS,
    animals: ANIMAL_COLLECTIONS,
    things:  THINGS_COLLECTIONS,
  }
  const collections = COLLECTION_MAP[mod] || null

  // Modules without collections → go straight to flashcards/quiz
  if (!collections || collection) {
    const cards = collection ? collection.cards : null
    return (
      <div className="page">
        <button className="btn btn-secondary"
          onClick={() => collection ? setCollection(null) : onBack()}
          style={{ marginBottom: 24 }}>← Back</button>
        <div className="page-title">{meta.emoji} {meta.label}{collection ? ` — ${collection.label}` : ''}</div>
        <div className="page-sub">{collection ? `${collection.cards.length} cards` : meta.desc}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
          <div className="card module-card" style={{ padding: 28, borderTop: `3px solid ${meta.color}`, cursor: 'pointer' }}
            onClick={() => onSelect('beginner', 'flashcards', collection?.id)}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🃏</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Flashcards</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 20 }}>
              Flip cards, self-rate, build memory with spaced repetition
            </div>
            <button className="btn btn-primary" style={{ fontSize: 14 }}
              onClick={e => { e.stopPropagation(); onSelect('beginner', 'flashcards', collection?.id) }}>
              Start Flashcards →
            </button>
          </div>
          <div className="card module-card" style={{ padding: 28, borderTop: '3px solid var(--purple)', cursor: 'pointer' }}
            onClick={() => onSelect('beginner', 'quiz', collection?.id)}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎮</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Quiz</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 20 }}>
              Multiple choice — test yourself and earn XP
            </div>
            <button className="btn btn-secondary" style={{ fontSize: 14, border: '1px solid var(--purple)', color: 'var(--purple)' }}
              onClick={e => { e.stopPropagation(); onSelect('beginner', 'quiz', collection?.id) }}>
              Start Quiz →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show collection grid
  return (
    <div className="page">
      <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: 24 }}>← Back</button>
      <div className="page-title">{meta.emoji} {meta.label}</div>
      <div className="page-sub">Choose a collection — 15 cards each · {collections.length} collections · {collections.length * 15} total cards</div>

      {/* All cards option */}
      <div className="card module-card pop-in" style={{ padding: 20, marginBottom: 16, borderTop: `3px solid ${meta.color}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        onClick={() => onSelect('beginner', 'flashcards', 'all')}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>📚 All Cards</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Study everything — {collections.length * 15} cards total</div>
        </div>
        <div className="flex">
          <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={e => { e.stopPropagation(); onSelect('beginner', 'flashcards', 'all') }}>🃏 All</button>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}
            onClick={e => { e.stopPropagation(); onSelect('beginner', 'quiz', 'all') }}>🎮 Quiz</button>
        </div>
      </div>

      <div className="grid-3">
        {collections.map((col, i) => (
          <div key={col.id} className="card module-card pop-in"
            style={{ padding: 18, cursor: 'pointer', borderTop: `3px solid ${meta.color}`, animationDelay: `${i * 0.04}s` }}
            onClick={() => setCollection(col)}>
            <div style={{ fontSize: 11, fontWeight: 800, color: meta.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
              Collection {i + 1}
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{col.label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 14 }}>{col.cards.length} cards</div>
            <div className="flex">
              <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px' }}
                onClick={e => { e.stopPropagation(); onSelect('beginner', 'flashcards', col.id) }}>🃏</button>
              <button className="btn btn-secondary" style={{ fontSize: 11, padding: '5px 12px' }}
                onClick={e => { e.stopPropagation(); onSelect('beginner', 'quiz', col.id) }}>🎮</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
