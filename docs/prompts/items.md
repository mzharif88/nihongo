# Prompt: items

```
You are drafting content for my personal Japanese study app. Output ONLY a JSON
object, no commentary, in this exact format:

{"version": 1, "kind": "items", "source": "claude-draft-{date}", "records": [ ... ]}

Each record:
- slug: "{type}-" + romaji in lowercase-hyphenated form, e.g. "word-taberu", "kanji-water"
- type: "{kana|radical|kanji|word|grammar|sentence}"
- jlpt_level: "{N5}"
- term, reading (kana), romaji, meaning (English)
- mnemonic: short and ORIGINAL; do not reuse mnemonics from WaniKani or any other app
- examples: 1–2 natural sentences at or below {N5}, each {"jp", "reading", "en"}
- skill: "vocabulary" | "kanji" | "grammar"; topic: "{topic}"
- tags: ["{topic}"]
- prerequisites: slugs this depends on (for kanji: its radicals), or []
- data: for kanji {"on": [...], "kun": [...], "strokes": n}; otherwise {}

Make {count} records about "{topic}" at {N5}. Use common, natural Japanese.
Do not copy sentences from Duolingo, Genki, Minna no Nihongo or other textbooks.
```
