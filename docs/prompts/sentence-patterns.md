# Prompt: sentence patterns

```
You are drafting sentence-builder patterns for my personal Japanese study app.
Output ONLY a JSON object in this exact format:

{"version": 1, "kind": "sentence_patterns", "source": "claude-draft-{date}", "records": [ ... ]}

Each record:
- slug: "pattern-" + short name, e.g. "pattern-tai"
- jlpt_level: "{N5}", grammar_slug: "{grammar-tai}"
- title: e.g. "〜たいです (want to)", english: the gloss of the first example
- template: ordered parts. Fixed text as {"text": "を"}; learner-filled parts as
  {"slot": "<type>", "label": "<hint>"} where type is one of noun, verb-dict,
  verb-masu, verb-te, verb-nai, verb-ta, i-adj, na-adj, place, time, person, number
- conjugation_rules: how slots change, e.g. [{"slot": "verb-masu", "to": "tai"}]
- examples: 3–5 {"jp", "reading", "en"} sentences using only {N5} words
- notes: the common mistake this pattern targets (e.g. は vs が)

Make patterns for: {list of grammar points}.
```
