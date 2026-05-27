// ============================================================
// DATA INDEX — single import point for all app data
// ============================================================
export * from './content.js'
export * from './vocab.js'
export * from './modules.js'
export * from './grammar.js'

import { HIRAGANA_BEGINNER, KATAKANA_BEGINNER, KANJI_BEGINNER, KANJI_INTERMEDIATE, KANJI_N5_EXTENDED, VOCAB_WORDS, SENTENCES_N5, SENTENCES_N4 } from './content.js'
import { WORD_COLLECTIONS, ANIMAL_COLLECTIONS, THINGS_COLLECTIONS, ALL_WORDS, ALL_ANIMALS, ALL_THINGS } from './vocab.js'
import { HIRAGANA_DAKUTEN, HIRAGANA_COMBOS, KATAKANA_DAKUTEN, KATAKANA_COMBOS, TIME_CARDS, MONEY_CARDS, COUNTING_CARDS, COMMON_SENTENCES, EXPRESSIONS, SENTENCE_PATTERNS } from './modules.js'
import { GRAMMAR_COLLECTIONS, ALL_GRAMMAR } from './grammar.js'

export const ALL_HIRAGANA = [...HIRAGANA_BEGINNER, ...HIRAGANA_DAKUTEN, ...HIRAGANA_COMBOS]
export const ALL_KATAKANA = [...KATAKANA_BEGINNER, ...KATAKANA_DAKUTEN, ...KATAKANA_COMBOS]
export const ALL_KANJI    = [...KANJI_BEGINNER, ...KANJI_N5_EXTENDED, ...KANJI_INTERMEDIATE]

export const COLLECTION_MAP = {
  hiragana:    [{ id:'h1', label:'Basic (あ〜ん)', cards:HIRAGANA_BEGINNER }, { id:'h2', label:'Voiced (が〜ぽ)', cards:HIRAGANA_DAKUTEN }, { id:'h3', label:'Combinations (きゃ〜ぴょ)', cards:HIRAGANA_COMBOS }],
  katakana:    [{ id:'k1', label:'Basic (ア〜ン)', cards:KATAKANA_BEGINNER }, { id:'k2', label:'Voiced (ガ〜ヴ)', cards:KATAKANA_DAKUTEN }, { id:'k3', label:'Combinations (キャ〜ピョ)', cards:KATAKANA_COMBOS }],
  kanji:       [{ id:'kj1', label:'Beginner N5 (日〜年)', cards:KANJI_BEGINNER }, { id:'kj2', label:'Extended N5 (右〜秋)', cards:KANJI_N5_EXTENDED }, { id:'kj3', label:'Intermediate (食〜出)', cards:KANJI_INTERMEDIATE }],
  words:       WORD_COLLECTIONS,
  animals:     ANIMAL_COLLECTIONS,
  things:      THINGS_COLLECTIONS,
  sentences:   [{ id:'s1', label:'N5 Sentences', cards:SENTENCES_N5 }, { id:'s2', label:'N4 Sentences', cards:SENTENCES_N4 }],
  time:        [{ id:'tm1', label:'Time & Calendar', cards:TIME_CARDS }],
  money:       [{ id:'mn1', label:'Money & Prices', cards:MONEY_CARDS }],
  counting:    [{ id:'cn1', label:'Counters', cards:COUNTING_CARDS }],
  common:      [{ id:'sc1', label:'Common Sentences', cards:COMMON_SENTENCES }],
  expressions: [{ id:'ex1', label:'Expressions', cards:EXPRESSIONS }],
  grammar:     GRAMMAR_COLLECTIONS,
}

export const MODULE_ALL_CARDS = {
  hiragana: ALL_HIRAGANA, katakana: ALL_KATAKANA, kanji: ALL_KANJI,
  words: ALL_WORDS, animals: ALL_ANIMALS, things: ALL_THINGS,
  sentences: [...SENTENCES_N5, ...SENTENCES_N4],
  time: TIME_CARDS, money: MONEY_CARDS, counting: COUNTING_CARDS,
  common: COMMON_SENTENCES, expressions: EXPRESSIONS, grammar: ALL_GRAMMAR,
}

export { SENTENCE_PATTERNS }
