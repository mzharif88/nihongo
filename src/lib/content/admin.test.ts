import { describe, expect, it } from "vitest";
import { applyFilters, parseFilters } from "./admin";

/** Records filter calls the way Supabase's builder chains them. */
function recorder() {
  const calls: unknown[][] = [];
  const builder = {
    eq: (...a: unknown[]) => (calls.push(["eq", ...a]), builder),
    contains: (...a: unknown[]) => (calls.push(["contains", ...a]), builder),
    or: (...a: unknown[]) => (calls.push(["or", ...a]), builder),
  };
  return { builder, calls };
}

const from = (params: Record<string, string>) => (k: string) => params[k];

describe("parseFilters", () => {
  it("keeps valid filters and drops invalid ones", () => {
    expect(parseFilters("items", from({ status: "draft", level: "N5", tag: " hiragana ", q: "" }))).toEqual({
      status: "draft",
      level: "N5",
      tag: "hiragana",
      q: undefined,
    });
    expect(parseFilters("items", from({ status: "published", level: "N9" }))).toEqual({
      status: undefined,
      level: undefined,
      tag: undefined,
      q: undefined,
    });
  });

  it("ignores tags outside items, which have no tags column", () => {
    expect(parseFilters("questions", from({ tag: "x" })).tag).toBeUndefined();
  });
});

describe("applyFilters", () => {
  it("applies every filter so a bulk move matches what the list shows", () => {
    const { builder, calls } = recorder();
    applyFilters(builder, "items", { status: "draft", level: "preN5", tag: "katakana", q: "ka" });
    expect(calls).toEqual([
      ["eq", "status", "draft"],
      ["eq", "jlpt_level", "preN5"],
      ["contains", "tags", ["katakana"]],
      ["or", "slug.ilike.%ka%,term.ilike.%ka%"],
    ]);
  });

  it("searches each kind's own title column and strips PostgREST syntax from the term", () => {
    const { builder, calls } = recorder();
    applyFilters(builder, "questions", { q: "a,b(c)%" });
    expect(calls).toEqual([["or", "slug.ilike.%a b c  %,prompt.ilike.%a b c  %"]]);
  });

  it("adds nothing when there are no filters", () => {
    const { builder, calls } = recorder();
    applyFilters(builder, "items", {});
    expect(calls).toEqual([]);
  });
});
