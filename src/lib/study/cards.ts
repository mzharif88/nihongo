import type { TypedTarget } from "./answers";

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
  mode: "choice" | "typing";
  question: string;
  prompt: string;
  promptIsJapanese: boolean;
  options?: string[];
  answerIndex?: number;
  typing?: TypedTarget & { script: "hiragana" | "katakana" };
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

/** Item types that also get a typed recall card once recognition is learned. */
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
    const target = { term: item.term, reading: item.reading, romaji: item.romaji };
    if (item.type === "kana") {
      return {
        ...base,
        mode: "typing",
        question: `Type this sound in ${isKatakana(item) ? "katakana" : "hiragana"}`,
        prompt: item.romaji ?? item.meaning,
        promptIsJapanese: false,
        typing: { ...target, script: isKatakana(item) ? "katakana" : "hiragana" },
      };
    }
    if (item.type === "kanji") {
      return {
        ...base,
        mode: "typing",
        question: "Type a reading",
        prompt: item.term,
        promptIsJapanese: true,
        typing: { ...target, script: "hiragana" },
      };
    }
    return {
      ...base,
      mode: "typing",
      question: "Say it in Japanese (romaji or kana)",
      prompt: item.meaning,
      promptIsJapanese: false,
      typing: { ...target, script: isKatakana(item) ? "katakana" : "hiragana" },
    };
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
