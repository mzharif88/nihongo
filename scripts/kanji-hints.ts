import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Memory hints built only from kanji parts, no English sound-alikes:
//   kanji 男            → "田 field + 力 power"
//   word 学生           → "学 study + 生 life"
//   word 食べる (1 kanji) → "食 eat: 𠆢 person + 艮 stopping"
// Parts come from KRADFILE (content/kanji-parts); each part is glossed with
// its kanji meaning from our packs, or a radical name for radical forms.

const KANJI = /[㐀-鿿]/;

/** Single strokes KRADFILE lists as parts; they add noise, not meaning. */
const STROKES = new Set(["｜", "ノ", "丶", "亅", "乙", "一", "マ"]);

/** Names for radical forms and parts that aren't kanji in our packs. */
export const RADICAL_NAMES: Record<string, string> = {
  ハ: "eight", 亠: "lid", 并: "horns", 氵: "water", "⺅": "person", 又: "hand", 幺: "thread", 儿: "legs",
  扌: "hand", 厶: "private", "𠆢": "person", "⺾": "grass", 宀: "roof", 冂: "frame", 冖: "cover", 勹: "wrap",
  辶: "road", 尸: "body", 厂: "cliff", 匕: "spoon", 夂: "walk", 寸: "inch", 刂: "knife", 禾: "grain",
  攵: "strike", 广: "shelter", 巾: "cloth", 戈: "halberd", "⺌": "small", ヨ: "hand", 隹: "bird", 卩: "seal",
  彳: "step", 灬: "fire", 冫: "ice", 几: "table", 卜: "divination", 忄: "heart", 刀: "sword", "⻖": "hill",
  士: "samurai", 羊: "sheep", 廾: "two hands", 斤: "axe", 爪: "claw", 艮: "stopping", 囗: "enclosure",
  頁: "head", 里: "village", 已: "snake", 罒: "net", "⺹": "old", 矢: "arrow", 弓: "bow", 殳: "weapon",
  彡: "hair", 凵: "container", 豕: "pig", 犭: "dog", 礻: "altar", 豆: "bean", 匚: "box", 爿: "bed",
  酉: "wine jar", 井: "well", "⻏": "village", 疒: "sickness", 疋: "foot", 癶: "footsteps", 至: "arrive",
  衤: "clothes", 毋: "mother", 勿: "not", 氏: "clan", 弋: "stake", 歹: "death", 穴: "hole", 舌: "tongue",
  聿: "brush", 虍: "tiger", 廴: "stride", 尢: "lame", 麻: "hemp", 矛: "spear", 辰: "dragon", 乃: "from",
  隶: "reach", 也: "also", 耒: "plow", 斗: "dipper", 釆: "sort", 牙: "fang", 鬼: "ghost", 及: "reach",
  韋: "leather", 舛: "opposite", 禸: "track", 免: "excuse", 巛: "river", 臼: "mortar", 斉: "even",
  鹿: "deer", 而: "and", 尤: "reasonable", 玄: "dark", 气: "steam", 瓜: "melon", 身: "body",
  無: "nothing", 鬲: "tripod", 屮: "sprout", 屯: "camp", 巴: "snake", 鹵: "salt", 瓦: "tile",
  髟: "long hair", 彑: "snout", 亀: "turtle", 竜: "dragon", 岡: "hill",
};

export interface HintData {
  parts: Map<string, string[]>;
  /** Short English gloss per kanji. */
  gloss: Map<string, string>;
}

/** First sense of a meaning list: "power, strength, strong" → "power". */
export function firstGloss(meaning: string): string {
  return meaning.split(/[,;/]/)[0].replace(/\(.*?\)/g, "").trim().toLowerCase();
}

/**
 * The kanji's parts, largest first: KRADFILE lists every atomic radical, so a
 * part that is itself built from other listed parts absorbs them
 * (新: 辛 + 木 + 斤, not 十 + 立 + 亠 + 并 + …).
 */
