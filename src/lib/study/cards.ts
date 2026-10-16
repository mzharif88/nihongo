import { stripMarkup } from "@/lib/furigana";

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
  /**
   * Kanji: on and kun readings (KANJIDIC), kun with okurigana marked (あ(げる)),
   * and example words showing its readings, the first one quizzed with
   * JLPT-style misreadings (scripts/kanji-readings.ts).
   */
  data?: { on?: string[]; kun?: string[]; kun_marked?: string[]; examples?: KanjiExample[]; freq?: number | null } | null;
}

export interface KanjiExample {
  term: string;
  reading: string;
  meaning: string;
  level: string;
  /** The kanji's reading in this word. */
  uses: string;
  misreadings: string[];
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
  /** New kana letters are introduced and quizzed one at a time; everything else in small batches. */
  introAlone?: boolean;
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
    /** Kanji: every on (音, katakana) and kun (訓, okurigana in brackets) reading. */
    readings: { on: string[]; kun: string[] } | null;
    /** Kanji: words that show its readings. */
    words: { term: string; reading: string; meaning: string }[] | null;
    /** Kanji reading quiz: the word it asked about. */
    quizWord?: { term: string; reading: string; meaning: string };
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
const toKatakana = (s: string) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

/** The word a kanji's reading quiz asks about, as the JLPT does (上手 → じょうず), if it has one. */
const quizWord = (item: StudyItem): KanjiExample | null => (item.type === "kanji" ? (item.data?.examples?.[0] ?? null) : null);

export type Script = "hiragana" | "katakana" | "kanji" | "other";

/** The script an answer is written in (furigana ignored): any kanji makes it "kanji". */
export function scriptOf(text: string): Script {
  const plain = stripMarkup(text).replace(/[\s・ー〜～.。、]/g, "");
  if (/[㐀-鿿々]/.test(plain)) return "kanji";
  if (/^[ぁ-ゖ]+$/.test(plain)) return "hiragana";
  if (/^[ァ-ヺ]+$/.test(plain)) return "katakana";
  return "other";
}

/**
 * Up to `count` wrong options from `candidates`, written in the same script as
 * the answer (a hiragana answer gets hiragana options, a katakana one
 * katakana), topped up from the rest only if there aren't enough.
 */
export function pickOptions(answer: string, candidates: string[], count: number): string[] {
  const key = (t: string) => stripMarkup(t).toLowerCase();
  const seen = new Set([key(answer)]);
  const script = scriptOf(answer);
  const unique = candidates.filter((t) => !seen.has(key(t)) && (seen.add(key(t)), true));
  const same = unique.filter((t) => scriptOf(t) === script);
  return [...same, ...unique.filter((t) => scriptOf(t) !== script)].slice(0, count);
}

/** The first plain form of a reading or term: "べんきょう (する)" → べんきょう, "いく; ゆく" → いく. */
const firstForm = (text: string) => text.replace(/\s*[(（].*?[)）]\s*/g, "").split(/[;；]/)[0].trim();

/**
 * A word as an answer: always kana, never kanji. A word with kanji is
 * answered by its reading (山 → やま); a kana word as written (テレビ, ここ).
 */
export function wordAnswer(item: StudyItem): string {
  return /[㐀-鿿々]/.test(item.term) && item.reading ? firstForm(item.reading) : firstForm(item.term);
}

/**
 * The text the learner picks for each card. Recognition asks for the
 * sound (kana) or meaning (everything else); recall goes the other way and
 * asks for the Japanese, always in kana: the kana for a sound, the word's reading for a meaning, or a
 * kanji's reading.
 */
export function answerText(item: StudyItem, cardType: CardType): string {
  if (cardType === "recognition") return item.type === "kana" ? (item.romaji ?? item.meaning) : item.meaning;
  if (item.type === "kana") return item.term;
  if (item.type === "kanji") return quizWord(item)?.reading ?? item.reading ?? item.romaji?.split("/")[0] ?? item.term;
  return wordAnswer(item);
}

/** Wrong options from the same kind of item, so a kana card offers other kana and a word card other words. */
function distractors(item: StudyItem, cardType: CardType, pool: StudyItem[], rng: Rng, count = 3): string[] {
  const sameKind = pool.filter(
    (p) =>
      p.id !== item.id &&
      p.type === item.type &&
      (item.type !== "kana" || isKatakana(p) === isKatakana(item)) &&
      // Homophones look identical when a word is shown in kana, so never offer one.
      (item.type !== "word" || !p.reading || p.reading !== item.reading),
  );
  return pickOptions(answerText(item, cardType), shuffle(sameKind, rng).map((p) => answerText(p, cardType)), count);
}

const QUESTIONS: Record<CardType, (item: StudyItem) => string> = {
  recognition: (item) => (item.type === "kana" ? "Which sound is this?" : "What does this mean?"),
  recall: (item) =>
    item.type === "kana"
      ? "Which kana makes this sound?"
      : item.type === "kanji"
        ? quizWord(item)
          ? "How is this word read?"
          : "How is this kanji read?"
        : "Which word means this?",
};

/** Recall shows the sound or meaning and asks for the Japanese; a kanji's recall card asks for its reading. */
function promptFor(item: StudyItem, cardType: CardType): Pick<StudyCard, "prompt" | "promptIsJapanese" | "promptReading"> {
  if (cardType === "recognition" || item.type === "kanji") {
    // Furigana everywhere except the kanji-reading card, where the reading is the answer.
    const hide = cardType === "recall" && item.type === "kanji";
    // That card asks about a word using the kanji, the way the JLPT does.
    const word = hide ? quizWord(item) : null;
    return { prompt: word?.term ?? item.term, promptIsJapanese: true, promptReading: hide ? null : item.reading };
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
    introAlone: item.type === "kana",
    reveal: {
      term: item.term,
      reading: item.reading,
      romaji: item.romaji,
      meaning: item.meaning,
      mnemonic: item.mnemonic,
      readings:
        item.type === "kanji" && (item.data?.on?.length || item.data?.kun?.length)
          ? { on: [...new Set((item.data?.on ?? []).map(toKatakana))], kun: [...new Set(item.data?.kun_marked ?? item.data?.kun ?? [])] }
          : null,
      words: item.type === "kanji" && item.data?.examples?.length ? item.data.examples.map(({ term, reading, meaning }) => ({ term, reading, meaning })) : null,
      example,
      audioUrl: item.audio_url,
    },
  };

  const answer = answerText(item, cardType);
  const word = cardType === "recall" ? quizWord(item) : null;
  // A kanji's reading quiz offers the word's likely misreadings, as the JLPT does, topped up from other words.
  const wrong = word
    ? pickOptions(answer, [...shuffle(word.misreadings.slice(0, 5), rng), ...distractors(item, cardType, pool, rng, 6)], 3)
    : distractors(item, cardType, pool, rng);
  const options = shuffle([answer, ...wrong], rng);
  return {
    ...base,
    ...(word ? { reveal: { ...base.reveal, quizWord: { term: word.term, reading: word.reading, meaning: word.meaning } } } : {}),
    mode: "choice",
    question: QUESTIONS[cardType](item),
    ...promptFor(item, cardType),
    options,
    answerIndex: options.indexOf(answer),
  };
}
