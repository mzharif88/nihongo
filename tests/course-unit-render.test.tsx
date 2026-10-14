import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { planUnits, type CourseItem } from "@/lib/course/engine";
import { unitCards, type Sentence } from "@/lib/course/unit";
import { stripMarkup } from "@/lib/furigana";
import type { StudyItem } from "@/lib/study/cards";

// Render a real course unit, built from the shipped packs, through the study
// session: every card must render without throwing, with its prompt on screen.

vi.mock("@/app/study/actions", () => ({ recordAnswer: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const { StudySession } = await import("@/app/study/session");

const load = (f: string) => JSON.parse(readFileSync(join(process.cwd(), "content", f), "utf8")).records as Record<string, unknown>[];
const bySlug = new Map<string, Record<string, unknown>>();
for (const f of ["legacy/01-items.json", "opendata/00-legacy-level-fixes.json", "opendata/01-kanji-n5.json", "opendata/02-vocab-n5.json", "opendata/03-kanji-n4.json", "opendata/04-vocab-n4.json"])
  for (const r of load(f)) bySlug.set(r.slug as string, { ...(bySlug.get(r.slug as string) ?? {}), ...r });
const items = [...bySlug.values()]
  .filter((r) => r.type && r.term)
  .map((r) => ({
    id: r.slug,
    slug: r.slug,
    type: r.type,
    jlpt_level: r.jlpt_level,
    term: r.term,
    reading: r.reading ?? null,
    romaji: r.romaji ?? null,
    meaning: r.meaning ?? "",
    mnemonic: r.mnemonic ?? null,
    examples: r.examples ?? [],
    tags: r.tags ?? [],
    topic: r.topic ?? null,
    prerequisites: r.prerequisites ?? [],
    audio_url: null,
    data: r.data ?? null,
  })) as unknown as (StudyItem & CourseItem)[];
const corpus = items.flatMap((i) => i.examples as Sentence[]).filter((s) => /[。？！]$/.test(s.jp));

describe("a course unit in the study session", () => {
  const kanaDone = new Set(items.filter((i) => i.type === "kana" || i.type === "radical").map((i) => i.id));
  const state = { started: kanaDone, learnedSlugs: new Set(kanaDone), recentGrades: [], dueCount: 0, struggling: [] };
  const [unit] = planUnits(items, "N5", state, { count: 1 });
  const cards = unitCards(unit.items as StudyItem[], [], items, corpus, () => 0.3);

  it("plans a kanji unit with words that use it", () => {
    expect(unit.items.some((i) => i.type === "kanji")).toBe(true);
    expect(unit.items.some((i) => i.type === "word")).toBe(true);
    expect(cards.length).toBeGreaterThanOrEqual(unit.items.length);
  });

  it("renders every card, intro or question, with its prompt", () => {
    for (const card of cards) {
      const html = renderToString(<StudySession title={unit.title} cards={[card]} keepGoingHref="/course/next" source="course" />);
      const shown = stripMarkup(card.isNew ? card.reveal.term : card.prompt).replace("（　）", "");
      // Ruby splits text across tags; check the first character made it out.
      expect(html, card.key).toContain(shown.slice(0, 1));
      expect(html).toContain(unit.title.split(" ")[0]);
    }
  });
});
