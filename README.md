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
| SRS | `/study`: every due review (no cap) then the next 10 new items, with "Keep going" for more and no daily limit; `/study?topic=…` studies one topic (resumes where you left off, since every answer is saved); all cards multiple choice; furigana over kanji everywhere (hidden only when the reading is the answer); XP and streaks |
| Home | Study everything, Continue (last topic), and a topic grid (scripts, kanji and words by level, word topics) with progress and due counts; pace card shows the exam-date target as a guide only; `/settings` for level, exam date, goal and timezone |
| N4 | 24 original N4 grammar points (`content/grammar`), 6 N4 lessons (clinic, travel plans, part-time job rules, moving house, casual weekend chat, directions), 8 N4 builder patterns (40 sentences), N4 mock test 1 (50 questions, including the N4 usage part) and 5 N4 reading passages |
| N3 | 25 original N3 grammar points, 6 N3 lessons (job interview, health habits, news, overtime, lateness, transfer), 8 N3 builder patterns (40 sentences), N3 mock tests 1 and 2 (52 questions each, in three scored sections) and 5 N3 reading passages |
| N2 | 25 original N2 grammar points, 6 N2 lessons (budget meeting, signing a lease, environment seminar, complaint handling, career advice, disaster drill), 8 N2 builder patterns (40 sentences), N2 mock tests 1 and 2 (56 and 58 questions in the N2 paper layout: one language-and-reading paper, then listening; test 2 adds 問題13, the long argumentative passage) and 5 N2 reading passages |
| Situations | 17 everyday-situation lessons in 5 groups (public transport, restaurants, shopping, convenience store, hotel/doctor/post office/bank/city office): key phrases, a scene dialogue and 6 understand-and-respond checks each, on their own page and open in any order |
| Adaptive course | `/course`: plans units from the words and kanji you haven't started, N5 up to your target (capped at N2 for now). Each unit teaches a kanji (its parts first if new) with the words that use it, then fill-in-the-blank practice in sentences that combine the unit's words, then refreshers for words you keep missing. Unit size adapts to recent review accuracy and the review backlog. Rule-based (`src/lib/course/engine.ts`); approved AI-written sentences (admin → AI engine) join items' examples and feed its fill-in-the-blank practice |
| Lessons | `/lessons`: 5 original N5 situation lessons (introductions, konbini, station, time, restaurant). Each runs situation → new words → grammar → dialogue (tap to hear, English toggle) → 3 quick checks; checks are scored on the server, finishing adds the words to SRS, logs wrong checks as mistakes and unlocks the next lesson. Leaving halfway resumes at the same step. Furigana throughout |
| Sentence builder | `/builder`: the 12 N5 sentence patterns, 5 sentences each. Tap tiles into order (with decoy tiles; furigana on every tile), check, hear it read; other natural word orders count. Runs are scored on the server; best score per pattern is kept, wrong sentences are logged as mistakes, XP and streak count. Leaving halfway resumes |
| JLPT Center | `/mock`: original N5 mock test 1 (51 questions) in real JLPT order — vocabulary, grammar & reading, listening — with a timer per paper at the official minutes per question. Exam conditions (timed, no furigana, counts towards the pass record) or practice mode (untimed, furigana except on the answer, listening scripts). Listening is read aloud by the device voice. Results show a predicted score per scoring section against the real pass lines and sectional minimums, accuracy by part, and a full review; every miss is logged and its words go into reviews |
| Exam printing | Follows the official JLPT sample papers (jlpt.jp, N5–N2): kanji within a level are printed bare, kanji above it keep furigana. So kanji above the scope's level always show furigana, even in exam mode where other furigana is hidden. Lessons, builder, readings, listening and mocks use their content's level; word cards use the higher of the word's level and your kanji stage (the first level whose kanji you haven't mostly started), plus every kanji you've started. Kanji cards and kanji questions are exempt. Levels come from `src/lib/kanji-levels.generated.ts` (`npm run build:kanji-levels`); `npm run audit:kanji` lists content kanji above its level, and `tests/kanji-levels-render.test.tsx` checks every pack. Mock timing uses the official question counts (N5/N4 from the December 2020 revision, N3/N2 from the official guidebook) |
| Kanji side by side | `/kanji`: 89 hand-written look-alike groups (未/末, 待/持/特, 険/検/験…) with what tells them apart and a parts-based hint per kanji, plus 26 generated sound families sharing a part and an on-reading (青 情 晴 精 静 清: せい). Each page shows the kanji side by side (meaning, 音/訓, parts, an example word), then a quiz on the difference. Kanji cards link to their groups. Radicals: every part of the N5–N2 kanji is a radical item with a meaning and kana name (`npm run build:radicals`), taught just before the first kanji that uses it |
| Today's plan | Home page: days to the exam and a checklist that ticks itself off from today's activity: clear reviews, the day's new words (from the exam pace), one lesson, and a practice skill that rotates by weekday (reading, builder, listening, a situation, a mock on Saturday). The last 8 weeks switch to reviews and a daily mock |
| Placement test | `/placement`: 12 words per level from N5 to the target, sampled across each level's frequency range; 10 right moves you up. Words answered right, and every unstarted word of the levels passed, can be marked known: they go straight into review, first due spread over the next weeks (3 months for whole levels), so the course skips them |
| Listening | `/listening`: 18 original sets (N5–N2, 90 questions), one JLPT listening part per set. Play (device voice), answer, then read the script with furigana; best score kept, misses go into reviews |
| Reading | `/reading`: 5 original N5 passages with a furigana toggle, tap-a-sentence audio and 3 comprehension questions each; best score kept |

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
   Settings → API).

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
