import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { sm2 } from '../lib/srs'

const ProgressContext = createContext(null)

// All badge conditions — evaluated after every XP-earning event
const BADGE_CONDITIONS = [
  {
    slug: 'first_steps',
    check: ({ sessionCount }) => sessionCount >= 1,
  },
  {
    slug: 'hiragana_hero',
    check: ({ moduleCompletions }) => moduleCompletions?.hiragana >= 1,
  },
  {
    slug: 'katakana_master',
    check: ({ moduleCompletions }) => moduleCompletions?.katakana >= 1,
  },
  {
    slug: 'kanji_crusher',
    check: ({ moduleCompletions }) => moduleCompletions?.kanji >= 1,
  },
  {
    slug: 'words_warrior',
    check: ({ moduleCompletions }) => moduleCompletions?.words >= 1,
  },
  {
    slug: 'streak_3',
    check: ({ streak }) => streak >= 3,
  },
  {
    slug: 'streak_7',
    check: ({ streak }) => streak >= 7,
  },
  {
    slug: 'streak_30',
    check: ({ streak }) => streak >= 30,
  },
  {
    slug: 'quiz_perfect',
    check: ({ lastQuizPerfect }) => lastQuizPerfect === true,
  },
  {
    slug: 'n5_cleared',
    check: ({ jlptPassed }) => jlptPassed?.includes('N5'),
  },
  {
    slug: 'n4_cleared',
    check: ({ jlptPassed }) => jlptPassed?.includes('N4'),
  },
  {
    slug: 'n3_cleared',
    check: ({ jlptPassed }) => jlptPassed?.includes('N3'),
  },
  {
    slug: 'night_owl',
    check: ({ hour }) => hour >= 22 || hour < 2,
  },
  {
    slug: 'early_bird',
    check: ({ hour }) => hour >= 4 && hour < 7,
  },
]

