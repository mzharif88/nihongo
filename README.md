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
| Admin console | `/admin`: content counts, browse/filter, JSON editor, bulk review queue (draft → reviewed → live), JSON import, full JSON export |
| Content | Old NihonGo! content (`content/legacy`) plus N5–N2 kanji and vocabulary from open data (`content/opendata`, ~6,300 items); `/attributions` credits the sources |
| SRS | `/study`: every due review (no cap) then the next 10 new items, with "Keep going" for more and no daily limit; `/study?topic=…` studies one topic (resumes where you left off, since every answer is saved); all cards multiple choice; furigana over kanji everywhere (hidden only when the reading is the answer); XP and streaks |
| Home | Study everything, Continue (last topic), and a topic grid (scripts, kanji and words by level, word topics) with progress and due counts; pace card shows the exam-date target as a guide only; `/settings` for level, exam date, goal and timezone |
| N4 | 24 original N4 grammar points (`content/grammar`), 6 N4 lessons (clinic, travel plans, part-time job rules, moving house, casual weekend chat, directions), 8 N4 builder patterns (40 sentences), N4 mock test 1 (50 questions, including the N4 usage part) and 5 N4 reading passages |
| N3 | 25 original N3 grammar points, 6 N3 lessons (job interview, health habits, news, overtime, lateness, transfer), 8 N3 builder patterns (40 sentences), N3 mock test 1 (52 questions in three scored sections) and 5 N3 reading passages |
| N2 | 25 original N2 grammar points, 6 N2 lessons (budget meeting, signing a lease, environment seminar, complaint handling, career advice, disaster drill), 8 N2 builder patterns (40 sentences), N2 mock test 1 (56 questions in the N2 paper layout: one language-and-reading paper, then listening) and 5 N2 reading passages |
| Lessons | `/lessons`: 5 original N5 situation lessons (introductions, konbini, station, time, restaurant). Each runs situation → new words → grammar → dialogue (tap to hear, English toggle) → 3 quick checks; checks are scored on the server, finishing adds the words to SRS, logs wrong checks as mistakes and unlocks the next lesson. Leaving halfway resumes at the same step. Furigana throughout |
| Sentence builder | `/builder`: the 12 N5 sentence patterns, 5 sentences each. Tap tiles into order (with decoy tiles; furigana on every tile), check, hear it read; other natural word orders count. Runs are scored on the server; best score per pattern is kept, wrong sentences are logged as mistakes, XP and streak count. Leaving halfway resumes |
| JLPT Center | `/mock`: original N5 mock test 1 (51 questions) in real JLPT order — vocabulary, grammar & reading, listening — with a timer per paper at the official minutes per question. Exam conditions (timed, no furigana, counts towards the pass record) or practice mode (untimed, furigana except on the answer, listening scripts). Listening is read aloud by the device voice. Results show a predicted score per scoring section against the real pass lines and sectional minimums, accuracy by part, and a full review; every miss is logged and its words go into reviews |
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

Sign in, open **Admin → Import**, and import the four "Old NihonGo!" packs top
to bottom. They land as drafts; review and publish them from **Admin → Content**.

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
| `npm run build:practice` | Regenerate the grammar, mock and reading packs (`content/grammar`, `content/mock`, `content/reading`) from `*.source.json` |
| `npm run build:roles` | Add grammar colours (subject, object, verb, particle) to every sentence in the packs. Run it last, after any other build script |
| `npm run build:open-data -- <dir>` | Regenerate `content/opendata/*.json` from downloaded `kanji.json` (kanji-data) and `n5–n2.csv` (open-anki-jlpt-decks) |

New migrations go in `supabase/migrations/` with a timestamp prefix. New
content tables need RLS enabled and policies in the same migration; extend
`tests/db/rls.test.ts` to cover them.

## Content

Hand-written sources can name words by spelling (`"友達"`) instead of slug; `scripts/content-items.ts` resolves them. Furigana comes from the tokenizer plus our vocabulary readings, with `LESSON_READINGS` in `scripts/build-lessons.ts` for readings it gets wrong; a source can also pin one inline as `[時|じ]`.

Memory hints for words and kanji are built only from kanji parts (男 = 田 rice field + 力 power; 学生 = 学 study + 生 life), never English sound-alikes. `scripts/kanji-hints.ts` generates them from KRADFILE when the packs are built; words written only in kana get no hint.

Drafted in Claude chat with the templates in `docs/prompts/`, saved as JSON in
the format in `docs/import-format.md`, imported as drafts, and reviewed before
going live. Only original content and open-licensed data (JMdict, KANJIDIC2,
KanjiVG, Tatoeba) with attribution. Never copy content from other apps or
textbooks.

## Backups

Supabase Free has no managed backups. Download **Admin → Export** weekly: it
contains your profile, SRS state, review history, mistakes and the full
content bank.