export function partsOf(kanji: string, data: HintData): string[] {
  const listed = [...new Set((data.parts.get(kanji) ?? []).filter((p) => p !== kanji))];
  const absorbed = new Set<string>();
  const absorb = (part: string, seen: Set<string>) => {
    for (const sub of data.parts.get(part) ?? []) {
      if (sub === part || seen.has(sub)) continue;
      seen.add(sub);
      absorbed.add(sub);
      absorb(sub, seen);
    }
  };
  for (const part of listed) absorb(part, new Set([part]));
  return listed.filter((p) => !absorbed.has(p) && !STROKES.has(p));
}

function glossPart(part: string, data: HintData): string {
  const name = data.gloss.get(part) ?? RADICAL_NAMES[part];
  return name ? `${part} ${name}` : part;
}

/** "田 field + 力 power", or null for a kanji that is itself a basic part. */
export function kanjiHint(kanji: string, data: HintData): string | null {
  const parts = partsOf(kanji, data);
  return parts.length ? parts.map((p) => glossPart(p, data)).join(" + ") : null;
}

/** Hint for a word: its kanji and their meanings; one kanji shows that kanji's parts. */
export function wordHint(term: string, data: HintData): string | null {
  const kanji = [...new Set([...term].filter((c) => KANJI.test(c)))];
  if (kanji.length === 0) return null;
  if (kanji.length === 1) {
    const k = kanji[0];
    const gloss = data.gloss.get(k);
    const parts = kanjiHint(k, data);
    if (!gloss) return parts ? `${k}: ${parts}` : null;
    return parts ? `${k} ${gloss}: ${parts}` : `${k} ${gloss}`;
  }
  return kanji.map((k) => glossPart(k, data)).join(" + ");
}

/** A hint that leans on English sound-alikes ("she, Roy"…) rather than shape or parts. */
export const isSoundAlike = (text: string) => /"[^"]+"/.test(text);

type Item = Record<string, unknown> & { slug: string; type: string; term: string; mnemonic?: unknown };

/**
 * Replace word and kanji hints with parts-only hints. Kanji with no parts keep
 * a shape hint if they have one; kana-only words lose theirs (there are no
 * parts to learn); other item types are untouched.
 */
export function applyKanjiHints<T extends Item>(records: T[], data: HintData): T[] {
  return records.map((r) => {
    if (r.type !== "kanji" && r.type !== "word") return r;
    const hint = r.type === "kanji" ? kanjiHint(r.term, data) : wordHint(r.term, data);
    const keep = r.type === "kanji" && typeof r.mnemonic === "string" && !isSoundAlike(r.mnemonic) ? r.mnemonic : undefined;
    const mnemonic = hint ?? keep;
    const out: Record<string, unknown> = { ...r };
    if (mnemonic) out.mnemonic = mnemonic;
    else delete out.mnemonic;
    return out as T;
  });
}

/** Parts from the vendored KRADFILE plus kanji glosses from every item pack on disk. */
export function loadHintData(extra: Item[] = []): HintData {
  const root = join(process.cwd(), "content");
  const krad = JSON.parse(readFileSync(join(root, "kanji-parts", "kradfile.json"), "utf8")) as { parts: Record<string, string[]> };
  const gloss = new Map<string, string>();
  const add = (r: Item) => {
    if (r.type === "kanji" && typeof r.meaning === "string" && !gloss.has(r.term)) gloss.set(r.term, firstGloss(r.meaning));
  };
  extra.forEach(add);
  for (const dir of ["opendata", "legacy", "grammar"]) {
    const d = join(root, dir);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((f) => f.endsWith(".json"))) {
      const doc = JSON.parse(readFileSync(join(d, f), "utf8"));
      if (doc.kind === "items") (doc.records as Item[]).forEach(add);
    }
  }
  return { parts: new Map(Object.entries(krad.parts)), gloss };
}
