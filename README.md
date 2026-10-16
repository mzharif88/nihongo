# 日本語Go! JLPT

A personal Japanese study app that takes one learner from zero kana to JLPT N1
and real conversation: FSRS spaced repetition, structured lessons, a sentence
builder, listening/speaking practice and JLPT mocks, all sharing one learner
model.

This is a fresh build. The old NihonGo! app (React + Vite) lives on the
[`legacy`](../../tree/legacy) branch.

## Status: Phase 1 in progress

| Area | What exists |
| --- | --- |
| Auth | Supabase Auth email + password; public sign-up off; every page needs a session |
| Database | Full schema with RLS on every table (`supabase/migrations`) |
| Admin console | `/admin`: content counts, browse/filter, JSON editor, bulk review queue (draft → reviewed → live), AI engine (`/admin/ai`: spend vs monthly budget, tokens, words and sentences produced, coverage per level, a review queue, and a button to run it), full JSON export |
| Content | Old NihonGo! content (`content/legacy`) plus N5–N2 kanji and vocabulary from open data (`content/opendata`, ~6,300 items); `/attributions` credits the sources |
| SRS | `/study`: every due review (no cap) then the next 10 new items, with "Keep going" for more and no daily limit; `/study?topic=…` studies one topic (resumes where you left off, since every answer is saved); all cards multiple choice; furigana over kanji everywhere (hidden only when the reading is the answer); XP and streaks. New items come in groups of 4: their intros one after another, then a quiz on the 4 in shuffled order, then the next group (new kana letters, hiragana and katakana, stay one at a time: intro, quiz). Kanji readings follow the JLPT and the usual textbook and app conventions (`npm run build:kanji-readings`, `scripts/kanji-readings.ts`). The kanji card lists 音 in katakana and 訓 in hiragana with the okurigana in brackets (上: 音 ジョウ・ショウ, 訓 うえ・あ(げる)…), plus up to three example words showing which reading each uses. The reading quiz asks how a word using the kanji is read, as the JLPT 漢字読み part does ("How is this word read? 上手"), with hiragana options built like JLPT distractors: the kanji read another way (うえず), a long vowel dropped or added (じょず), a small っ, voicing (てんぎ for 天気). Every N5–N2 word is split into per-kanji readings (sound changes allowed) to find each kanji's examples and its key reading (the most-used one, lower levels weighing more; hand pins in `content/kanji-readings/pins.json`, e.g. 上 うえ, 使 つかう), shown over the kanji on its intro. `content/kanji-readings/extra.json` adds readings for kanji whose record has none (分) and words for kanji no N5–N2 word uses (隻 一隻); words whose other kanji are outside the list (宇宙) serve as examples only when a kanji has nothing else, and never count towards a key reading. Every kanji has example words. Answers are never kanji: a word with kanji is answered by its reading (山 → やま), a kana word as written (テレビ), and wrong options are in the same script, so a hiragana answer gets hiragana options and a katakana one katakana (`pickOptions` in `src/lib/study/cards.ts`, also used by course fill-in-the-blank cards). Answers don't re-render the page mid-session, and taps within 400 ms of a new card are ignored, so a double tap on Next can't skip the next card |
| Home | Study everything, Continue (last topic), and a topic grid (scripts, radicals, kanji and words by level, word topics) with progress and due counts. Every one of the 5,537 words N5–N2 has one of 42 word topics (Animals, Food & Drink, Work & Business, Society & Government…; `content/topics/topics.json` in teaching order, `content/topics/assignments.json` per word, stamped onto the packs by `npm run build:topics` and by the pack builds; `tests/content-packs.test.ts` checks none is missing). A topic session teaches its N5 words first, then N4 and up; pace card shows the exam-date target as a guide only; `/settings` for level, exam date, goal and timezone |
| N4 | 24 original N4 grammar points (`content/grammar`), 15 N4 lessons (clinic, travel plans, part-time job rules, moving house, casual weekend chat, directions), 8 N4 builder patterns (40 sentences), N4 mock test 1 (50 questions, including the N4 usage part) and 15 N4 reading passages |
| N3 | 25 original N3 grammar points, 6 N3 lessons (job interview, health habits, news, overtime, lateness, transfer), 8 N3 builder patterns (40 sentences), N3 mock tests 1 and 2 (56 questions each, in three scored sections, with 問題6 長文) and 5 N3 reading passages |
| N2 | 25 original N2 grammar points, 6 N2 lessons (budget meeting, signing a lease, environment seminar, complaint handling, career advice, disaster drill), 8 N2 builder patterns (40 sentences), N2 mock tests 1 and 2 (59 questions each in the N2 paper layout: one language-and-reading paper, then listening; test 2 adds 問題13, the long argumentative passage) and 5 N2 reading passages |
| Situations | 17 everyday-situation lessons in 5 groups (public transport, restaurants, shopping, convenience store, hotel/doctor/post office/bank/city office): key phrases, a scene dialogue and 6 understand-and-respond checks each, on their own page and open in any order |
| Adaptive course | `/course`: plans units from the words and kanji you haven't started, N5 up to your target (capped at N2 for now). Each unit teaches a kanji with the words that use it (radicals never join a unit), then fill-in-the-blank practice in sentences that combine the unit's words, then refreshers for words you keep missing. Unit size adapts to recent review accuracy and the review backlog. Rule-based (`src/lib/course/engine.ts`); approved AI-written sentences (admin → AI engine) join items' examples and feed its fill-in-the-blank practice |
| Lessons | `/lessons`: 15 original N5 situation lessons (introductions, konbini, station, time, restaurant, a family photo, likes, the weekend, weather, an invitation, around school, the clinic, a clothes shop, the post office, a birthday party), each teaching a different N5 grammar point. Each runs situation → new words → grammar → dialogue (tap to hear, English toggle) → 3 quick checks; checks are scored on the server, finishing adds the words to SRS, logs wrong checks as mistakes and unlocks the next lesson. Leaving halfway resumes at the same step. Furigana throughout |
| Sentence builder | `/builder`: the 12 N5 sentence patterns, 5 sentences each. Tap tiles into order (with decoy tiles; furigana on every tile), check, hear it read; other natural word orders count. Runs are scored on the server; best score per pattern is kept, wrong sentences are logged as mistakes, XP and streak count. Leaving halfway resumes |
| JLPT Center | `/mock`: full-length mocks for N5–N2 (two for N5) with the official question count in every part (N5 67, N4 85, N3 102, N2 107; time limits 90, 115, 140 and 155 minutes; `tests/full-mocks.test.ts` checks the counts against `OFFICIAL_PARTS`), listed first with a "Full length" badge, plus the shorter mocks, all in real JLPT order — vocabulary, grammar & reading, listening — with a timer per paper at the official minutes per question. Exam conditions (timed, no furigana, counts towards the pass record) or practice mode (untimed, furigana except on the answer, listening scripts). Listening is read aloud by the device voice. Results show a predicted score per scoring section against the real pass lines and sectional minimums, accuracy by part, and a full review; every miss is logged and its words go into reviews |
| Exam printing | Follows the official JLPT sample papers (jlpt.jp, N5–N2): kanji within a level are printed bare, kanji above it keep furigana. So kanji above the scope's level always show furigana, even in exam mode where other furigana is hidden. Lessons, builder, readings, listening and mocks use their content's level; word cards use the higher of the word's level and your kanji stage (the first level whose kanji you haven't mostly started), plus every kanji you've started. Kanji cards and kanji questions are exempt. Levels come from `src/lib/kanji-levels.generated.ts` (`npm run build:kanji-levels`); `npm run audit:kanji` lists content kanji above its level, and `tests/kanji-levels-render.test.tsx` checks every pack. Mock timing uses the official question counts (N5/N4 from the December 2020 revision, N3/N2 from the official guidebook). Build-time furigana reads numbers with their counters (四人 よにん, 三十分 さんじゅっぷん, 7日 なのか) and common noun suffixes (参加者 しゃ, 山田様 さま, 発売後 ご) |
| Content audit | `npm run audit` scans every pack against rules in `src/lib/audit/engine.ts` and writes `content/audit/report.json` (admin → Content audit shows it). Rules cover JLPT standards (official question counts in full mocks, 3 options for 即時応答 and 4 elsewhere, passage lengths near the official ones, 漢字読み questions underlining a kanji word), correctness (kana readings for every kanji word, valid answer keys and distinct options, furigana that spell the sentence and match the dictionary, kanji key readings and quiz words, links to items and texts, word topics) and beginner fit (sentence length per level, two examples per grammar point, lessons not teaching a higher level's grammar). Errors fail `tests/content-audit.test.ts` and the pre-build gate (`prebuild` runs `npm run audit -- --check`, so a deploy with content errors fails and the live site stays as it was); warnings may not rise above `content/audit/baseline.json` (now 0 for every rule), which is lowered with `npm run audit -- --baseline` as they're fixed. Newcomer content has its own rules: polite form only (です/ます or a polite set phrase), line lengths by stage and level, and valid gist questions; its furigana go through the same furigana checks. Findings checked by hand and accepted go in `content/audit/allow.json` with the reason. Duplicate words are merged through `content/merges/duplicates.json` (`npm run build:dedupe`; learners' progress moves to the kept word), and the old app's grammar points take their examples from `content/legacy/grammar-examples.json` (`npm run build:legacy-grammar`), written in kana with spaces between phrases as the JLPT N5 paper does. A weekly scheduled task runs the audit plus a hand review of a sample of content |
| Adaptive support | Learners start as Beginner: 3 answer choices and 3 new items per group. At 100 items learned with 75% of recent reviews right they move to Developing (4 choices as in the exam, 4 new at a time), and at 500 with 90% to Confident (5 new at a time). Falling below the accuracy bar steps back down. The home page shows the current stage and what moves it up (`src/lib/study/mastery.ts`); study sessions and course units both follow it |
| Kanji side by side | `/kanji`: 89 hand-written look-alike groups (未/末, 待/持/特, 険/検/験…) with what tells them apart and a parts-based hint per kanji, plus 26 generated sound families sharing a part and an on-reading (青 情 晴 精 静 清: せい). Each page shows the kanji side by side (meaning, 音/訓, parts, an example word), then a quiz on the difference. Kanji cards link to their groups. Radicals: every part of the N5–N2 kanji is a radical item with a meaning and kana name (`npm run build:radicals`), studied on their own in the "Radicals" topic on the home page. They never gate a kanji or join a kanji, course or "Everything" batch, and they don't count towards any level's kanji total; already-started radicals still come back in "Everything" when due |
| Today's plan | Home page: days to the exam and a checklist that ticks itself off from today's activity: clear reviews, the day's new words (from the exam pace), one lesson, and a practice skill that rotates by weekday (reading, builder, listening, a situation, a mock on Saturday). The last 8 weeks switch to reviews and a daily mock |
| Exam readiness | `/readiness` and a card on the home page: for each level N5–N2, how far you are towards each area's target (know 80% of the level's words and kanji; finish its lessons; do 60% of its reading and listening sets averaging 70%; pass a mock in exam mode 10 points clear of the line), an overall percentage weighted towards vocabulary and kanji, and the one thing to do next (the biggest weighted gap). Checkpoint dates share the time to your exam date across the levels still to go, by how many new words each asks (`src/lib/readiness/readiness.ts`) |
| Placement test | `/placement`: 12 words per level from N5 to the target, sampled across each level's frequency range; 10 right moves you up. Words answered right, and every unstarted word of the levels passed, can be marked known: they go straight into review, first due spread over the next weeks (3 months for whole levels), so the course skips them |
| Listening | `/listening`: 34 original sets (N5 12, N4 12, N3 and N2 5 each), one JLPT listening part per set. Play (device voice), answer, then read the script with furigana; best score kept, misses go into reviews |
| Reading | `/reading`: 15 original N5 passages (短文 notes and messages, 中文 diaries and letters, 情報検索 a menu and a class schedule, written with spaces the way the N5 paper is) with a furigana toggle, tap-a-sentence audio and 3 comprehension questions each; best score kept |
| Newcomer | `/newcomer`, its own section for learning to speak the way children do: whole sentences from your own day, heard, said aloud and recalled. **My phrases**: type sentences in English or Malay (one per line adds several); Claude (`claude-opus-5-5`, server-side only, `NEWCOMER_MONTHLY_BUDGET_USD`, default $5; every call is logged in `newcomer_ai_spend` and the page shows each phrase's cost and the month and all-time spend) turns them into natural polite Japanese with furigana and an all-kana version; "Add to my list" translates and saves in one step (a wrong one can be deleted, with Undo; lines that fail stay in the box to reword). Each phrase can be set to Priority, Normal, Less often or Paused, edited (translated again, progress kept) or deleted with Undo. Each translation also lists the dictionary words the phrase uses (食べる, コーヒー); those that are on the N5–N2 word lists jump ahead of every other new word in Study everything (after kana), so you learn the words you actually say first (`phraseWordIds`, `pickNewItems` in `src/lib/study/curriculum.ts`). **Recall**: the meaning first, say it aloud, tap to see and hear it, then grade yourself Correct or Wrong (buttons pinned at the bottom); misses return at the end of the session and in 10 minutes, right answers after 1, 2, 4, 7, 14, 30, 60 days (×3 for Less often); the score is the share right. Answers given offline wait on the phone and sync later. **Night Recall**: from 21:30 to 04:00 in your timezone the home page shows a checklist that ticks itself: recall your phrases, one starter topic, and the playlist (a play in the app or a Siri Shortcut fetch counts; `newcomer_plays`). **Playlist**: Japanese → silence as long as the phrase plus 2 s (adjustable) to shadow it → the meaning, looping, with the screen kept on (Wake Lock); pick the Japanese voice (on iPhone download Otoya or Kyoko under Settings → Accessibility → Spoken Content → Voices) and speed. **Starter topics**: 12 topics, 189 everyday phrases (`content/newcomer/starter.source.json` → `npm run build:newcomer`), in 7 stages from single chunks to short stories; stages 1–2 are open, and each next one opens at 70% right. **Listen first**: `/newcomer/listening`, 42 graded scenes (12 topics, levels 1–3, plus level 4 for six; `content/newcomer/listening.source.json`, built by `npm run build:newcomer`): hear the scene with no text (two Japanese voices for the two speakers), answer one gist question, then read the transcript with furigana and tap lines to replay; a level opens once the gist of the one below is caught or it has been heard three times. **Locked phone**: `/newcomer/shortcut` gives a private feed link (`/api/newcomer/feed`) for a Siri Shortcut that speaks your phrases with the screen off. Display is kana first with a toggle to kanji with furigana; no romaji. A service worker (`public/sw.js`) keeps the Newcomer pages working offline |

## Stack

Next.js 16 (App Router) · Tailwind 4 · Supabase (Postgres, Auth, Storage) ·
ts-fsrs · Zod · Vitest + PGlite · Vercel. No paid AI APIs at runtime, and no
service-role key: every query, admin ones included, runs as the signed-in user
under row-level security.

## Setup

### 1. Supabase project

1. Create a new project (free tier, region `ap-southeast-1`).
2. **Authentication → Sign In / Providers**: keep Email enabled and turn
   **off** "Allow new users to sign up".
3. **SQL Editor**: run each file in `supabase/migrations/` in name order.
4. **Authentication → Users → Add user**: create your account with a password.
5. **SQL Editor**: run `supabase/seed/make_admin.sql` with your email filled in.

### 2. Vercel

1. **Before merging this build to `main`**, open the *old* Vercel project →
   Settings → Git → set **Production Branch** to `legacy`. Otherwise its next
   production deploy builds this Next.js app with the old Vite settings.
2. Create a **new** Vercel project from this repo (framework: Next.js, branch
   `main`).
3. Add the environment variables from `.env.example` (Supabase → Project
   Settings → API). For the AI engine and Newcomer translation, add
   `ANTHROPIC_API_KEY` marked **Sensitive** (never `NEXT_PUBLIC_`).

### 3. Load the old content

Content packs live in `content/` (listed in `src/lib/content/packs.ts`, in
import order) and are loaded into the database with SQL: fetch each pack from
the repo at a commit (`extensions.http_get`) and upsert its records by slug as
live. The admin console no longer imports; use **Admin → Content** to browse,
edit and change status.

## Development

```bash
cp .env.example .env.local   # fill in your Supabase URL and publishable key
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm test` | Unit tests plus RLS tests that run the migrations in PGlite (in-process Postgres) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run build` | Production build |
| `npm run port:legacy` | Regenerate `content/legacy/*.json` from the `legacy` branch |
| `npm run build:lessons` | Regenerate `content/lessons/*.json` (adds furigana) from the hand-written `*.source.json` files |
| `npm run build:builder` | Regenerate `content/builder/*.json` (tiles + furigana) from `*.source.json` |
| `npm run build:kanji-parts -- <kradfile-u>` | Re-vendor KRADFILE kanji components (`content/kanji-parts`) used for memory hints |
| `npm run build:practice` | Regenerate the grammar, mock, reading and listening packs (`content/grammar`, `content/mock`, `content/reading`, `content/listening`) from `*.source.json` |
| `npm run build:roles` | Add grammar colours (subject, object, verb, particle) to every sentence in the packs. Run it last, after any other build script |
| `npm run build:open-data -- <dir>` | Regenerate `content/opendata/*.json` from downloaded `kanji.json` (kanji-data) and `n5–n2.csv` (open-anki-jlpt-decks) |

New migrations go in `supabase/migrations/` with a timestamp prefix. New
content tables need RLS enabled and policies in the same migration; extend
`tests/db/rls.test.ts` to cover them.

## Content

Hand-written sources can name words by spelling (`"友達"`) instead of slug; `scripts/content-items.ts` resolves them. Furigana comes from the tokenizer plus our vocabulary readings, with `LESSON_READINGS` in `scripts/build-lessons.ts` for readings it gets wrong; a source can also pin one inline as `[時|じ]`.

Memory hints for words and kanji are built only from kanji parts (男 = 田 rice field + 力 power; 学生 = 学 study + 生 life), never English sound-alikes. `scripts/kanji-hints.ts` generates them from KRADFILE when the packs are built; words written only in kana get no hint.

Drafted in Claude chat with the templates in `docs/prompts/`, saved as JSON in
the format in `docs/import-format.md`, built into packs, and reviewed before
going live. Only original content and open-licensed data (JMdict, KANJIDIC2,
KanjiVG, Tatoeba) with attribution. Never copy content from other apps or
textbooks.

## Backups

Supabase Free has no managed backups. Download **Admin → Export** weekly: it
contains your profile, SRS state, review history, mistakes and the full
content bank.
