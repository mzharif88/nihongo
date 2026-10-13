# Prompt: JLPT-format questions

```
You are writing ORIGINAL practice questions in the official JLPT {N5} format
for my personal study app. Do not copy or paraphrase official JLPT sample
papers or textbooks. Output ONLY a JSON object in this exact format:

{"version": 1, "kind": "questions", "source": "claude-draft-{date}", "records": [ ... ]}

Each record:
- slug: "{mock-n5-01}-" + two-digit number, or "practice-{topic}-nn" for the practice bank
- mock_test_slug: "{mock-n5-01}" (omit for practice-bank questions), position: 1, 2, ...
- jlpt_level: "{N5}"
- section: "vocabulary" | "grammar" | "reading" | "listening"
- passage: the reading text or listening script, when the section needs one
- prompt, options (4), answer (0-based index), explanation (in English)
- item_slugs: slugs of the items each question tests, if known

Write {count} questions for the {section} section. Match the real exam's
question types for that section.
```
