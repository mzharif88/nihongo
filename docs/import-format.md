# Content import format (v1)

Content is drafted outside the app (for example in Claude chat), saved as a
JSON file, and imported at **Admin → Import**. Every imported record lands as
a **draft**, and learners only see content after it moves through the review
queue: `draft → reviewed → live`. Re-importing an existing slug updates the
record and sends it back to draft.

```json
{
  "version": 1,
  "kind": "items",
  "source": "claude-draft-2026-10",
  "records": [ ... ]
}
```

| Field | Notes |
| --- | --- |
| `version` | Always `1`. |
| `kind` | One of `items`, `lessons`, `texts`, `mock_tests`, `questions`, `sentence_patterns`. One kind per file. |
| `source` | Free text recorded on every row, so you can find a batch later. |
| `records` | The rows. Bad records are listed and skipped; good ones still import. |

**Slugs** are the stable ids: lowercase letters, digits and hyphens
(`word-mizu`, `grammar-tai`). References between content use slugs, so a file
can point at items that are imported later.

`jlpt_level` is one of `preN5`, `N5`, `N4`, `N3`, `N2`, `N1`.

The source of truth for validation is `src/lib/content/schema.ts`.

## items

Every learnable unit: kana, radicals, kanji, words, grammar points, sentences.

| Field | Required | Notes |
| --- | --- | --- |
| `slug` | yes | Convention: `kana-…`, `radical-…`, `kanji-…`, `word-…`, `grammar-…`, `sentence-…` |
| `type` | yes | `kana`, `radical`, `kanji`, `word`, `grammar`, `sentence` |
| `jlpt_level` | yes | |
| `term` | yes | The Japanese text as written: `水`, `〜たい`, `わたしは学生です。` |
| `reading` | | Kana reading: `みず` |
| `romaji` | | `mizu` |
| `meaning` | yes | English |
| `mnemonic` | | Original only: never copy WaniKani or other apps |
| `examples` | | `[{ "jp": "水をください。", "en": "Water, please.", "reading": "みずをください。" }]` |
| `skill`, `topic`, `grammar_point` | | The interlock tags (with `jlpt_level`): e.g. `vocabulary`, `food`, `grammar-tai` |
| `tags` | | Free-form, e.g. `["konbini", "level-unverified"]` |
| `prerequisites` | | Slugs that must reach Guru first, e.g. a kanji's radicals |
| `data` | | Type-specific extras: `{ "on": ["スイ"], "kun": ["みず"], "strokes": 4 }` |
| `audio_url` | | Set after audio is generated |

## lessons

| Field | Required | Notes |
| --- | --- | --- |
| `slug`, `jlpt_level`, `title` | yes | |
| `position` | yes | Order within the level; unique per level |
| `situation` | | "At the konbini" |
| `item_slugs` | | 6–10 new items taught in this unit |
| `grammar_slug` | | The one grammar point (an item slug) |
| `dialogue` | | `[{ "speaker": "店員", "jp": "いらっしゃいませ。", "en": "Welcome." }]` |
| `checks` | | `[{ "prompt": "…", "options": ["…", "…"], "answer": 0, "explanation": "…" }]`, 3 quick checks |
| `notes` | | Grammar tip / culture note |

## texts

Listening scripts and dialogues now; Reader stories later.
Fields: `slug`, `jlpt_level`, `kind` (`dialogue` / `listening` / `reading` / `story`), `title`, `body`, optional `audio_url`.

## mock_tests

Fields: `slug`, `jlpt_level`, `title`, `time_limit_min`. Import a mock test before its questions.

## questions

| Field | Required | Notes |
| --- | --- | --- |
| `slug`, `jlpt_level`, `prompt` | yes | |
| `section` | yes | `vocabulary`, `grammar`, `reading`, `listening` |
| `options` | yes | At least 2 |
| `answer` | yes | Zero-based index into `options` |
| `mock_test_slug`, `position` | | Leave out for the practice bank |
| `passage` | | Reading passage or listening script |
| `explanation` | | Why the answer is right |
| `item_slugs` | | Items this question tests; misses feed these into SRS |

## sentence_patterns

| Field | Required | Notes |
| --- | --- | --- |
| `slug`, `jlpt_level`, `title` | yes | |
| `grammar_slug` | | Unlocks when this grammar lesson is done |
| `english` | | Prompt / gloss |
| `template` | yes | Parts in order. Fixed text: `{ "text": "を" }`. Typed slot: `{ "slot": "noun", "label": "thing" }` |
| `conjugation_rules` | | e.g. `[{ "slot": "verb-masu", "to": "tai" }]` |
| `examples` | | 3–5 `{ "jp", "en" }` sentences |
| `notes` | | |

Slot types: `noun`, `verb-dict`, `verb-masu`, `verb-te`, `verb-nai`, `verb-ta`,
`i-adj`, `na-adj`, `place`, `time`, `person`, `number`.
