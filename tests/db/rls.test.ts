import { beforeAll, describe, expect, it } from "vitest";
import { as, createDb, createUser, type Db } from "./harness";

const ADMIN = "00000000-0000-0000-0000-00000000000a";
const ALICE = "00000000-0000-0000-0000-0000000000a1";
const BOB = "00000000-0000-0000-0000-0000000000b0";

let db: Db;
let liveItemId: string;

beforeAll(async () => {
  db = await createDb();
  await createUser(db, ADMIN, "admin@example.com", true);
  await createUser(db, ALICE, "alice@example.com");
  await createUser(db, BOB, "bob@example.com");
  const { rows } = await db.query<{ id: string }>(
    `insert into public.items (slug, type, jlpt_level, term, meaning, status)
     values ('kana-hiragana-a', 'kana', 'preN5', 'あ', 'a', 'live'),
            ('kana-hiragana-i', 'kana', 'preN5', 'い', 'i', 'draft')
     returning id`,
  );
  liveItemId = rows[0].id;
}, 60_000);

describe("new user bootstrap", () => {
  it("creates a learner profile and gamification row", async () => {
    const p = await db.query(`select role, display_name from public.profiles where id = $1`, [ALICE]);
    expect(p.rows).toEqual([{ role: "learner", display_name: "alice" }]);
    const g = await db.query(`select xp, streak from public.gamification where user_id = $1`, [ALICE]);
    expect(g.rows).toEqual([{ xp: 0, streak: 0 }]);
  });
});

