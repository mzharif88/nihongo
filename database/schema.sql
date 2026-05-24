-- ============================================================
-- NihonGo! Japanese Learning App — Full Database Schema
-- Project: daccvyvyvkzemngvolwo
-- Paste this entire file into Supabase SQL Editor and run it
-- ============================================================

-- ─────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  jlpt_goal     TEXT CHECK (jlpt_goal IN ('N5','N4','N3','N2','N1')) DEFAULT 'N5',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);


-- ─────────────────────────────────────────
-- 2. PROGRESS (per user, per module, per level)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module          TEXT NOT NULL CHECK (module IN ('hiragana','katakana','kanji')),
  level           TEXT NOT NULL CHECK (level IN ('beginner','intermediate','advanced')),
  xp              INTEGER DEFAULT 0,
  streak_days     INTEGER DEFAULT 0,
  last_study_date DATE,
  completion_pct  NUMERIC(5,2) DEFAULT 0.00,
  unlocked        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module, level)
);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_select_own" ON progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "progress_insert_own" ON progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "progress_update_own" ON progress FOR UPDATE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────
-- 3. FLASHCARD CONTENT
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcard_content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module          TEXT NOT NULL CHECK (module IN ('hiragana','katakana','kanji')),
  level           TEXT NOT NULL CHECK (level IN ('beginner','intermediate','advanced')),
  character       TEXT NOT NULL,         -- e.g. あ, ア, 日
  romaji          TEXT NOT NULL,         -- e.g. a, a, nichi/hi
  english         TEXT NOT NULL,         -- e.g. "a (vowel)", "sun / day"
  example_jp      TEXT,                  -- example sentence in Japanese
  example_en      TEXT,                  -- example sentence in English
  mnemonic        TEXT,                  -- memory hint
  audio_url       TEXT,                  -- optional pre-recorded audio
  stroke_order_url TEXT,                 -- optional stroke order image/gif
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flashcard_module_level ON flashcard_content(module, level);


-- ─────────────────────────────────────────
-- 4. FLASHCARD SESSIONS (SRS tracking)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flashcard_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id         UUID NOT NULL REFERENCES flashcard_content(id) ON DELETE CASCADE,
  ease_factor     NUMERIC(4,2) DEFAULT 2.5,   -- SRS ease factor
  interval_days   INTEGER DEFAULT 1,           -- days until next review
  repetitions     INTEGER DEFAULT 0,           -- times reviewed
  next_review     DATE DEFAULT CURRENT_DATE,
  last_quality    INTEGER CHECK (last_quality BETWEEN 0 AND 5),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

ALTER TABLE flashcard_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select_own" ON flashcard_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON flashcard_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON flashcard_sessions FOR UPDATE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────
-- 5. QUIZ RESULTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module          TEXT NOT NULL CHECK (module IN ('hiragana','katakana','kanji')),
  level           TEXT NOT NULL CHECK (level IN ('beginner','intermediate','advanced')),
  quiz_type       TEXT CHECK (quiz_type IN ('recognition','recall','audio','stroke')),
  total_questions INTEGER NOT NULL,
  correct         INTEGER NOT NULL,
  accuracy_pct    NUMERIC(5,2) GENERATED ALWAYS AS (ROUND((correct::NUMERIC / total_questions) * 100, 2)) STORED,
  xp_earned       INTEGER DEFAULT 0,
  hearts_remaining INTEGER DEFAULT 5,
  duration_secs   INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_select_own" ON quiz_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quiz_insert_own" ON quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────
-- 6. JLPT MOCK TEST RESULTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mock_test_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jlpt_level          TEXT NOT NULL CHECK (jlpt_level IN ('N5','N4','N3','N2','N1')),
  vocab_score         INTEGER,
  grammar_score       INTEGER,
  reading_score       INTEGER,
  listening_score     INTEGER,
  total_score         INTEGER GENERATED ALWAYS AS (
                        COALESCE(vocab_score,0) + COALESCE(grammar_score,0) +
                        COALESCE(reading_score,0) + COALESCE(listening_score,0)
                      ) STORED,
  pass_threshold      INTEGER,           -- e.g. 80 out of 180
  passed              BOOLEAN,
  duration_secs       INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mock_test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mock_select_own" ON mock_test_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mock_insert_own" ON mock_test_results FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────
-- 7. BADGES (definitions)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,        -- e.g. 'hiragana_hero'
  name        TEXT NOT NULL,              -- e.g. 'Hiragana Hero'
  description TEXT,
  icon        TEXT,                        -- emoji or icon name
  xp_reward   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed badge definitions
INSERT INTO badges (slug, name, description, icon, xp_reward) VALUES
  ('hiragana_hero',     'Hiragana Hero',      'Completed all Hiragana levels',          '🔵', 100),
  ('katakana_master',   'Katakana Master',    'Completed all Katakana levels',          '🔴', 100),
  ('kanji_crusher',     'Kanji Crusher',      'Completed Kanji Beginner level',         '🟡', 150),
  ('streak_3',          '3-Day Streak',       'Studied 3 days in a row',               '🔥', 30),
  ('streak_7',          'Week Warrior',       'Studied 7 days in a row',               '🔥', 75),
  ('streak_30',         'Monthly Master',     'Studied 30 days in a row',              '🔥', 300),
  ('first_quiz',        'First Steps',        'Completed your first quiz',             '⭐', 10),
  ('perfect_quiz',      'Perfect Score',      'Got 100% on any quiz',                  '💯', 50),
  ('n5_cleared',        'N5 Cleared',         'Passed the N5 Mock Test',               '🎌', 200),
  ('n4_cleared',        'N4 Cleared',         'Passed the N4 Mock Test',               '🎌', 300),
  ('n3_cleared',        'N3 Cleared',         'Passed the N3 Mock Test',               '🎌', 500),
  ('n2_cleared',        'N2 Cleared',         'Passed the N2 Mock Test',               '🎌', 750),
  ('n1_cleared',        'N1 Champion',        'Passed the N1 Mock Test — you made it!','🏆', 1000),
  ('early_bird',        'Early Bird',         'Studied before 8am',                    '🌅', 20),
  ('night_owl',         'Night Owl',          'Studied after 11pm',                    '🦉', 20)
ON CONFLICT (slug) DO NOTHING;


-- ─────────────────────────────────────────
-- 8. USER BADGES (earned)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ubadges_select_own" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ubadges_insert_own" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────
-- 9. LEADERBOARD (weekly XP snapshot)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url  TEXT,
  week_start  DATE NOT NULL,
  weekly_xp   INTEGER DEFAULT 0,
  total_xp    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Public read for leaderboard (everyone can see rankings)
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaderboard_public_read" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "leaderboard_insert_own"  ON leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "leaderboard_update_own"  ON leaderboard FOR UPDATE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────
-- 10. AUTO-UPDATE updated_at TRIGGER
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_progress_updated_at
  BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_flashcard_sessions_updated_at
  BEFORE UPDATE ON flashcard_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_leaderboard_updated_at
  BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────
-- 11. AUTO-CREATE USER PROFILE ON SIGNUP
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ─────────────────────────────────────────
-- DONE ✅
-- Tables: users, progress, flashcard_content, flashcard_sessions,
--         quiz_results, mock_test_results, badges, user_badges,
--         leaderboard
-- ─────────────────────────────────────────
