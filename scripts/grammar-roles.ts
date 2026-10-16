/**
 * Grammar colours: tag sentences with the role of each part, merged into
 * their furigana markup as ⟨s⟩…⟨/⟩ spans (see src/lib/furigana.ts).
 *
 *   npm run build:roles
 *
 * Run after the other build scripts; it rewrites the packs in place and is
 * safe to run again. Covers whole sentences only: example sentences,
 * sentence items, lesson dialogue, builder answers and reading passages.
 * Mocks, checks and options stay plain (colours would hint at answers).
 *
 * Roles come from kuromoji's parts of speech and the particle that ends
 * each phrase:
 *   s  phrase before が or は (subject / topic)   私は, 雨が
 *   o  phrase before を (object)                  りんごを
 *   v  verbs with their endings, and the copula   食べました, です
 *   p  particles                                  は, を, に, で, の, か
 * A phrase joined by の takes the role of the phrase it modifies (私の兄は → s).
 * Time words and adverbs (今日, 毎日, よく) stay uncoloured, and so does
 * text without kanji: kana-only text has no word breaks to tokenize by.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import kuromoji from "kuromoji";
import { hasKanji, parseMarkup, stripMarkup, stripRoles, toMarkup, type Role, type Segment } from "../src/lib/furigana";

type Token = kuromoji.IpadicFeatures;
export type TagRoles = (text: string) => string;

const CONTENT = join(process.cwd(), "content");

/** Words that start a new phrase instead of joining one: adverbs, time nouns, conjunctions. */
const isLoose = (t: Token) =>
  t.pos === "副詞" || t.pos === "接続詞" || t.pos === "感動詞" || t.pos === "フィラー" || (t.pos === "名詞" && t.pos_detail_1 === "副詞可能");

/** Conjunctive particles that belong to the verb's form. */
const VERB_ENDINGS = new Set(["て", "で", "ば", "ちゃ", "じゃ", "たり", "だり", "ながら", "つつ"]);

/** The role of each token. */
export function tokenRoles(tokens: Token[]): (Role | null)[] {
  const roles: (Role | null)[] = tokens.map(() => null);

  // Verbs, their endings and particles.
  tokens.forEach((t, i) => {
    const prev = tokens[i - 1];
    const prevRole = roles[i - 1];
    if (t.pos === "動詞") roles[i] = "v";
    else if (t.pos === "名詞" && t.pos_detail_1 === "サ変接続" && tokens[i + 1]?.pos === "動詞" && tokens[i + 1].basic_form === "する")
      roles[i] = "v"; // 勉強 + します
    else if (t.pos === "助動詞" && t.surface_form === "な" && t.basic_form === "だ") roles[i] = null; // 上手な人: な links a な-adjective
    else if (t.pos === "助動詞")
      // ます, た, ない after a verb; です/だ after a noun. An adjective keeps its own endings (高かった).
      roles[i] = prevRole === "v" || prev?.pos !== "形容詞" || t.basic_form === "です" ? "v" : null;
    // て/で/ば/たり/ながら are part of the verb form (食べて); ので, から, けど link clauses, so they're particles.
    else if (t.pos === "助詞") roles[i] = t.pos_detail_1 === "接続助詞" && prevRole === "v" && VERB_ENDINGS.has(t.surface_form) ? "v" : "p";
  });

  // Phrases: runs of content words, coloured by the particle after them.
  let phrase: number[] = [];
  let pending: number[] = []; // phrases joined by の, waiting for the head
  const settle = (role: Role | null) => {
    for (const i of [...pending, ...phrase]) roles[i] = role;
    phrase = [];
    pending = [];
  };
  tokens.forEach((t, i) => {
    if (roles[i] === null && t.pos !== "記号" && !isLoose(t)) {
      phrase.push(i);
      return;
    }
    if (!phrase.length) {
      if (roles[i] !== "p" || t.pos_detail_1 !== "連体化") settle(null);
      return;
    }
    if (roles[i] === "p") {
      if (t.pos_detail_1 === "連体化") {
        // 私の → wait for the noun it belongs to.
        pending.push(...phrase);
        phrase = [];
        return;
      }
      const isSubject = (t.surface_form === "が" && t.pos_detail_1 === "格助詞") || (t.surface_form === "は" && t.pos_detail_1 === "係助詞");
      const isObject = t.surface_form === "を" && t.pos_detail_1 === "格助詞";
      settle(isSubject ? "s" : isObject ? "o" : null);
      return;
    }
    settle(null);
  });
  settle(null);
  return roles;
}

/** Content words, whose dictionary form must be a known word for kana-only text to be trusted. */
const CONTENT_POS = new Set(["名詞", "動詞", "形容詞", "副詞", "連体詞", "感動詞", "フィラー", "接頭詞"]);

