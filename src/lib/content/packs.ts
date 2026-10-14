// Content packs shipped in the repo, grouped by where they came from and
// listed in dependency order (import a group top to bottom). They are
// loaded straight into the database by SQL, not through the app. Generated
// by `npm run port:legacy`, `build:open-data`, `build:lessons`,
// `build:builder`, `build:practice` and `build:roles`.

export interface PackGroup {
  id: string;
  title: string;
  description: string;
  packs: { file: string; label: string }[];
}

export const PACK_GROUPS: PackGroup[] = [
  {
    id: "legacy",
    title: "Old NihonGo! content",
    description: "Ported from the legacy app. Import top to bottom.",
    packs: [
      { file: "01-items.json", label: "Items: kana, radicals, kanji, words, sentences, grammar" },
      { file: "02-sentence-patterns.json", label: "Sentence patterns" },
      { file: "03-mock-tests.json", label: "Mini mock tests (import before questions)" },
      { file: "04-questions.json", label: "Mock + grammar practice questions" },
    ],
  },
  {
    id: "opendata",
    title: "JLPT N5–N2 kanji and vocabulary (open data)",
    description:
      "KANJIDIC2 kanji and Jonathan Waller's JLPT lists. The first pack corrects levels and readings on old items that also appear in these lists.",
    packs: [
      { file: "00-legacy-level-fixes.json", label: "Level and reading fixes for 442 old items" },
      { file: "01-kanji-n5.json", label: "N5 kanji" },
      { file: "02-vocab-n5.json", label: "N5 vocabulary" },
      { file: "03-kanji-n4.json", label: "N4 kanji" },
      { file: "04-vocab-n4.json", label: "N4 vocabulary" },
      { file: "05-kanji-n3.json", label: "N3 kanji" },
      { file: "06-vocab-n3.json", label: "N3 vocabulary" },
      { file: "07-kanji-n2.json", label: "N2 kanji" },
      { file: "08-vocab-n2.json", label: "N2 vocabulary" },
    ],
  },
  {
    id: "grammar",
    title: "Grammar points",
    description: "Original grammar points beyond the old app's set. Import before lessons, the builder and mocks, which link to them.",
    packs: [
      { file: "n4.json", label: "N4 grammar: 24 points" },
      { file: "n3.json", label: "N3 grammar: 25 points" },
      { file: "n2.json", label: "N2 grammar: 25 points" },
    ],
  },
  {
    id: "lessons",
    title: "Lessons",
    description: "Original situation lessons. Import after the open-data packs, since lessons point at their words.",
    packs: [
      { file: "n5.json", label: "N5 lessons 1–5" },
      { file: "n4.json", label: "N4 lessons 1–6" },
      { file: "n3.json", label: "N3 lessons 1–6" },
      { file: "n2.json", label: "N2 lessons 1–6" },
      { file: "situations.json", label: "Everyday situations: 17 lessons (transport, restaurant, shopping, convenience store, services)" },
    ],
  },
  {
    id: "builder",
    title: "Sentence builder",
    description: "Sentence patterns with tap-to-arrange exercises. Replaces the old patterns' single example.",
    packs: [
      { file: "n5.json", label: "N5 patterns: 12 patterns, 60 sentences" },
      { file: "n4.json", label: "N4 patterns: 8 patterns, 40 sentences" },
      { file: "n3.json", label: "N3 patterns: 8 patterns, 40 sentences" },
      { file: "n2.json", label: "N2 patterns: 8 patterns, 40 sentences" },
    ],
  },
  {
    id: "mock",
    title: "Mock tests",
    description: "Original mock tests in JLPT format. Import the test before its questions.",
    packs: [
      { file: "n5-1-test.json", label: "N5 mock test 1" },
      { file: "n5-1-questions.json", label: "N5 mock test 1: 51 questions" },
      { file: "n4-1-test.json", label: "N4 mock test 1" },
      { file: "n4-1-questions.json", label: "N4 mock test 1: 50 questions" },
      { file: "n3-1-test.json", label: "N3 mock test 1" },
      { file: "n3-1-questions.json", label: "N3 mock test 1: 52 questions" },
      { file: "n2-1-test.json", label: "N2 mock test 1" },
      { file: "n2-1-questions.json", label: "N2 mock test 1: 56 questions" },
    ],
  },
  {
    id: "reading",
    title: "Reading passages",
    description: "Original graded readings with comprehension questions. Import the texts before their questions.",
    packs: [
      { file: "n5-texts.json", label: "N5 readings: 5 passages" },
      { file: "n5-questions.json", label: "N5 reading questions" },
      { file: "n4-texts.json", label: "N4 readings: 5 passages" },
      { file: "n4-questions.json", label: "N4 reading questions" },
      { file: "n3-texts.json", label: "N3 readings: 5 passages" },
      { file: "n3-questions.json", label: "N3 reading questions" },
      { file: "n2-texts.json", label: "N2 readings: 5 passages" },
      { file: "n2-questions.json", label: "N2 reading questions" },
    ],
  },
];
