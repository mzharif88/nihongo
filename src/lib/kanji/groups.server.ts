import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { KanjiGroup } from "./groups";

export interface KanjiCard {
  term: string;
  slug: string | null;
  level: string | null;
  meaning: string;
  on: string[];
  kun: string[];
  parts: { term: string; meaning: string }[];
  started: boolean;
  /** A short word that uses the kanji, at or below the kanji's level when there is one. */
  word: { term: string; reading: string | null; meaning: string } | null;
}

type Row = { id: string; slug: string; term: string; jlpt_level: string; meaning: string; reading: string | null; data: { on?: string[]; kun?: string[]; kun_marked?: string[] } | null; prerequisites: string[] };

const RANK = ["N5", "N4", "N3", "N2", "N1"];

/** Details for each kanji in a group: meaning, readings, parts, an example word, and whether the learner has started it. */
export async function loadGroupCards(supabase: SupabaseClient, userId: string, group: KanjiGroup): Promise<KanjiCard[]> {
  const { data: kanji, error } = await supabase
    .from("items")
    .select("id, slug, term, jlpt_level, meaning, reading, data, prerequisites")
    .eq("type", "kanji")
    .eq("status", "live")
    .in("term", group.kanji)
    .returns<Row[]>();
  if (error) throw new Error(error.message);
  const rows = kanji ?? [];
  const partSlugs = [...new Set(rows.flatMap((r) => r.prerequisites))];
  const [{ data: parts, error: pError }, { data: words, error: wError }, { data: mine, error: mError }] = await Promise.all([
    partSlugs.length
      ? supabase.from("items").select("slug, term, meaning").in("slug", partSlugs)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("items")
      .select("term, reading, meaning, jlpt_level")
      .eq("type", "word")
      .eq("status", "live")
      .or(group.kanji.map((k) => `term.like.*${k}*`).join(","))
      .limit(300),
    rows.length
      ? supabase.from("user_items").select("item_id").eq("user_id", userId).eq("card_type", "recognition").in("item_id", rows.map((r) => r.id))
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (pError || wError || mError) throw new Error((pError ?? wError ?? mError)!.message);
  const partBySlug = new Map((parts as { slug: string; term: string; meaning: string }[]).map((p) => [p.slug, p]));
  const started = new Set((mine as { item_id: string }[]).map((m) => m.item_id));
  const wordList = words as { term: string; reading: string | null; meaning: string; jlpt_level: string }[];

  return group.kanji.map((k) => {
    const r = rows.find((x) => x.term === k);
    const rank = RANK.indexOf(r?.jlpt_level ?? "N1");
    const word =
      wordList
        .filter((w) => w.term.includes(k) && w.term !== k && w.term.length <= 4)
        .sort((a, b) => Number(RANK.indexOf(a.jlpt_level) > rank) - Number(RANK.indexOf(b.jlpt_level) > rank) || RANK.indexOf(a.jlpt_level) - RANK.indexOf(b.jlpt_level) || a.term.length - b.term.length)[0] ?? null;
    return {
      term: k,
      slug: r?.slug ?? null,
      level: r?.jlpt_level ?? null,
      meaning: r?.meaning ?? "",
      // 音 in katakana, 訓 with okurigana in brackets, as dictionaries write them.
      on: [...new Set((r?.data?.on ?? []).map((x) => x.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))))],
      kun: [...new Set(r?.data?.kun_marked ?? r?.data?.kun ?? (r?.reading ? [r.reading] : []))],
      parts: (r?.prerequisites ?? []).flatMap((s) => {
        const p = partBySlug.get(s);
        return p ? [{ term: p.term, meaning: p.meaning.split(/[,;/]/)[0].trim() }] : [];
      }),
      started: r ? started.has(r.id) : false,
      word: word ? { term: word.term, reading: word.reading, meaning: word.meaning.split(/[;]/)[0] } : null,
    };
  });
}
