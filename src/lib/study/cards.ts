import { alignReading, toMarkup } from "@/lib/furigana";

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
  /** Kanji: on and kun readings (KANJIDIC). */
  data?: { on?: string[]; kun?: string[]; freq?: number | null } | null;
}

export interface StudyCard {
  /** `${itemId}:${cardType}`, unique within a session. */
  key: string;
  itemId: string;
  cardType: CardType;
  isNew: boolean;
  /** The item's type and JLPT level: kanji above the level show as kana (see KanjiScope), except on kanji cards. */
  itemType: string;
  level: string;
  /** Practice only (course context cards): answered and shown, never sent to the scheduler. */
  practice?: boolean;
  /** Every card is multiple choice; the app grades the answer. */
  mode: "choice";
  question: string;
  prompt: string;
  promptIsJapanese: boolean;
  /** Furigana for a Japanese prompt (kana or markup); null where the reading is the answer. */
  promptReading: string | null;
  options?: string[];
  answerIndex?: number;
  reveal: {
    term: string;
    /** Kana reading, or ruby markup for sentences. */
    reading: string | null;
    romaji: string | null;
    meaning: string;
    mnemonic: string | null;
    /** Kanji: every on (音) and kun (訓) reading. */
    readings: { on: string[]; kun: string[] } | null;
    /** `reading` is ruby markup for the example sentence, when generated. */
    example: { jp: string; en: string; reading?: string } | null;
    audioUrl: string | null;
  };
}

/** Item types that also get a reverse (recall) card once recognition is learned: sound/meaning → Japanese. */
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

/** A word as an answer option, as ruby markup so the option shows furigana over its kanji. */
function wordWithReading(item: StudyItem): string {
  return item.reading ? toMarkup(alignReading(item.term, item.reading)) : item.term;
}

/**
 * The text the learner picks for each card. Recognition asks for the
 * sound (kana) or meaning (everything else); recall goes the other way and
 * asks for the Japanese: the kana for a sound, the word for a meaning, or a
 * kanji's reading.
 */
export function answerText(item: StudyItem, cardType: CardType): string {
  if (cardType === "recognition") return item.type === "kana" ? (item.romaji ?? item.meaning) : item.meaning;
  if (item.type === "kana") return item.term;
  if (item.type === "kanji") return item.reading ?? item.romaji?.split("/")[0] ?? item.term;
  return wordWithReading(item);
}

/** Wrong options from the same kind of item, so a kana card offers other kana and a word card other words. */
function distractors(item: StudyItem, cardType: CardType, pool: StudyItem[], rng: Rng, count = 3): string[] {
  const answer = answerText(item, cardType).toLowerCase();
  const sameKind = pool.filter(
    (p) =>
      p.id !== item.id &&
      p.type === item.type &&
      (item.type !== "kana" || isKatakana(p) === isKatakana(item)) &&
      // Homophones look identical when a word is shown in kana, so never offer one.
      (item.type !== "word" || !p.reading || p.reading !== item.reading),
  );
  const seen = new Set([answer]);
  const out: string[] = [];
  for (const p of shuffle(sameKind, rng)) {
    const text = answerText(p, cardType);
    if (seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
    if (out.length === count) break;
  }
  return out;
}

const QUESTIONS: Record<CardType, (item: StudyItem) => string> = {
  recognition: (item) => (item.type === "kana" ? "Which sound is this?" : "What does this mean?"),
  recall: (item) =>
    item.type === "kana"
      ? "Which kana makes this sound?"
      : item.type === "kanji"
        ? "How is this kanji read?"
        : "Which word means this?",
};

/** Recall shows the sound or meaning and asks for the Japanese; a kanji's recall card asks for its reading. */
function promptFor(item: StudyItem, cardType: CardType): Pick<StudyCard, "prompt" | "promptIsJapanese" | "promptReading"> {
  if (cardType === "recognition" || item.type === "kanji") {
    // Furigana everywhere except the kanji-reading card, where the reading is the answer.
    const hide = cardType === "recall" && item.type === "kanji";
    return { prompt: item.term, promptIsJapanese: true, promptReading: hide ? null : item.reading };
  }
  return {
    prompt: item.type === "kana" ? (item.romaji ?? item.meaning) : item.meaning,
    promptIsJapanese: false,
    promptReading: null,
  };
}

export function buildCard(
  item: StudyItem,
  cardType: CardType,
  isNew: boolean,
  pool: StudyItem[],
  rng: Rng = Math.random,
): StudyCard {
  const first = item.examples[0];
  const example = first ? { jp: first.jp, en: first.en, ...(first.reading ? { reading: first.reading } : {}) } : null;
  const base = {
    key: `${item.id}:${cardType}`,
    itemId: item.id,
    cardType,
    isNew,
    itemType: item.type,
    level: item.jlpt_level,
    reveal: {
      term: item.term,
      reading: item.reading,
      romaji: item.romaji,
      meaning: item.meaning,
      mnemonic: item.mnemonic,
      readings: item.type === "kanji" && (item.data?.on?.length || item.data?.kun?.length) ? { on: item.data?.on ?? [], kun: item.data?.kun ?? [] } : null,
      example,
      audioUrl: item.audio_url,
    },
  };

  const answer = answerText(item, cardType);
  const options = shuffle([answer, ...distractors(item, cardType, pool, rng)], rng);
  return {
    ...base,
    mode: "choice",
    question: QUESTIONS[cardType](item),
    ...promptFor(item, cardType),
    options,
    answerIndex: options.indexOf(answer),
  };
}
