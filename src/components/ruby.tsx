"use client";

import { Fragment } from "react";
import { furiganaSegments, hasKanji } from "@/lib/furigana";
import { kanjiAllowed } from "@/lib/kanji-levels";
import { useKanjiAllowance } from "./kanji-scope";

/**
 * Japanese text with furigana over the kanji. `reading` may be plain kana
 * (aligned to the text) or ruby markup; `text` itself may also be markup.
 * Set `hide` where the reading is the answer being tested. Sentences that
 * carry grammar roles are colour-coded (see .role-* in globals.css).
 *
 * Inside a <KanjiScope>, a word whose kanji are above the scope's level
 * always shows its furigana, even where furigana is hidden (exam mode), the
 * way the JLPT prints it (official sample questions, N5–N2). `keepKanji`
 * opts out: kanji cards and kanji questions, where the reading is tested.
 */
export function Ruby({ text, reading, hide = false, keepKanji = false }: { text: string; reading?: string | null; hide?: boolean; keepKanji?: boolean }) {
  const allowance = useKanjiAllowance();
  const segments = furiganaSegments(text, reading);
  return (
    <span lang={/[぀-ヿ㐀-鿿]/.test(text) ? "ja" : undefined}>
      {segments.map((s, i) => {
        // Above the level: furigana stays on whatever `hide` says, as on the real exam paper.
        const aboveLevel = !keepKanji && !!s.ruby && hasKanji(s.text) && !kanjiAllowed(s.text, allowance);
        const inner = s.ruby && (!hide || aboveLevel) ? (
          <ruby>
            {s.text}
            <rp>(</rp>
            <rt>{s.ruby}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          s.text
        );
        return s.role ? (
          <span key={i} className={`role-${s.role}`}>
            {inner}
          </span>
        ) : (
          <Fragment key={i}>{inner}</Fragment>
        );
      })}
    </span>
  );
}
