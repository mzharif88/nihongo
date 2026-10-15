"use client";

import Link from "next/link";
import { useState } from "react";
import { speak } from "@/app/study/speak";

// Hiragana and katakana charts to study without cards: tap a kana to hear it,
// hide the romaji to test yourself. Rows follow the gojūon order (a i u e o).

type Cell = [string, string] | null;

const H = (s: string, r: string): Cell[] => {
  const kana = [...s];
  const romaji = r.split(" ");
  return kana.map((k, i) => (k === "・" ? null : [k, romaji[i]]));
};

const BASIC: Record<"hiragana" | "katakana", Cell[][]> = {
  hiragana: [
    H("あいうえお", "a i u e o"),
    H("かきくけこ", "ka ki ku ke ko"),
    H("さしすせそ", "sa shi su se so"),
    H("たちつてと", "ta chi tsu te to"),
    H("なにぬねの", "na ni nu ne no"),
    H("はひふへほ", "ha hi fu he ho"),
    H("まみむめも", "ma mi mu me mo"),
    H("や・ゆ・よ", "ya - yu - yo"),
    H("らりるれろ", "ra ri ru re ro"),
    H("わ・・・を", "wa - - - wo"),
    H("ん・・・・", "n - - - -"),
  ],
  katakana: [
    H("アイウエオ", "a i u e o"),
    H("カキクケコ", "ka ki ku ke ko"),
    H("サシスセソ", "sa shi su se so"),
    H("タチツテト", "ta chi tsu te to"),
    H("ナニヌネノ", "na ni nu ne no"),
    H("ハヒフヘホ", "ha hi fu he ho"),
    H("マミムメモ", "ma mi mu me mo"),
    H("ヤ・ユ・ヨ", "ya - yu - yo"),
    H("ラリルレロ", "ra ri ru re ro"),
    H("ワ・・・ヲ", "wa - - - wo"),
    H("ン・・・・", "n - - - -"),
  ],
};

const VOICED: Record<"hiragana" | "katakana", Cell[][]> = {
  hiragana: [
    H("がぎぐげご", "ga gi gu ge go"),
    H("ざじずぜぞ", "za ji zu ze zo"),
    H("だぢづでど", "da ji zu de do"),
    H("ばびぶべぼ", "ba bi bu be bo"),
    H("ぱぴぷぺぽ", "pa pi pu pe po"),
  ],
  katakana: [
    H("ガギグゲゴ", "ga gi gu ge go"),
    H("ザジズゼゾ", "za ji zu ze zo"),
    H("ダヂヅデド", "da ji zu de do"),
    H("バビブベボ", "ba bi bu be bo"),
    H("パピプペポ", "pa pi pu pe po"),
  ],
};

/** Combination sounds: consonant + small ゃゅょ. */
function combos(script: "hiragana" | "katakana"): Cell[][] {
  const bases = script === "hiragana" ? "きしちにひみりぎじびぴ" : "キシチニヒミリギジビピ";
  const small = script === "hiragana" ? ["ゃ", "ゅ", "ょ"] : ["ャ", "ュ", "ョ"];
  const roots = ["ky", "sh", "ch", "ny", "hy", "my", "ry", "gy", "j", "by", "py"];
  return [...bases].map((b, i) =>
    small.map((s, j): Cell => {
      const vowel = ["a", "u", "o"][j];
      return [b + s, roots[i] + vowel];
    }),
  );
}

export function KanaChart() {
  const [script, setScript] = useState<"hiragana" | "katakana">("hiragana");
  const [romaji, setRomaji] = useState(true);

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kana chart</h1>
        <Link href="/" className="text-sm text-muted underline">
          Home
        </Link>
      </header>
      <div className="mt-4 flex items-center gap-2">
        {(["hiragana", "katakana"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScript(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${script === s ? "bg-accent text-white" : "border border-border"}`}
          >
            {s === "hiragana" ? "ひらがな Hiragana" : "カタカナ Katakana"}
          </button>
        ))}
        <button onClick={() => setRomaji(!romaji)} className="ml-auto rounded-full border border-border px-3 py-1.5 text-sm text-muted">
          Romaji {romaji ? "on" : "off"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">Tap a kana to hear it. Turn romaji off to test yourself.</p>

      <Section title="Basic" rows={BASIC[script]} romaji={romaji} />
      <Section title="Voiced (゛) and p-sounds (゜)" rows={VOICED[script]} romaji={romaji} />
      <Section title="Combinations" rows={combos(script)} romaji={romaji} cols={3} />

      <Link
        href={`/drill?topic=${encodeURIComponent(`kana:${script}`)}`}
        className="action-bar mt-8 block rounded-xl bg-accent px-4 py-3 text-center font-medium text-white"
      >
        Quick drill: {script}
      </Link>
    </main>
  );
}

function Section({ title, rows, romaji, cols = 5 }: { title: string; rows: Cell[][]; romaji: boolean; cols?: number }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-medium text-muted">{title}</h2>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {rows.flat().map((cell, i) =>
          cell ? (
            <button
              key={i}
              onClick={() => speak(cell[0])}
              className="flex aspect-square flex-col items-center justify-center rounded-lg border border-border bg-card active:border-accent"
              lang="ja"
            >
              <span className="text-2xl leading-none">{cell[0]}</span>
              {romaji && <span className="mt-1 text-xs text-muted">{cell[1]}</span>}
            </button>
          ) : (
            <span key={i} aria-hidden />
          ),
        )}
      </div>
    </section>
  );
}
