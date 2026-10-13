import { describe, expect, it } from "vitest";
import { createAnnotator, knownWordsFrom } from "./furigana-build";

describe("build-time furigana", () => {
  it("annotates kanji, prefers vocabulary readings, and reads 何 correctly", async () => {
    const annotate = await createAnnotator(knownWordsFrom([{ type: "word", term: "電車", reading: "でんしゃ" }]));
    expect(annotate("一人で行きました。")).toBe("[一人|ひとり]で[行|い]きました。");
    expect(annotate("あれは何ですか。")).toBe("あれは[何|なん]ですか。");
    expect(annotate("何を食べますか。")).toBe("[何|なに]を[食|た]べますか。");
    expect(annotate("日本に行きたい。")).toBe("[日本|にほん]に[行|い]きたい。");
    expect(annotate("電車が遅れています。")).toBe("[電車|でんしゃ]が[遅|おく]れています。");
    expect(annotate("これはペンです。")).toBeUndefined();
  }, 60_000);
});