export function ProgressProvider({ children, user, profile, onProfileUpdate }) {
  const [totalXP, setTotalXP]           = useState(profile?.total_xp || 0)
  const [streak, setStreak]             = useState(profile?.streak_days || 0)
  const [dueToday, setDueToday]         = useState([])
  const [earnedBadges, setEarnedBadges] = useState([])    // slugs
  const [newBadge, setNewBadge]         = useState(null)  // most recently unlocked badge object
  const [allBadges, setAllBadges]       = useState([])    // full badge catalog
  const [sessionCount, setSessionCount] = useState(0)
  const [moduleCompletions, setModuleCompletions] = useState({})
  const [jlptPassed, setJlptPassed]     = useState([])
  const [lastQuizPerfect, setLastQuizPerfect] = useState(false)

  // Sync from profile on mount / profile change
  useEffect(() => {
    if (profile) {
      setTotalXP(profile.total_xp || 0)
      setStreak(profile.streak_days || 0)
    }
  }, [profile?.id])

  // Load badge catalog + user's earned badges on mount
  useEffect(() => {
    if (!user) return
    loadBadgeData()
    loadDueToday()
    loadModuleCompletions()
  }, [user?.id])

  async function loadBadgeData() {
    const [{ data: catalog }, { data: userBadgeRows }] = await Promise.all([
      supabase.from('badges').select('*').order('xp_reward'),
      supabase.from('user_badges').select('badge_id, badges(slug)').eq('user_id', user.id),
    ])
    if (catalog) setAllBadges(catalog)
    if (userBadgeRows) {
      const slugs = userBadgeRows.map(r => r.badges?.slug).filter(Boolean)
      setEarnedBadges(slugs)
    }
  }

  async function loadDueToday() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('flashcard_sessions')
      .select('card_id, next_review, ease_factor, interval_days, repetitions, flashcard_content(module, level, character, romaji, english, example_jp, example_en, mnemonic)')
      .eq('user_id', user.id)
      .lte('next_review', today)
      .limit(50)
    setDueToday(data || [])
  }

  async function loadModuleCompletions() {
    const { data } = await supabase
      .from('progress')
      .select('module, xp')
      .eq('user_id', user.id)
    if (data) {
      const map = {}
      data.forEach(r => { if (r.xp > 0) map[r.module] = (map[r.module] || 0) + 1 })
      setModuleCompletions(map)
    }
    // Also load session count + JLPT pass history
    const { data: sessions } = await supabase
      .from('progress')
      .select('xp, module')
      .eq('user_id', user.id)
    if (sessions) setSessionCount(sessions.filter(s => s.xp > 0).length)

    const { data: mocks } = await supabase
      .from('mock_test_results')
      .select('level, passed')
      .eq('user_id', user.id)
      .eq('passed', true)
    if (mocks) setJlptPassed(mocks.map(m => m.level))
  }

  // ─── STREAK LOGIC ────────────────────────────────────────────────────────
  function computeStreak(lastStudyDate, currentStreak) {
    const today = new Date().toISOString().split('T')[0]
    if (!lastStudyDate) return { newStreak: 1, today }
    const last = new Date(lastStudyDate)
    const now  = new Date(today)
    const diffDays = Math.round((now - last) / 86400000)
    if (diffDays === 0) return { newStreak: currentStreak, today }   // already studied today
    if (diffDays === 1) return { newStreak: currentStreak + 1, today } // consecutive day
    return { newStreak: 1, today }  // streak broken
  }

  // ─── SAVE SRS RESULTS ────────────────────────────────────────────────────
  const saveSRSResults = useCallback(async (results, module, level) => {
    if (!user || !results.length) return
    // Build upsert payload — each result has { card, quality, xp, ease_factor, interval_days, repetitions, next_review }
    const rows = results.map(r => {
      const cardId = r.card?.id  // cards need an id — we'll use the character as fallback key
      return {
        user_id: user.id,
        card_id: cardId || `${module}_${level}_${r.card?.character}`,
        ease_factor: r.ease_factor ?? 2.5,
        interval_days: r.interval_days ?? 1,
        repetitions: r.repetitions ?? 0,
        next_review: r.next_review ?? new Date().toISOString().split('T')[0],
        last_quality: r.quality,
        updated_at: new Date().toISOString(),
      }
    })
    // Batch upsert
    await supabase.from('flashcard_sessions').upsert(rows, { onConflict: 'user_id,card_id' })
    // Reload due-today queue
    await loadDueToday()
  }, [user?.id])

  // ─── MAIN EARN XP FUNCTION ───────────────────────────────────────────────
  const earnXP = useCallback(async ({
    xp,
    module,
    level,
    srsResults = [],
    quizPerfect = false,
    jlptLevel = null,
    jlptPassed: didPass = false,
  }) => {
    if (!xp) return

    const newTotalXP = totalXP + xp
    setTotalXP(newTotalXP)

    // Streak
    const { newStreak, today } = computeStreak(profile?.last_study_date, streak)
    setStreak(newStreak)

    // Time-based badge checks
    const hour = new Date().getHours()

    // Update quiz perfect state
    if (quizPerfect) setLastQuizPerfect(true)

    // Update JLPT passed list
    let updatedJlptPassed = [...jlptPassed]
    if (jlptLevel && didPass && !jlptPassed.includes(jlptLevel)) {
      updatedJlptPassed = [...jlptPassed, jlptLevel]
      setJlptPassed(updatedJlptPassed)
    }

    // Update module completions
    const updatedCompletions = { ...moduleCompletions, [module]: (moduleCompletions[module] || 0) + 1 }
    setModuleCompletions(updatedCompletions)
    const updatedSessionCount = sessionCount + 1
    setSessionCount(updatedSessionCount)

    // Persist to DB (parallel)
    await Promise.all([
      // Update user total_xp + streak
      supabase.from('users').update({
        total_xp: newTotalXP,
        streak_days: newStreak,
        last_study_date: today,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id),

      // Upsert module progress
      module && supabase.from('progress').upsert({
        user_id: user.id,
        module: module || 'general',
        level: level || 'beginner',
        xp: xp,
        streak_days: newStreak,
        last_study_date: today,
        unlocked: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,module,level' }),

      // JLPT result if applicable
      jlptLevel && supabase.from('mock_test_results').insert({
        user_id: user.id,
        level: jlptLevel,
        passed: didPass,
        score_pct: null,
        taken_at: new Date().toISOString(),
      }).then(() => {}),  // fire-and-forget

      // Save SRS results
      srsResults.length && saveSRSResults(srsResults, module, level),
    ].filter(Boolean))

    // Refresh profile in AuthContext
    onProfileUpdate?.()

    // ── Badge check ─────────────────────────────────────────────
    const context = {
      streak: newStreak,
      sessionCount: updatedSessionCount,
      moduleCompletions: updatedCompletions,
      jlptPassed: updatedJlptPassed,
      lastQuizPerfect: quizPerfect,
      hour,
    }
    await checkAndAwardBadges(context)
  }, [totalXP, streak, sessionCount, moduleCompletions, jlptPassed, profile, user?.id])

  // ─── BADGE AWARDING ──────────────────────────────────────────────────────
  async function checkAndAwardBadges(context) {
    if (!user || !allBadges.length) return
    const toAward = BADGE_CONDITIONS.filter(cond =>
      !earnedBadges.includes(cond.slug) && cond.check(context)
    )
    if (!toAward.length) return

    for (const cond of toAward) {
      const badge = allBadges.find(b => b.slug === cond.slug)
      if (!badge) continue
      const { error } = await supabase.from('user_badges').insert({
        user_id: user.id,
        badge_id: badge.id,
      })
      if (!error) {
        setEarnedBadges(prev => [...prev, cond.slug])
        setNewBadge(badge)   // trigger the unlock animation in UI
        // Award badge XP bonus
        if (badge.xp_reward) {
          setTotalXP(prev => prev + badge.xp_reward)
          await supabase.from('users').update({
            total_xp: totalXP + badge.xp_reward,
          }).eq('id', user.id)
        }
      }
    }
  }

  function clearNewBadge() { setNewBadge(null) }

  return (
    <ProgressContext.Provider value={{
      totalXP, streak, dueToday, earnedBadges, newBadge, allBadges,
      earnXP, saveSRSResults, clearNewBadge, loadDueToday,
    }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  return useContext(ProgressContext)
}
