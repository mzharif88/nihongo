/**
 * SM-2 Spaced Repetition Algorithm
 * quality: 0-5 (0=blackout, 3=correct with difficulty, 5=perfect)
 */
export function sm2(card, quality) {
  let { ease_factor = 2.5, interval_days = 1, repetitions = 0 } = card

  if (quality >= 3) {
    if (repetitions === 0) interval_days = 1
    else if (repetitions === 1) interval_days = 6
    else interval_days = Math.round(interval_days * ease_factor)
    repetitions += 1
  } else {
    repetitions = 0
    interval_days = 1
  }

  ease_factor = Math.max(
    1.3,
    ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  )

  const next = new Date()
  next.setDate(next.getDate() + interval_days)

  return {
    ease_factor: parseFloat(ease_factor.toFixed(2)),
    interval_days,
    repetitions,
    next_review: next.toISOString().split('T')[0],
  }
}

/**
 * XP calculation per action
 */
export const XP = {
  cardEasy:    10,
  cardOk:       5,
  cardAgain:    1,
  quizCorrect: 15,
  quizPerfect: 50,
  dailyLogin:  20,
  mockPass:   200,
}

export function calcStreakMultiplier(streakDays) {
  if (streakDays >= 30) return 2.0
  if (streakDays >= 7)  return 1.5
  if (streakDays >= 3)  return 1.2
  return 1.0
}
