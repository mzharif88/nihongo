import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const { KanaChart } = await import("@/app/kana/chart");

describe("kana chart", () => {
  it("shows the full hiragana set with romaji and a drill link", () => {
    const html = renderToString(<KanaChart />);
    for (const k of ["あ", "ん", "を", "が", "ぱ", "きゃ", "ぴょ"]) expect(html).toContain(k);
    expect(html).toContain(">shi<");
    expect(html).toContain("/drill?topic=kana%3Ahiragana");
    // 46 basic + 25 voiced + 33 combinations
    expect(html.match(/<button[^>]*aspect-square/g)).toHaveLength(104);
  });
});
