import { answerText, buildCard, shuffle, type Rng, type StudyCard, type StudyItem } from "@/lib/study/cards";
import { parseMarkup, stripMarkup, stripRoles, toMarkup, type Segment } from "@/lib/furigana";

// A course unit as a study session: each new item is introduced and quizzed,
// then "in context" fill-in-the-blank cards use sentences that contain the
// unit's words (preferring sentences that combine several of them), then any
// refreshers. Context cards are practice only: they don't touch the schedule.
//
// Sentences come from the app's own content (example sentences, lesson
// dialogue). An AI writer could later supply fresh sentences that combine
// exactly the unit's words; it would plug in as another Sentence source.

export interface Sentence {
  jp: string;
  en: string;
  /** Ruby markup (may carry grammar roles). */
  reading?: string;
}

const MAX_SENTENCE = 40;

/** The best sentence containing `term`: the most other unit words, then the shortest. */
export function findSentence(term: string, corpus: Sentence[], unitTerms: string[]): Sentence | null {
  if (term.length < 2 && !/[㐀-鿿]/.test(term)) return null;
  let best: { s: Sentence; score: number } | null = null;
  for (const s of corpus) {
    const plain = s.jp;
    if (plain.length > MAX_SENTENCE || !plain.includes(term) || plain === term) continue;
    const others = unitTerms.filter((t) => t !== term && t.length > 1 && plain.includes(t)).length;
    const score = others * 100 - plain.length;
    if (!best || score > best.score) best = { s, score };
  }
  return best?.s ?? null;
}

/** The sentence's markup with `term` blanked out as （　）, furigana kept elsewhere. */
export function blankOut(sentence: Sentence, term: string): string | null {
  const segments = parseMarkup(stripRoles(sentence.reading ?? sentence.jp));
  const plain = segments.map((s) => s.text).join("");
  const at = plain.indexOf(term);
  if (at === -1) return null;
  const out: Segment[] = [];
  let pos = 0;
  let blanked = false;
  for (const seg of segments) {
    const start = pos;
    const end = pos + seg.text.length;
    pos = end;
    if (end <= at || start >= at + term.length) {
      out.push(seg);
      continue;
    }
    // A ruby segment that straddles the term's edge can't be split; the term must cover whole segments there.
    if (seg.ruby && (start < at || end > at + term.length)) return null;
    const before = seg.text.slice(0, Math.max(0, at - start));
    const after = seg.text.slice(Math.min(seg.text.length, at + term.length - start));
    if (before) out.push({ text: before });
    if (!blanked) {
      out.push({ text: "（　）" });
      blanked = true;
    }
    if (after) out.push({ text: after });
  }
  return toMarkup(out);
}

/** A fill-in-the-blank card for a word in a sentence; null if no clean blank can be made. */
export function contextCard(item: StudyItem, sentence: Sentence, siblings: StudyItem[], pool: StudyItem[], rng: Rng = Math.random): StudyCard | null {
  const prompt = blankOut(sentence, item.term);
  if (!prompt) return null;
  const answer = answerText(item, "recall");
  const seen = new Set([stripMarkup(answer)]);
  const options = [answer];
  const candidates = [...shuffle(siblings, rng), ...shuffle(pool, rng)].filter(
    (p) => p.id !== item.id && p.type === "word" && !sentence.jp.includes(p.term),
  );
  for (const p of candidates) {
    const text = answerText(p, "recall");
    if (seen.has(stripMarkup(text))) continue;
    seen.add(stripMarkup(text));
    options.push(text);
    if (options.length === 4) break;
  }
  if (options.length < 2) return null;
  const shuffled = shuffle(options, rng);
  const base = buildCard(item, "recognition", false, pool, rng);
  return {
    ...base,
    key: `${item.id}:context`,
    isNew: false,
    practice: true,
    question: `Which word fits? “${sentence.en}”`,
    prompt,
    promptIsJapanese: true,
    promptReading: prompt,
    options: shuffled,
    answerIndex: shuffled.indexOf(answer),
    reveal: { ...base.reveal, example: sentence },
  };
}

/**
 * The unit's cards: new items in teaching order (each introduced, then
 * quizzed), context cards for words that appear in a sentence, then the
 * refreshers as ordinary reviews.
 */
export function unitCards(
  items: StudyItem[],
  refresh: StudyItem[],
  pool: StudyItem[],
  corpus: Sentence[],
  rng: Rng = Math.random,
): StudyCard[] {
  const terms = items.map((i) => i.term);
  const fresh = items.map((i) => buildCard(i, "recognition", true, pool, rng));
  const context = items
    .filter((i) => i.type === "word")
    .flatMap((i) => {
      const s = findSentence(i.term, corpus, terms);
      const card = s ? contextCard(i, s, items, pool, rng) : null;
      return card ? [card] : [];
    });
  const again = refresh.map((i) => buildCard(i, "recognition", false, pool, rng));
  return [...fresh, ...context, ...again];
}
