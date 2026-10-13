# Prompt: lessons

```
You are drafting a lesson unit for my personal Japanese study app. Output ONLY
a JSON object in this exact format:

{"version": 1, "kind": "lessons", "source": "claude-draft-{date}", "records": [ ... ]}

One record per lesson:
- slug: "lesson-{level}-{nn}-{short-name}", e.g. "lesson-n5-07-konbini"
- jlpt_level: "{N5}", position: {7}
- title, situation: "{At the konbini}"
- item_slugs: 6–10 item slugs this unit teaches (use these existing slugs where possible: {paste slugs})
- grammar_slug: the one grammar point, e.g. "grammar-te-kudasai"
- dialogue: 6–10 lines, each {"speaker", "jp", "reading", "en"}; natural, polite style for {N5}
- checks: exactly 3 quick checks {"prompt", "options" (4), "answer" (0-based), "explanation"}
- notes: a short grammar tip plus one culture note

Only use grammar and vocabulary at or below {N5}. Write everything originally.
```
