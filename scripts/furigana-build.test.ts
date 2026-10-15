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

describe("counters and suffixes", () => {
  it("reads numbers with their counters and noun suffixes", async () => {
    const annotate = await createAnnotator();
    expect(annotate("家族は四人です。")).toContain("[四人|よにん]");
    expect(annotate("二年前に来ました。")).toContain("[二年|にねん]");
    expect(annotate("三十分かかります。")).toContain("[三十分|さんじゅっぷん]");
    expect(annotate("十五分待ちました。")).toContain("[十五分|じゅうごふん]");
    expect(annotate("何人来ますか。")).toContain("[何人|なんにん]");
    expect(annotate("ご利用日の7日前まで")).toContain("[7日|なのか]");
    expect(annotate("目撃者が説明した。")).toContain("[者|しゃ]");
    expect(annotate("山田様、こちらへどうぞ。")).toContain("[様|さま]");
    expect(annotate("発売後に売れた。")).toContain("[後|ご]");
    expect(annotate("今日中って言われた。")).toContain("[今日中|きょうじゅう]");
    expect(annotate("この店は安い。")).toContain("[店|みせ]");
    expect(annotate("時計店で直した。")).toContain("[店|てん]");
  }, 60_000);
});
