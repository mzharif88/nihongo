import { isKana, toRomaji } from "wanakana";

/**
 * Reduce a romaji or kana answer to a spelling-insensitive key, so
 * "konnichiwa", "konnichiha", "こんにちは" and "コンニチハ" all match, and
 * long vowels written as ō / ou / oo compare equal.
 */
export function answerKey(text: string): string {
  return toRomaji(text.normalize("NFKC"))
    .toLowerCase()
    .replace(/[āâ]/g, "a")
    .replace(/[īî]/g, "i")
    .replace(/[ūû]/g, "u")
    .replace(/[ēê]/g, "e")
    .replace(/[ōô]/g, "o")
    .replace(/[^a-z]/g, "")
    .replace(/wa/g, "ha") // particle は is read "wa"
    .replace(/wo/g, "o") // particle を
    .replace(/ou|oo/g, "o")
    .replace(/uu/g, "u")
    .replace(/aa/g, "a")
    .replace(/ee|ei/g, "e")
    .replace(/n'/g, "n");
}

export interface TypedTarget {
  term: string;
  reading?: string | null;
  romaji?: string | null;
}

/** Every spelling we accept for a typed reading: the romaji alternatives ("nichi/hi"), the kana reading, and kana terms. */
export function acceptedKeys(target: TypedTarget): string[] {
  const forms = [
    ...(target.romaji ?? "").split(/[/,;]| or /),
    target.reading ?? "",
    isKana(target.term.replace(/[。、！？!?\s〜~ー]/g, "")) ? target.term : "",
  ];
  return [...new Set(forms.map(answerKey).filter(Boolean))];
}

export function isTypedAnswerCorrect(input: string, target: TypedTarget): boolean {
  const key = answerKey(input);
  return key.length > 0 && acceptedKeys(target).includes(key);
}
