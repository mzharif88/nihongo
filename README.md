# 日本語Go! — NihonGo!

> **Master Japanese and pass the actual JLPT.** A full-stack web app with spaced repetition flashcards, gamified quizzes, timed JLPT mock tests (N5–N1), and a curated resources hub.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🃏 **SRS Flashcards** | SM-2 spaced repetition algorithm — weak cards surface more, mastered cards less |
| 🎮 **Gamified Quizzes** | MCQ with hearts system, live score, XP rewards, audio playback |
| 📝 **JLPT Mock Tests** | Timed full simulations N5–N1 with section-by-section scoring and pass/fail verdict |
| 🔊 **Native Audio** | Web Speech API TTS — every character pronounced in Japanese |
| 🏆 **XP & Badges** | Earn XP, maintain daily streaks, unlock levels, collect 15+ badges |
| 📺 **Resources Hub** | 7 curated podcasts + 9 YouTube channels, organized by JLPT level |
| 👤 **Google Auth** | One-click login via Supabase Google OAuth |
| 📊 **Leaderboard** | Weekly XP rankings |

---

## 🗂️ Content Coverage

### Scripts
| Module | Beginner (N5–N4) | Intermediate (N3) | Advanced (N2–N1) |
|---|---|---|---|
| **Hiragana** | All 46 characters | Dakuten + combo chars | Long vowels, particles |
| **Katakana** | All 46 characters | Extended sounds, loanwords | Foreign names, menus |
| **Kanji** | 34 N5 core kanji | 10 N4–N3 action kanji | Up to 2,000 (coming soon) |

### JLPT Mock Tests
| Level | Questions | Time | Sections |
|---|---|---|---|
| N5 | 10 | 50 min | Vocab · Grammar · Reading · Listening |
| N4 | 10 | 70 min | Vocab · Grammar · Reading · Listening |
| N3 | 10 | 100 min | Vocab · Grammar · Reading · Listening |
| N2 | 10 | 105 min | Vocab · Grammar · Reading · Listening |
| N1 | 10 | 110 min | Vocab · Grammar · Reading · Listening |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Styling | Custom CSS (dark Japanese ink aesthetic) |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Audio | Web Speech API (TTS) |
| SRS | SM-2 algorithm (custom implementation) |
| Hosting | Vercel |

---

## 🚀 Quick Start — Local Development

### Prerequisites
- Node.js 18+
- A Supabase account
- A Google Cloud Console project (for OAuth)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/nihongo-app.git
cd nihongo-app
npm install
```

### 2. Set Up Supabase

#### Create a project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a region close to your users (e.g. `ap-southeast-1` for Malaysia/SEA)
3. Save your **database password** — you'll need it later

#### Run the database schema
1. In your Supabase dashboard → **SQL Editor**
2. Paste and run the full schema from `database/schema.sql`

This creates 9 tables:
- `users` — profiles linked to Google auth
- `progress` — XP, streak, completion % per module/level
- `flashcard_content` — all cards (character, romaji, English, audio, mnemonic)
- `flashcard_sessions` — SRS tracking per card per user
- `quiz_results` — scores, accuracy, XP earned
- `mock_test_results` — JLPT mock scores by section
- `badges` — 15 badge definitions (pre-seeded)
- `user_badges` — earned badges per user
- `leaderboard` — weekly XP snapshots

#### Enable Google OAuth
1. **Supabase → Authentication → Providers → Google** → toggle ON
2. Add your Google **Client ID** and **Client Secret**
3. Copy the **Callback URL** shown (you'll need it in step 3)

### 3. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google+ API**
4. Go to **APIs & Services → Credentials → Create OAuth Client ID**
5. Application type: **Web application**
6. Add to **Authorized redirect URIs**:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
7. Copy the **Client ID** and **Client Secret** → paste into Supabase (step 2)

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here
```

Find these in: **Supabase → Settings → API**

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## ☁️ Deploy to Vercel

### Option A — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel
```

Follow the prompts, then add environment variables when asked.

### Option B — GitHub + Vercel Dashboard

```bash
# Push to GitHub first
git init
git add .
git commit -m "🎌 Initial commit — NihonGo!"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nihongo-app.git
git push -u origin main
```

Then:
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**

### After Deployment — Update Supabase Auth URLs

In **Supabase → Authentication → URL Configuration**:

```
Site URL:
https://your-app.vercel.app