/**
 * `knownKana` holds vocabulary written or read in kana (たべる, ねこ, これ).
 * Kana-only text is tagged only when every content word the tokenizer finds
 * is one of them: がっこう split as がっ + こう fails that check and stays plain.
 */
/**
 * Can we trust the tokenizer on kana-only text? Every content word must be a
 * known word (verbs and adjectives by dictionary form), and no run of
 * neighbouring tokens may spell a longer known word: がっ + こう = がっこう
 * means the word was split, so the tags would be wrong.
 */
/** Verbs safe to colour when written in kana. */
const PLAIN_VERBS = new Set(["ある", "いる", "する", "なる", "くださる", "できる"]);

/** A content word the word lists know (verbs and adjectives by dictionary form). */
const isKnown = (t: Token, knownKana: Set<string>) =>
  hasKanji(t.surface_form) || (t.pos === "動詞" || t.pos === "形容詞" ? knownKana.has(t.basic_form) : knownKana.has(t.surface_form) || knownKana.has(t.basic_form));

export function trustKana(tokens: Token[], knownKana: Set<string>, mixed = false): boolean {
  for (const t of tokens) {
    // Words written with kanji are split reliably; the doubt is over words written in kana.
    if (hasKanji(t.surface_form) || !t.surface_form.trim()) continue;
    if (t.word_type === "UNKNOWN") return false;
    // In text with kanji, only a split word (below) gives the tokenizer away; unlisted kana words are fine.
    if (mixed || !CONTENT_POS.has(t.pos)) continue;
    if (!isKnown(t, knownKana)) return false;
  }
  for (let i = 0; i < tokens.length; i++) {
    for (let n = 2; n <= 4 && i + n <= tokens.length; n++) {
      const span = tokens.slice(i, i + n);
      if (!span.some((t) => CONTENT_POS.has(t.pos)) || span.some((t) => t.pos === "記号" || hasKanji(t.surface_form))) continue;
      const joined = span.map((t) => t.surface_form).join("");
      // (Not in text with kanji: there a join that spells a word is mostly a set phrase in parts, ありがとう+ござい+ます.)
      if (!mixed && knownKana.has(joined)) return false;
    }
  }
  return true;
}

export async function createRoleTagger(knownKana: Set<string> = new Set()): Promise<TagRoles> {
  const tokenizer = await new Promise<kuromoji.Tokenizer<Token>>((resolve, reject) =>
    kuromoji
      .builder({ dicPath: join(process.cwd(), "node_modules", "kuromoji", "dict") })
      .build((err, t) => (err ? reject(err) : resolve(t))),
  );

  /**
   * Text or furigana markup → the same markup with role spans. A furigana
   * segment takes the role of its first character; plain text splits where
   * the role changes. Text with no verb or particle is returned unchanged.
   */
  return (text: string) => {
    const markup = stripRoles(text);
    const plain = stripMarkup(markup);
    // Word examples with a romaji gloss ("うみ (umi)") are words, not sentences. Kana-only text has no
    // word boundaries to go on, so it's tagged only when every word the tokenizer found is a known word.
    if (/\([A-Za-z]/.test(plain)) return markup;
    const tokens = tokenizer.tokenize(plain);
    // The same goes for the kana words in mixed text (れいぞうこ beside 中, written in kana at N5).
    // Text spaced the JLPT way (N5 papers: 「れいぞうこに ケーキが あります」) is mostly kana words, so it's
    // checked as strictly as kana-only text; other text with kanji only for words the tokenizer doesn't know.
    const spaced = /\s/.test(plain);
    if (!trustKana(tokens, knownKana, hasKanji(plain) && !spaced)) return markup;
    // In spaced text a verb in kana is often a noun misread (みせ 店 as 見せる, よる 夜 as 寄る): only the unmistakable ones pass.
    if (spaced && hasKanji(plain) && tokens.some((t) => t.pos === "動詞" && !hasKanji(t.surface_form) && !PLAIN_VERBS.has(t.basic_form))) return markup;
    const roles = tokenRoles(tokens);
    if (tokens.length < 3 || !roles.some((r) => r === "v" || r === "p")) return markup;
    // Kana-only text also needs a verb or です: number words and bare phrases are too easy to mis-split.
    if (!hasKanji(plain) && !roles.includes("v")) return markup;

    const byChar: (Role | null)[] = [];
    tokens.forEach((t, i) => byChar.push(...[...t.surface_form].map(() => roles[i])));
    if (byChar.length !== [...plain].length) return markup; // tokenizer dropped something; leave it plain

    const out: Segment[] = [];
    let at = 0;
    for (const seg of parseMarkup(markup)) {
      const chars = [...seg.text];
      if (seg.ruby) {
        const role = byChar[at] ?? undefined;
        out.push(role ? { ...seg, role } : { text: seg.text, ruby: seg.ruby });
      } else {
        chars.forEach((c, k) => {
          const role = byChar[at + k] ?? undefined;
          const last = out[out.length - 1];
          if (last && !last.ruby && last.role === role) last.text += c;
          else out.push(role ? { text: c, role } : { text: c });
        });
      }
      at += chars.length;
    }
    return toMarkup(out);
  };
}

type Example = { jp: string; en: string; reading?: string };
type Rec = Record<string, unknown>;

/** A sentence's reading with roles; kana-only sentences gain a reading so their colours have somewhere to live. */
let addFurigana: ((text: string) => string | undefined) | null = null;

function withRoles(tag: TagRoles, jp: string, reading: string | undefined): string | undefined {
  // A sentence with kanji but no readings (old content) gets furigana first.
  if (hasKanji(jp) && addFurigana && !/\[[^\]|]+\|[^\]]+\]/.test(reading ?? "")) reading = addFurigana(jp) ?? reading;
  const tagged = tag(reading ?? jp);
  return tagged === stripRoles(reading ?? jp) && !reading ? undefined : tagged;
}

