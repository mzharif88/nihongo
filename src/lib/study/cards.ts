export type CardType = "recognition" | "recall";

export interface StudyItem {
  id: string;
  slug: string;
  type: string;
  jlpt_level: string;
  term: string;
  reading: string | null;
  romaji: string | null;
  meaning: string;
  mnemonic: string | null;
  examples: { jp: string; en: string; reading?: string }[];
  tags: string[];
  topic: string | null;
  prerequisites: string[];
  audio_url: string | null;
}

export interface StudyCard {
  /** `${itemId}:${cardType}`, unique within a session. */
  key: string;
  itemId: string;
  cardType: CardType;
  isNew: boolean;
  /** Multiple choice for recognition; a self-graded flip card for recall. */
  mode: "choice" | "flip";
  question: string;
  prompt: string;
  promptIsJapanese: boolean;
  options?: string[];
  answerIndex?: number;
  reveal: {
    term: string;
    reading: string | null;
    romaji: string | null;
    meaning: string;
    mnemonic: string | null;
    example: { jp: string; en: string } | null;
    audioUrl: string | null;
  };
}

/** Item types that also get a reverse (recall) flip card once recognition is learned. */
export const RECALL_TYPES = ["kana", "kanji", "word"];

export type Rng = () => number;

export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const isKatakana = (item: StudyItem) => item.tags.includes("katakana");

/** The text a recognition card asks the learner to pick: kana → its sound, everything else → its meaning. */
function choiceAnswer(item: StudyItem): string {
  return item.type === "kana" ? (item.romaji ?? item.meaning) : item.meaning;
}

/** Wrong options from the same kind of item, so a kana card offers other sounds and a word card other meanings. */
function distractors(item: StudyItem, pool: StudyItem[], rng: Rng, count = 3): string[] {
  const answer = choiceAnswer(item).toLowerCase();
  const sameKind = pool.filter(
    (p) => p.id !== item.id && p.type === item.type && (item.type !== "kana" || isKatakana(p) === isKatakana(item)),
  );
  const seen = new Set([answer]);
  const out: string[] = [];
  for (const p of shuffle(sameKind, rng)) {
    const text = choiceAnswer(p);
    if (seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
    if (out.length === count) break;
  }
  return out;
}

export function buildCard(
  item: StudyItem,
  cardType: CardType,
  isNew: boolean,
  pool: StudyItem[],
  rng: Rng = Math.random,
): StudyCard {
  const example = item.examples[0] ? { jp: item.examples[0].jp, en: item.examples[0].en } : null;
  const base = {
    key: `${item.id}:${cardType}`,
    itemId: item.id,
    cardType,
    isNew,
    reveal: {
      term: item.term,
      reading: item.reading,
      romaji: item.romaji,
      meaning: item.meaning,
      mnemonic: item.mnemonic,
      example,
      audioUrl: item.audio_url,
    },
  };

  if (cardType === "recall") {
    // Reverse flashcard: think of the answer, flip, then grade yourself.
    if (item.type === "kana") {
      return { ...base, mode: "flip", question: "What's the kana for this sound?", prompt: item.romaji ?? item.meaning, promptIsJapanese: false };
    }
    if (item.type === "kanji") {
      return { ...base, mode: "flip", question: "How is this kanji read?", prompt: item.term, promptIsJapanese: true };
    }
    return { ...base, mode: "flip", question: "How do you say this in Japanese?", prompt: item.meaning, promptIsJapanese: false };
  }

  const answer = choiceAnswer(item);
  const options = shuffle([answer, ...distractors(item, pool, rng)], rng);
  return {
    ...base,
    mode: "choice",
    question: item.type === "kana" ? "Which sound is this?" : "What does this mean?",
    prompt: item.term,
    promptIsJapanese: true,
    options,
    answerIndex: options.indexOf(answer),
  };
}
