import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { placementQuizzes } from "@/lib/placement/placement";
import { stripMarkup } from "@/lib/furigana";
import type { StudyItem } from "@/lib/study/cards";

// Render the placement quiz built from the shipped N5 vocabulary.

vi.mock("@/app/placement/actions", () => ({ applyPlacement: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const { PlacementQuiz } = await import("@/app/placement/quiz");

const records = JSON.parse(readFileSync(join(process.cwd(), "content", "opendata", "02-vocab-n5.json"), "utf8")).records as Record<string, unknown>[];
const words = records.map((r) => ({
  id: r.slug,
  slug: r.slug,
  type: "word",
  jlpt_level: "N5",
  term: r.term,
  reading: r.reading ?? null,
  romaji: null,
  meaning: r.meaning ?? "",
  mnemonic: null,
  examples: [],
  tags: [],
  topic: null,
  prerequisites: [],
  audio_url: null,
  data: r.data ?? null,
})) as unknown as StudyItem[];

describe("placement quiz", () => {
  it("renders the first N5 question with four options and I don't know", () => {
    const quizzes = placementQuizzes(words, new Set(), "N2");
    expect(quizzes[0].level).toBe("N5");
    const html = renderToString(<PlacementQuiz quizzes={quizzes} />);
    expect(html).toContain("What does this mean?");
    expect(html).toContain(stripMarkup(quizzes[0].cards[0].prompt).slice(0, 1));
    expect(html.match(/<button/g)).toHaveLength(5);
  });
});
