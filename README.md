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
| SRS | `/study`: FSRS session with every due review (no daily cap), then new items at the exam-date pace, plus "Learn 10 more"; multiple-choice recognition and typed recall with romaji→kana; XP and streaks |
| Planner | Home page pace card: new items/day from target level, exam date and an 8-week review buffer; `/settings` for level, exam date, goal and timezone |
| Learner UI | Home page with due/new counts; lessons, sentence builder and the N5 mock are the next Phase 1 slices |

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
| `npm run build:open-data -- <dir>` | Regenerate `content/opendata/*.json` from downloaded `kanji.json` (kanji-data) and `n5–n2.csv` (open-anki-jlpt-decks) |

New migrations go in `supabase/migrations/` with a timestamp prefix. New
content tables need RLS enabled and policies in the same migration; extend
`tests/db/rls.test.ts` to cover them.

## Content

Drafted in Claude chat with the templates in `docs/prompts/`, saved as JSON in
the format in `docs/import-format.md`, imported as drafts, and reviewed before
going live. Only original content and open-licensed data (JMdict, KANJIDIC2,
KanjiVG, Tatoeba) with attribution. Never copy content from other apps or
textbooks.

## Backups

Supabase Free has no managed backups. Download **Admin → Export** weekly: it
contains your profile, SRS state, review history, mistakes and the full
content bank.