Redirect URLs:
https://your-app.vercel.app
https://your-app.vercel.app/**
http://localhost:5173 (for local dev)
```

---

## 📁 Project Structure

```
nihongo-app/
├── public/
│   └── vite.svg
├── src/
│   ├── lib/
│   │   ├── supabase.js          # Supabase client instance
│   │   ├── srs.js               # SM-2 algorithm + XP calculations
│   │   └── audio.js             # Web Speech API TTS utility
│   ├── hooks/
│   │   └── useAuth.jsx          # Auth context — login, logout, profile
│   ├── data/
│   │   └── content.js           # All flashcard content, mock questions, resources
│   ├── pages/
│   │   ├── Landing.jsx          # Landing page + Google login CTA
│   │   ├── Dashboard.jsx        # Home — XP, streak, module cards
│   │   ├── Flashcards.jsx       # SRS flashcard session
│   │   ├── Quiz.jsx             # MCQ quiz with hearts system
│   │   ├── MockTest.jsx         # Timed JLPT mock tests N5–N1
│   │   └── Pages.jsx            # Resources, Leaderboard, Profile, ModuleSelector
│   ├── App.jsx                  # Root — routing + navbar
│   ├── main.jsx                 # React entry point
│   └── index.css                # Global styles (dark Japanese ink theme)
├── .env.example                 # Environment variable template
├── .gitignore
├── vercel.json                  # SPA routing config
├── vite.config.js
└── package.json
```

---

## 🗄️ Database Schema

```sql
-- Key tables (simplified)

users (
  id UUID PRIMARY KEY,           -- Supabase auth user ID
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  jlpt_goal TEXT                 -- N5 | N4 | N3 | N2 | N1
)

progress (
  user_id UUID,
  module TEXT,                   -- hiragana | katakana | kanji
  level TEXT,                    -- beginner | intermediate | advanced
  xp INTEGER,
  streak_days INTEGER,
  completion_pct NUMERIC,
  unlocked BOOLEAN
)

flashcard_sessions (             -- SRS tracking per card
  user_id UUID,
  card_id UUID,
  ease_factor NUMERIC,           -- SM-2 ease factor
  interval_days INTEGER,         -- days until next review
  repetitions INTEGER,
  next_review DATE
)

mock_test_results (
  user_id UUID,
  jlpt_level TEXT,               -- N5 | N4 | N3 | N2 | N1
  vocab_score INTEGER,
  grammar_score INTEGER,
  reading_score INTEGER,
  listening_score INTEGER,
  total_score INTEGER,           -- auto-computed
  passed BOOLEAN
)
```

Full schema with RLS policies, triggers, and badge seeds: see `database/schema.sql`

---

## 🎮 Gamification System

| Mechanic | XP Value |
|---|---|
| Flashcard — Easy | +10 XP |
| Flashcard — OK | +5 XP |
| Flashcard — Again | +1 XP |
| Quiz correct answer | +15 XP |
| Perfect quiz (100%) | +50 XP bonus |
| Daily login | +20 XP |
| JLPT mock pass | +200 XP |

**Streak multipliers:**
- 3+ days → 1.2× XP
- 7+ days → 1.5× XP
- 30+ days → 2.0× XP

**Level unlock thresholds:**
- Intermediate → 500 XP
- Advanced → 2,000 XP

---

## 🗺️ Roadmap

- [ ] Persist XP and progress to Supabase
- [ ] Stroke order animations (Hiragana/Katakana)
- [ ] Audio quiz mode (hear → identify)
- [ ] Writing/trace quiz mode
- [ ] Full N4–N1 kanji content
- [ ] JLPT full question banks (60–110 questions per level)
- [ ] Payment/subscription tier (Stripe)
- [ ] Mobile app (React Native / Capacitor)
- [ ] Leaderboard live data from Supabase
- [ ] Push notification reminders for streaks
- [ ] AI-generated hints via Claude API

---

## 📚 Resources

The app includes a curated Resources Hub with:

**Podcasts:** JapanesePod101 · Japanese with Shun · Nihongo con Teppei · Learn Japanese Pod · Slow Japanese · Tofugu

**YouTube:** Comprehensible Japanese · NHK World · Sambon Juku · Nihongo no Mori · Dogen · That Japanese Man Yuta · Foxumon · BondLingo

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT

---

<div align="center">
  <strong>Built with ❤️ for Japanese learners everywhere.</strong><br/>
  <em>目標はJLPT合格！ — The goal is passing the JLPT!</em>
</div>
