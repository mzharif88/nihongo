import { Fragment } from "react";
import { furiganaSegments } from "@/lib/furigana";

/**
 * Japanese text with furigana over the kanji. `reading` may be plain kana
 * (aligned to the text) or ruby markup; `text` itself may also be markup.
 * Set `hide` where the reading is the answer being tested. Sentences that
 * carry grammar roles are colour-coded (see .role-* in globals.css).
 */
export function Ruby({ text, reading, hide = false }: { text: string; reading?: string | null; hide?: boolean }) {
  const segments = furiganaSegments(text, hide ? null : reading);
  return (
    <span lang={/[぀-ヿ㐀-鿿]/.test(text) ? "ja" : undefined}>
      {segments.map((s, i) => {
        const inner =
          s.ruby && !hide ? (
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
