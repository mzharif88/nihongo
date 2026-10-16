import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Kanji readings the way the JLPT and textbooks treat them, measured on the
// app's own N5–N2 vocabulary. Every word with kanji is split into per-kanji
// readings (allowing sound changes: 学校 がっこう, 人々 ひとびと), which gives
// each kanji:
//   - a key reading: the one its words use most, lower levels weighing more
//     and the kanji's own word counting double, unless pinned by hand
//     (content/kanji-readings/pins.json);
//   - its kun readings with the okurigana marked, as dictionaries write them
//     (上 → あ(げる));
//   - example words showing which reading each uses, the first of which the
//     reading quiz asks about ("How is 上手 read?"), with JLPT-style
//     misreadings as wrong options (another reading of the kanji, a long or
//     short vowel, a dropped っ, voicing).

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

export interface Kanji {
  on: string[];
  kun: string[];
}

/** One piece of a word: a kanji with the kana it takes here, or kana written as is. */
export interface Segment {
  text: string;
  kana: string;
  /** Kanji only: the reading without sound changes (み, がく) and the dictionary form it comes from (みる, がく). */
  stem?: string;
  form?: string;
}

/** The word split into kanji and kana pieces that spell its reading, or null if it can't be split. */
export function segmentWord(term: string, reading: string, kanji: Map<string, Kanji>): Segment[] | null {
  const chars = [...term];
  const walk = (i: number, pos: number, prev: string | null): Segment[] | null => {
    if (i === chars.length) return pos === reading.length ? [] : null;
    const c = chars[i] === "々" && prev ? prev : chars[i];
    if (!isKanji(c)) {
      const k = toHira(chars[i]);
      if (!reading.startsWith(k, pos)) return null;
      const rest = walk(i + 1, pos + k.length, null);
      return rest && [{ text: chars[i], kana: k }, ...rest];
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
    for (const [text, stem, form] of options) {
      if (!reading.startsWith(text, pos)) continue;
      const rest = walk(i + 1, pos + text.length, c);
      if (rest) return [{ text: chars[i], kana: text, stem, form }, ...rest];
    }
    return null;
  };
  return walk(0, 0, null);
}

/** For each kanji in the word: [its reading here without sound changes, the dictionary form]. */
export function splitWord(term: string, reading: string, kanji: Map<string, Kanji>): Map<string, [string, string]> | null {
  const segments = segmentWord(term, reading, kanji);
  if (!segments) return null;
  const out = new Map<string, [string, string]>();
  for (const s of segments) if (s.stem && s.form && isKanji(s.text) && !out.has(s.text)) out.set(s.text, [s.stem, s.form]);
  return out;
}

const WEIGHT: Record<string, number> = { N5: 4, N4: 3, N3: 2, N2: 1 };
const LEVEL_RANK: Record<string, number> = { preN5: 0, N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
/** The kanji's own word (上 うえ, 火 ひ, 使う つかう) is usually the first reading learners meet: it counts double. */
const ALONE = 2;
const alone = (term: string, k: string) => term.startsWith(k) && [...term.slice(k.length)].every((c) => !isKanji(c));

export interface Word {
  term: string;
  reading: string;
  level: string;
  meaning?: string;
}

type Scores = Map<string, Map<string, { total: number; forms: Map<string, number> }>>;

/** Score each reading as used in words (見る, 見せる, 見本 all use み), keeping its dictionary forms (みる). */
function scoreReadings(kanji: Map<string, Kanji>, words: Word[]): Scores {
  const score: Scores = new Map();
  for (const w of words) {
    const split = splitWord(w.term, w.reading, kanji);
    if (!split) continue;
    for (const [k, [stem, form]] of split) {
      const weight = (WEIGHT[w.level] ?? 1) * (alone(w.term, k) ? ALONE : 1);
      const byStem = score.get(k) ?? new Map();
      const entry = byStem.get(stem) ?? { total: 0, forms: new Map<string, number>() };
      entry.total += weight;
      entry.forms.set(form, (entry.forms.get(form) ?? 0) + weight);
      byStem.set(stem, entry);
      score.set(k, byStem);
    }
  }
  return score;
}

/** The most common reading of each kanji across `words`, or the first on reading when no word uses it. */
export function commonReadings(kanji: Map<string, Kanji>, words: Word[], pins: Record<string, string> = {}): Map<string, string> {
  const score = scoreReadings(kanji, words);
  const out = new Map<string, string>();
  for (const [k, info] of kanji) {
    const byStem = score.get(k);
    const top = byStem ? [...byStem.values()].sort((a, b) => b.total - a.total)[0] : null;
    const best = pins[k] ?? (top ? [...top.forms].sort((a, b) => b[1] - a[1])[0][0] : (info.on[0] ?? info.kun[0]));
    if (best) out.set(k, best);
  }
  return out;
}

/**
 * Kun readings with the okurigana marked where the words show it:
 * あげる → あ(げる), うえ → うえ. Readings no word uses stay unmarked.
 */
export function markedKun(k: string, info: Kanji, words: Word[], kanji: Map<string, Kanji>): string[] {
  const stems = new Map<string, Set<string>>();
  for (const w of words) {
    if (!w.term.includes(k)) continue;
    for (const s of segmentWord(w.term, w.reading, kanji) ?? []) {
      if (s.text !== k || !s.form || !s.stem || !info.kun.includes(s.form)) continue;
      stems.set(s.form, (stems.get(s.form) ?? new Set()).add(s.stem));
    }
  }
  return [...new Set(info.kun)].map((kun) => {
    // The longest stem seen that leaves okurigana: あげる seen as あ → あ(げる).
    const stem = [...(stems.get(kun) ?? [])].filter((s) => kun.startsWith(s) && s.length < kun.length).sort((a, b) => b.length - a.length)[0];
    return stem ? `${stem}(${kun.slice(stem.length)})` : kun;
  });
}

/** Kana by consonant, for vowel slips (み → ま/む/め/も). */
const ROWS = ["かきくけこ", "がぎぐげご", "さしすせそ", "ざじずぜぞ", "たちつてと", "だぢづでど", "なにぬねの", "はひふへほ", "ばびぶべぼ", "ぱぴぷぺぽ", "まみむめも", "やゆよ", "らりるれろ", "わを"].map((r) => [...r]);

const LONG: [RegExp, string][] = [
  [/([きしちにひみりぎじびぴ][ょゅ])う/g, "$1"],
  [/([きしちにひみりぎじびぴ][ょゅ])(?!う)/g, "$1う"],
  [/([こそとのほもよろごぞどぼぽ])う/g, "$1"],
  [/([こそとのほもよろごぞどぼぽ])(?![うっ])/g, "$1う"],
  [/えい/g, "え"],
];

/**
 * Wrong but plausible readings of a word, as the JLPT writes its distractors:
 * the kanji read another way, a long vowel shortened or lengthened, a small
 * っ dropped or added, a voiced sound made plain or the reverse.
 */
export function misreadings(segments: Segment[], target: string, info: Kanji, used: ReadonlySet<string> = new Set()): string[] {
  const reading = segments.map((s) => s.kana).join("");
  const out = new Set<string>();
  const at = segments.findIndex((s) => s.text === target);
  // 1. Another reading of the target kanji, of the same kind: before okurigana
  //    (見る) only other kun stems; in a compound (意見) on readings and plain kun.
  //    Readings no N5–N2 word uses (上 しゃん) are left out.
  if (at >= 0) {
    const seg = segments[at];
    const withOkurigana = !info.on.includes(seg.form ?? "") && at + 1 < segments.length && !segments[at + 1].stem;
    const kunStems = info.kun.map((k) => (/[うくぐすつぬぶむるい]$/.test(k) && k.length > 1 ? k.slice(0, -1) : k));
    const pool = withOkurigana ? kunStems : [...info.on, ...info.kun.filter((k) => !/[うくぐすつぬぶむる]$/.test(k))];
    const others = [...new Set(pool)].filter((r) => used.size === 0 || used.has(r));
    for (const r of others) {
      if (!r || r === segments[at].stem || r === segments[at].kana) continue;
      out.add(segments.map((s, i) => (i === at ? r : s.kana)).join(""));
    }
  }
  // 2. Long vowels: じょうず ⇄ じょず, こうこう ⇄ ここう.
  for (const [re, to] of LONG) {
    const matches = [...reading.matchAll(new RegExp(re.source, "g"))];
    for (const m of matches.slice(0, 2)) out.add(reading.slice(0, m.index) + m[0].replace(new RegExp(re.source), to) + reading.slice(m.index! + m[0].length));
  }
  // 3. Small っ: がっこう → がこう; いけん → いっけん.
  out.add(reading.replace("っ", ""));
  for (let i = 1; i < reading.length; i++) {
    if (/[かきくけこさしすせそたちつてとぱぴぷぺぽ]/.test(reading[i]) && reading[i - 1] !== "っ" && !/[ゃゅょっん]/.test(reading[i - 1])) {
      out.add(reading.slice(0, i) + "っ" + reading.slice(i));
      break;
    }
  }
  // 4. Voicing on the target kanji's sound: がっこう ⇄ かっこう.
  if (at >= 0) {
    const kana = segments[at].kana;
    const plain = Object.entries(VOICED).find(([, v]) => v.includes(kana[0]))?.[0];
    const swapped = plain ? plain + kana.slice(1) : VOICED[kana[0]]?.[0] ? VOICED[kana[0]][0] + kana.slice(1) : null;
    if (swapped) out.add(segments.map((s, i) => (i === at ? swapped : s.kana)).join(""));
  }
  // 5. A vowel slip on the target kanji's first sound: みる → める, たべる → てべる.
  if (at >= 0) {
    const kana = segments[at].kana;
    const row = ROWS.find((r) => r.includes(kana[0]));
    // Two at most: the neighbouring vowels (み → む, め), not the whole row.
    const i = row?.indexOf(kana[0]) ?? -1;
    for (const v of row ? [row[i + 1], row[i - 1]] : []) if (v) out.add(segments.map((s, j) => (j === at ? v + kana.slice(1) : s.kana)).join(""));
  }
  // 6. Voicing on another kanji in the word: 大学 だいがく → たいがく.
  segments.forEach((s, i) => {
    if (i === at || !s.stem) return;
    const plain = Object.entries(VOICED).find(([, v]) => v.includes(s.kana[0]))?.[0];
    const swapped = plain ? plain + s.kana.slice(1) : VOICED[s.kana[0]] ? VOICED[s.kana[0]][0] + s.kana.slice(1) : null;
    if (swapped) out.add(segments.map((x, j) => (j === i ? swapped : x.kana)).join(""));
  });
  out.delete(reading);
  return [...out].filter((r) => /^[ぁ-ゖー]+$/.test(r) && r.length >= 2);
}

export interface KanjiExample {
  term: string;
  reading: string;
  meaning: string;
  level: string;
  /** The kanji's reading in this word (its dictionary form, e.g. じょう, あげる). */
  uses: string;
  /** JLPT-style wrong readings for the reading quiz. */
  misreadings: string[];
}

/**
 * Up to three words that show how the kanji is read: the commonest reading
 * first, each from a different reading where possible, easiest level first.
 * The first is the one the reading quiz asks about.
 */
export function examplesFor(k: string, kanjiLevel: string, kanji: Map<string, Kanji>, words: Word[], scores: Scores): KanjiExample[] {
  const info = kanji.get(k)!;
  const formScore = new Map<string, number>();
  for (const e of score(scores, k)) for (const [form, n] of e.forms) formScore.set(form, (formScore.get(form) ?? 0) + n);
  const usable = words
    .filter((w) => w.term.includes(k) && w.meaning)
    .flatMap((w) => {
      const seg = segmentWord(w.term, w.reading, kanji);
      const s = seg?.find((x) => x.text === k);
      return seg && s?.form ? [{ w, seg, form: s.form }] : [];
    })
    // Readable at the kanji's level first, then the most-used reading, easier and shorter words.
    .sort(
      (a, b) =>
        Number((LEVEL_RANK[a.w.level] ?? 9) > (LEVEL_RANK[kanjiLevel] ?? 9)) - Number((LEVEL_RANK[b.w.level] ?? 9) > (LEVEL_RANK[kanjiLevel] ?? 9)) ||
        (formScore.get(b.form) ?? 0) - (formScore.get(a.form) ?? 0) ||
        (LEVEL_RANK[a.w.level] ?? 9) - (LEVEL_RANK[b.w.level] ?? 9) ||
        a.w.term.length - b.w.term.length ||
        a.w.term.localeCompare(b.w.term),
    );
  const picked: typeof usable = [];
  const fresh = (u: (typeof usable)[number]) => !picked.some((p) => p.w.term === u.w.term);
  for (const u of usable) if (picked.length < 3 && fresh(u) && !picked.some((p) => p.form === u.form)) picked.push(u);
  for (const u of usable) if (picked.length < 3 && fresh(u)) picked.push(u);
  return picked.map(({ w, seg, form }) => ({
    term: w.term,
    reading: w.reading,
    meaning: w.meaning!.split(/[;,]/).slice(0, 2).join(",").trim(),
    level: w.level,
    uses: form,
    misreadings: misreadings(seg, k, info, new Set(scores.get(k)?.keys() ?? [])).slice(0, 6),
  }));
}

const score = (scores: Scores, k: string) => [...(scores.get(k)?.values() ?? [])];

function main() {
  const root = join(process.cwd(), "content");
  const pins = (JSON.parse(readFileSync(join(root, "kanji-readings", "pins.json"), "utf8")) as { pins: Record<string, string> }).pins;
  const files: { file: string; doc: { kind: string; records: Record<string, unknown>[] }; indent: number }[] = [];
  const merged = new Map<string, Record<string, unknown>>();
  for (const dir of ["legacy", "opendata"]) {
    for (const f of readdirSync(join(root, dir)).filter((f) => f.endsWith(".json") && !f.endsWith(".source.json"))) {
      const file = join(root, dir, f);
      const text = readFileSync(file, "utf8");
      const doc = JSON.parse(text);
      if (doc.kind !== "items") continue;
      files.push({ file, doc, indent: text.startsWith("{\n  ") ? 2 : 1 });
      for (const r of doc.records) merged.set(r.slug as string, { ...(merged.get(r.slug as string) ?? {}), ...r });
    }
  }
  const kanji = new Map<string, Kanji>();
  const kanjiLevel = new Map<string, string>();
  for (const r of merged.values()) {
    const data = r.data as { on?: string[]; kun?: string[] } | undefined;
    if (r.type !== "kanji" || !data) continue;
    kanji.set(r.term as string, { on: (data.on ?? []).map(toHira), kun: (data.kun ?? []).map(toHira) });
    kanjiLevel.set(r.term as string, r.jlpt_level as string);
  }
  const words: Word[] = [...merged.values()]
    .filter((r) => r.type === "word" && typeof r.reading === "string" && [...(r.term as string)].some(isKanji))
    .map((r) => ({ term: firstForm(r.term as string), reading: firstForm(r.reading as string), level: r.jlpt_level as string, meaning: r.meaning as string }));
  const common = commonReadings(kanji, words, pins);
  const scores = scoreReadings(kanji, words);
  const extra = new Map<string, { kun_marked: string[]; examples: KanjiExample[] }>();
  for (const [k, info] of kanji) {
    extra.set(k, { kun_marked: markedKun(k, info, words, kanji), examples: examplesFor(k, kanjiLevel.get(k) ?? "N2", kanji, words, scores) });
  }

  let changed = 0;
  for (const { file, doc, indent } of files) {
    let touched = false;
    for (const r of doc.records) {
      if (r.type !== "kanji") continue;
      const k = r.term as string;
      if ("reading" in r) {
        const best = common.get(k);
        if (best && r.reading !== best) {
          r.reading = best;
          changed++;
        }
      }
      if (r.data && extra.has(k)) r.data = { ...(r.data as object), ...extra.get(k) };
      touched = true;
    }
    if (touched) writeFileSync(file, JSON.stringify(doc, null, indent) + "\n");
  }
  const withExamples = [...extra.values()].filter((e) => e.examples.length).length;
  console.log(`${kanji.size} kanji; ${changed} key readings changed; ${withExamples} with example words`);
}

if (process.argv[1]?.endsWith("kanji-readings.ts")) main();