describe("profiles", () => {
  it("lets a learner update their own settings", async () => {
    await as(db, ALICE, () => db.query(`update public.profiles set daily_minutes = 30 where id = $1`, [ALICE]));
    const r = await db.query(`select daily_minutes from public.profiles where id = $1`, [ALICE]);
    expect(r.rows).toEqual([{ daily_minutes: 30 }]);
  });

  it("lets a learner set their timezone", async () => {
    await as(db, ALICE, () => db.query(`update public.profiles set timezone = 'Asia/Tokyo' where id = $1`, [ALICE]));
    const r = await db.query(`select timezone from public.profiles where id = $1`, [ALICE]);
    expect(r.rows).toEqual([{ timezone: "Asia/Tokyo" }]);
  });

  it("blocks a learner from promoting themselves to admin", async () => {
    await expect(
      as(db, ALICE, () => db.query(`update public.profiles set role = 'admin' where id = $1`, [ALICE])),
    ).rejects.toThrow(/permission denied/);
  });

  it("hides other learners' profiles", async () => {
    const r = await as(db, ALICE, () => db.query(`select id from public.profiles`));
    expect(r.rows).toEqual([{ id: ALICE }]);
  });

  it("blocks direct profile inserts", async () => {
    await expect(
      as(db, ALICE, () => db.query(`insert into public.profiles (id) values ($1)`, [BOB])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("content tables", () => {
  it("shows learners only live content", async () => {
    const r = await as(db, ALICE, () => db.query(`select slug from public.items order by slug`));
    expect(r.rows).toEqual([{ slug: "kana-hiragana-a" }]);
  });

  it("shows admins drafts too", async () => {
    const r = await as(db, ADMIN, () => db.query<{ slug: string }>(`select slug from public.items order by slug`));
    expect(r.rows.map((x) => x.slug)).toEqual(["kana-hiragana-a", "kana-hiragana-i"]);
  });

  it("blocks learners from writing content", async () => {
    await expect(
      as(db, ALICE, () =>
        db.query(`insert into public.items (slug, type, jlpt_level, term, meaning) values ('x', 'word', 'N5', 'x', 'x')`),
      ),
    ).rejects.toThrow(/row-level security/);
    const upd = await as(db, ALICE, () => db.query(`update public.items set meaning = 'hacked'`));
    expect(upd.affectedRows).toBe(0);
  });

  it("lets admins write content and log reviews", async () => {
    await as(db, ADMIN, async () => {
      await db.query(
        `insert into public.items (slug, type, jlpt_level, term, meaning) values ('word-mizu', 'word', 'N5', '水', 'water')`,
      );
      await db.query(
        `insert into public.content_reviews (content_table, content_id, from_status, to_status)
         select 'items', id, 'draft', 'reviewed' from public.items where slug = 'word-mizu'`,
      );
    });
    const r = await db.query(`select reviewer_id from public.content_reviews`);
    expect(r.rows).toEqual([{ reviewer_id: ADMIN }]);
  });

  it("blocks anonymous calls to security-definer functions", async () => {
    await expect(as(db, null, () => db.query(`select public.is_admin()`))).rejects.toThrow(/permission denied/);
    await expect(as(db, ALICE, () => db.query(`select public.handle_new_user()`))).rejects.toThrow(/permission denied/);
    const r = await as(db, ADMIN, () => db.query<{ is_admin: boolean }>(`select public.is_admin()`));
    expect(r.rows).toEqual([{ is_admin: true }]);
  });

  it("blocks anonymous reads", async () => {
    await expect(as(db, null, () => db.query(`select * from public.items`))).rejects.toThrow(/permission denied/);
  });
});

describe("learner tables", () => {
  it("keeps lesson progress owner-only", async () => {
    const lesson = await db.query<{ id: string }>(
      `insert into public.lessons (slug, jlpt_level, position, title, status) values ('lesson-x', 'N5', 1, 'X', 'live') returning id`,
    );
    const lessonId = lesson.rows[0].id;
    await as(db, ALICE, () =>
      db.query(`insert into public.lesson_progress (lesson_id, score, max_score) values ($1, 2, 3)`, [lessonId]),
    );
    expect((await as(db, BOB, () => db.query(`select * from public.lesson_progress`))).rows).toHaveLength(0);
    await expect(
      as(db, BOB, () =>
        db.query(`insert into public.lesson_progress (user_id, lesson_id, score, max_score) values ($1, $2, 3, 3)`, [
          ALICE,
          lessonId,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(as(db, null, () => db.query(`select * from public.lesson_progress`))).rejects.toThrow(/permission denied/);
  });

  it("keeps builder progress owner-only", async () => {
    const pattern = await db.query<{ id: string }>(
      `insert into public.sentence_patterns (slug, jlpt_level, title, template, status) values ('pattern-x', 'N5', 'X', '[{"text":"x"}]', 'live') returning id`,
    );
    const patternId = pattern.rows[0].id;
    await as(db, ALICE, () =>
      db.query(`insert into public.builder_progress (pattern_id, best_score, max_score) values ($1, 4, 5)`, [patternId]),
    );
    expect((await as(db, ALICE, () => db.query(`select * from public.builder_progress`))).rows).toHaveLength(1);
    expect((await as(db, BOB, () => db.query(`select * from public.builder_progress`))).rows).toHaveLength(0);
    await expect(
      as(db, BOB, () =>
        db.query(`insert into public.builder_progress (user_id, pattern_id, best_score, max_score) values ($1, $2, 5, 5)`, [
          ALICE,
          patternId,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(as(db, null, () => db.query(`select * from public.builder_progress`))).rejects.toThrow(/permission denied/);
  });

  it("keeps mock attempts and reading progress owner-only", async () => {
    const mock = await db.query<{ id: string }>(
      `insert into public.mock_tests (slug, jlpt_level, title, time_limit_min, status) values ('mock-x', 'N5', 'X', 60, 'live') returning id`,
    );
    const text = await db.query<{ id: string }>(
      `insert into public.texts (slug, jlpt_level, kind, title, body, status) values ('text-x', 'N5', 'reading', 'X', 'x', 'live') returning id`,
    );
    await as(db, ALICE, () =>
      db.query(`insert into public.mock_attempts (mock_test_id, correct, total, passed) values ($1, 30, 50, true)`, [mock.rows[0].id]),
    );
    await as(db, ALICE, () =>
      db.query(`insert into public.text_progress (text_id, best_score, max_score) values ($1, 3, 3)`, [text.rows[0].id]),
    );
    for (const table of ["mock_attempts", "text_progress"]) {
      expect((await as(db, ALICE, () => db.query(`select * from public.${table}`))).rows).toHaveLength(1);
      expect((await as(db, BOB, () => db.query(`select * from public.${table}`))).rows).toHaveLength(0);
      await expect(as(db, null, () => db.query(`select * from public.${table}`))).rejects.toThrow(/permission denied/);
    }
    await expect(
      as(db, BOB, () =>
        db.query(`insert into public.mock_attempts (user_id, mock_test_id, correct, total, passed) values ($1, $2, 50, 50, true)`, [
          ALICE,
          mock.rows[0].id,
        ]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("keeps user_items owner-only", async () => {
    await as(db, ALICE, () =>
      db.query(`insert into public.user_items (user_id, item_id) values ($1, $2)`, [ALICE, liveItemId]),
    );
    const bobSees = await as(db, BOB, () => db.query(`select * from public.user_items`));
    expect(bobSees.rows).toHaveLength(0);
    await expect(
      as(db, BOB, () => db.query(`insert into public.user_items (user_id, item_id) values ($1, $2)`, [ALICE, liveItemId])),
    ).rejects.toThrow(/row-level security/);
  });

  it("keeps reviews append-only", async () => {
    await as(db, ALICE, () =>
      db.query(`insert into public.reviews (item_id, card_type, grade, source) values ($1, 'recognition', 3, 'srs')`, [
        liveItemId,
      ]),
    );
    await expect(as(db, ALICE, () => db.query(`update public.reviews set grade = 4`))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(db, ALICE, () => db.query(`delete from public.reviews`))).rejects.toThrow(/permission denied/);
  });
});