function tagExamples(tag: TagRoles, examples: unknown): Example[] | undefined {
  if (!Array.isArray(examples)) return undefined;
  return (examples as Example[]).map((e) => {
    const reading = withRoles(tag, e.jp, e.reading);
    return reading ? { ...e, reading } : e;
  });
}

/** Add roles to every sentence in one import pack. */
export function tagPack(tag: TagRoles, doc: { kind: string; records: Rec[] }): { kind: string; records: Rec[] } {
  const records = doc.records.map((r) => {
    switch (doc.kind) {
      case "items": {
        const examples = tagExamples(tag, r.examples);
        const sentence =
          r.type === "sentence" ? withRoles(tag, r.term as string, (r.reading as string | undefined) ?? undefined) : undefined;
        return { ...r, ...(examples ? { examples } : {}), ...(sentence ? { reading: sentence } : {}) };
      }
      case "lessons":
        return {
          ...r,
          dialogue: (r.dialogue as Example[]).map((l) => {
            const reading = withRoles(tag, l.jp, l.reading);
            return reading ? { ...l, reading } : l;
          }),
        };
      case "sentence_patterns": {
        const examples = tagExamples(tag, r.examples);
        return examples ? { ...r, examples } : r;
      }
      case "texts":
        return { ...r, body: (r.body as string).split("\n").map((line) => (line ? tag(line) : line)).join("\n") };
      default:
        return r;
    }
  });
  return { ...doc, records };
}

/** Pack files that hold sentences. */
const PACK_DIRS = ["legacy", "opendata", "grammar", "lessons", "builder", "reading"];

/** Kana spellings and readings of every word in the packs, for trusting kana-only sentences. */
function knownKanaWords(): Set<string> {
  const out = new Set<string>();
  for (const dir of ["legacy", "opendata"]) {
    for (const file of readdirSync(join(CONTENT, dir)).filter((f) => f.endsWith(".json"))) {
      const doc = JSON.parse(readFileSync(join(CONTENT, dir, file), "utf8"));
      if (doc.kind !== "items") continue;
      for (const r of doc.records as { type?: string; term?: string; reading?: string }[]) {
        if (r.type !== "word" || !r.term) continue;
        if (!hasKanji(r.term)) out.add(r.term.replace(/[〜～]/g, ""));
        if (r.reading && !r.reading.includes("[")) for (const part of r.reading.split(/[;；、,]/)) out.add(part.replace(/\s*\(.*?\)\s*|[〜～]/g, "").trim());
      }
    }
  }
  return out;
}

async function main() {
  const tag = await createRoleTagger(knownKanaWords());
  const { teachingAnnotator } = await import("./build-lessons");
  addFurigana = await teachingAnnotator();
  for (const dir of PACK_DIRS) {
    for (const file of readdirSync(join(CONTENT, dir)).filter((f) => f.endsWith(".json") && !f.endsWith(".source.json"))) {
      const path = join(CONTENT, dir, file);
      const doc = JSON.parse(readFileSync(path, "utf8"));
      if (!["items", "lessons", "sentence_patterns", "texts"].includes(doc.kind)) continue;
      const before = JSON.stringify(doc);
      const out = tagPack(tag, doc);
      if (JSON.stringify(out) === before) continue;
      // Keep each pack's own formatting (indent 1 for built packs, 2 for legacy).
      const indent = readFileSync(path, "utf8").startsWith("{\n  ") ? 2 : 1;
      writeFileSync(path, JSON.stringify(out, null, indent) + "\n");
      console.log(`${dir}/${file}: grammar colours added`);
    }
  }
}

if (process.argv[1]?.endsWith("grammar-roles.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
