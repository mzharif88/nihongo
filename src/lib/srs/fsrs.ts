import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from "ts-fsrs";

/** FSRS target retention; the plan's 85–90% review-accuracy band. */
export const DESIRED_RETENTION = 0.9;

/** Daily review time budget so the Due Today queue never exceeds ~15 minutes. */
export const REVIEW_BUDGET_MS = 15 * 60 * 1000;
/** Assumed time per review until we have the learner's own average. */
export const DEFAULT_MS_PER_REVIEW = 8_000;

const scheduler = fsrs(generatorParameters({ request_retention: DESIRED_RETENTION, enable_fuzz: false }));

export { Rating };
export type { Grade };

/** Shape of the FSRS columns in `public.user_items`. */
export interface UserItemCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  fsrs_state: number;
  last_review: string | null;
}

export function toRow(card: Card): UserItemCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    fsrs_state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

export function fromRow(row: UserItemCard): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.fsrs_state,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

export function newCard(now: Date = new Date()): UserItemCard {
  return toRow(createEmptyCard(now));
}

/** Apply one answer to a card and return the updated row. */
export function review(row: UserItemCard, grade: Grade, now: Date = new Date()): UserItemCard {
  return toRow(scheduler.next(fromRow(row), now, grade).card);
}

/** Map a quiz result (right/wrong plus speed) to an FSRS grade for non-SRS sources like the builder or mocks. */
export function gradeFromResult(correct: boolean, msTaken?: number): Grade {
  if (!correct) return Rating.Again;
  if (msTaken !== undefined && msTaken > 15_000) return Rating.Hard;
  return Rating.Good;
}

/**
 * Pick today's queue: due cards, most overdue first, capped so the session
 * fits the review time budget.
 */
export function dueQueue<T extends Pick<UserItemCard, "due">>(
  cards: T[],
  now: Date = new Date(),
  msPerReview: number = DEFAULT_MS_PER_REVIEW,
): T[] {
  const cap = Math.max(1, Math.floor(REVIEW_BUDGET_MS / Math.max(1, msPerReview)));
  return cards
    .filter((c) => new Date(c.due).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())
    .slice(0, cap);
}
