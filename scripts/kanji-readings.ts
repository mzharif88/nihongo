import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Each kanji's most common reading, measured on the app's own N5–N2
// vocabulary: every word containing the kanji is split into per-kanji
// readings (allowing sound changes: 学校 がっこう, 人々 ひとびと), and the
// reading used most, weighted towards lower levels, wins. 天 → てん (天気,
// 天ぷら), not the dictionary's first-listed あまつ. It becomes the kanji's
// `reading`, which "How is this kanji read?" cards ask for.

const toHira = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const isKanji = (c: string) => /[㐀-鿿]/.test(c);
const firstForm = (s: string) => toHira(s.replace(/\s*[(（].*?[)）]\s*/g, "").split(/[;；]/)[0].replace(/[〜～\s]/g, "").trim());

/** い-row → う-row: a verb's masu stem back to its dictionary ending (もち → もつ). */
const U_ROW: Record<string, string> = { い: "う", き: "く", ぎ: "ぐ", し: "す", ち: "つ", に: "ぬ", び: "ぶ", み: "む", り: "る" };

const VOICED: Record<string, string[]> = {
  か: ["が"], き: ["ぎ"], く: ["ぐ"], け: ["げ"], こ: ["ご"], さ: ["ざ"], し: ["じ"], す: ["ず"], せ: ["ぜ"], そ: ["ぞ"],
  た: ["だ"], ち: ["ぢ", "じ"], つ: ["づ", "ず"], て: ["で"], と: ["ど"], は: ["ば", "ぱ"], ひ: ["び", "ぴ"], ふ: ["ぶ", "ぷ"], へ: ["べ", "ぺ"], ほ: ["ぼ", "ぽ"],
};

/** A reading as it can appear inside a word: as is, voiced at the start, or with a final く/つ/ち/き doubled (っ). */
function variants(r: string): string[] {
  const out = new Set([r]);
  for (const v of VOICED[r[0]] ?? []) out.add(v + r.slice(1));
  for (const x of [...out]) if (x.length > 1 && /[くつちき]$/.test(x)) out.add(x.slice(0, -1) + "っ");
  return [...out];
}

interface Kanji { on: string[]; kun: string[] }

/** The readings each kanji takes in one word, or null if the word's reading can't be split. */
/** For each kanji in the word: [the reading it takes, without sound changes (み, しょく), the dictionary form it comes from (みる)]. */
export function splitWord(term: string, reading: string, kanji: Map<string, Kanji>): Map<string, [string, string]> | null {
  const chars = [...term];
  const walk = (i: number, pos: number, prev: string | null): Map<string, [string, string]> | null => {
    if (i === chars.length) return pos === reading.length ? new Map() : null;
    const c = chars[i] === "々" && prev ? prev : chars[i];
    if (!isKanji(c)) {
      const k = toHira(chars[i]);
      return reading.startsWith(k, pos) ? walk(i + 1, pos + k.length, null) : null;
    }
    const info = kanji.get(c);
    if (!info) return null;
    // Kana written after the kanji in the word (its okurigana, if any).
    let after = "";
    for (let j = i + 1; j < chars.length && !isKanji(chars[j]) && chars[j] !== "々"; j++) after += toHira(chars[j]);
    // [text in the word, reading without sound changes, dictionary form, okurigana written exactly]
    const options: [string, string, string, boolean][] = [];
    for (const on of info.on) for (const v of variants(on)) options.push([v, on, on, true]);
    for (const kun of info.kun) {
      for (let cut = kun.length; cut >= 1; cut--) {
        const oku = kun.slice(cut);
        // The okurigana must be written after the kanji, except that a verb or
        // adjective may take other endings or none (見つける, 見舞い, 見本 みほん).
        const inflects = /[うくぐすつぬぶむるい]$/.test(kun) && kun.length - cut >= 1 && kun.length - cut <= 2;
        if (oku && !after.startsWith(oku) && !inflects) continue;
        // A bare stem listed on its own (出 で) or a verb's masu stem (持 もち) counts as the verb (でる, もつ).
        const form =
          info.kun.find((x) => x.length > kun.length && x.startsWith(kun) && /[うくぐすつぬぶむるい]$/.test(x)) ??
          info.kun.find((x) => x.length === kun.length && x.slice(0, -1) === kun.slice(0, -1) && U_ROW[kun.slice(-1)] === x.slice(-1)) ??
          kun;
        for (const v of variants(kun.slice(0, cut))) options.push([v, kun.slice(0, cut), form, !oku || after.startsWith(oku)]);
      }
    }
    options.sort((a, b) => b[0].length - a[0].length || Number(b[3]) - Number(a[3]));
    for (const [text, stem, base] of options) {
      if (!reading.startsWith(text, pos)) continue;
      const rest = walk(i + 1, pos + text.length, c);
      if (rest) {
        if (chars[i] !== "々" && !rest.has(c)) rest.set(c, [stem, base]);
        return rest;
      }
    }
    return null;
  };
  return walk(0, 0, null);
}

const WEIGHT: Record<string, number> = { N5: 4, N4: 3, N3: 2, N2: 1 };
/** The kanji's own word (上 うえ, 火 ひ, 使う つかう) is usually the first reading learners meet: it counts double. */
const ALONE = 2;
const alone = (term: string, k: string) => term.startsWith(k) && [...term.slice(k.length)].every((c) => !isKanji(c));

/** The most common reading of each kanji across `words`, or the first on reading when no word uses it. */
export function commonReadings(kanji: Map<string, Kanji>, words: { term: string; reading: string; level: string }[]): Map<string, string> {
  // Score each reading as used in words (見る, 見せる, 見本 all use み), then
  // show its commonest dictionary form (みる). Lower levels weigh more.
  const score = new Map<string, Map<string, { total: number; forms: Map<string, number> }>>();
  for (const w of words) {
    const split = splitWord(w.term, w.reading, kanji);
    if (!split) continue;
    for (const [k, [stem, form]] of split) {
      const weight = (WEIGHT[w.level] ?? 1) * (alone(w.term, k) ? ALONE : 1);
      const byStem = score.get(k) ?? new Map<string, { total: number; forms: Map<string, number> }>();
      const entry = byStem.get(stem) ?? { total: 0, forms: new Map<string, number>() };
      entry.total += weight;
      entry.forms.set(form, (entry.forms.get(form) ?? 0) + weight);
      byStem.set(stem, entry);
      score.set(k, byStem);
    }
  }
  const out = new Map<string, string>();
  for (const [k, info] of kanji) {
    const byStem = score.get(k);
    const top = byStem ? [...byStem.values()].sort((a, b) => b.total - a.total)[0] : null;
    const best = top ? [...top.forms].sort((a, b) => b[1] - a[1])[0][0] : (info.on[0] ?? info.kun[0]);
    if (best) out.set(k, best);
  }
  return out;
}

function main() {
  const root = join(process.cwd(), "content");
  const files: { file: string; doc: { kind: string; records: Record<string, unknown>[] }; indent: number }[] = [];
  const merged = new Map<string, Record<string, unknown>>();
  for (const dir of ["legacy", "opendata"]) {
    for (const f of readdirSync(join(root, dir)).filter((f) => f.endsWith(".json") && !f.endsWith(".source.json"))) {
      const file = join(root, dir, f);
      const text = readFileSync(file, "utf8");
      const doc = JSON.parse(text);
      if (doc.kind !== "items") continue;
      files.push({ file, doc, indent: text.startsWith("{\n  ") ? 2 : 1 });
      for (const r of doc.records) merged.set(r.slug, { ...(merged.get(r.slug) ?? {}), ...r });
    }
  }
  const kanji = new Map<string, Kanji>();
  for (const r of merged.values()) {
    const data = r.data as { on?: string[]; kun?: string[] } | undefined;
    if (r.type === "kanji" && data) kanji.set(r.term as string, { on: (data.on ?? []).map(toHira), kun: (data.kun ?? []).map(toHira) });
  }
  const words = [...merged.values()]
    .filter((r) => r.type === "word" && typeof r.reading === "string" && [...(r.term as string)].some(isKanji))
    .map((r) => ({ term: firstForm(r.term as string), reading: firstForm(r.reading as string), level: r.jlpt_level as string }));
  const common = commonReadings(kanji, words);

  let changed = 0;
  for (const { file, doc, indent } of files) {
    let touched = false;
    for (const r of doc.records) {
      if (r.type !== "kanji" || !("reading" in r)) continue;
      const best = common.get(r.term as string);
      if (best && r.reading !== best) {
        r.reading = best;
        touched = true;
        changed++;
      }
    }
    if (touched) writeFileSync(file, JSON.stringify(doc, null, indent) + "\n");
  }
  const split = words.filter((w) => splitWord(w.term, w.reading, kanji)).length;
  console.log(`${common.size} kanji; ${changed} readings changed; ${split}/${words.length} kanji words split into readings`);
}

if (process.argv[1]?.endsWith("kanji-readings.ts")) main();
