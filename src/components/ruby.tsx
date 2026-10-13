import { Fragment } from "react";
import { furiganaSegments } from "@/lib/furigana";

/**
 * Japanese text with furigana over the kanji. `reading` may be plain kana
 * (aligned to the text) or ruby markup; `text` itself may also be markup.
 * Set `hide` where the reading is the answer being tested.
 */
export function Ruby({ text, reading, hide = false }: { text: string; reading?: string | null; hide?: boolean }) {
  const segments = furiganaSegments(text, hide ? null : reading);
  return (
    <span lang={/[\u3040-\u30ff\u3400-\u9fff]/.test(text) ? "ja" : undefined}>
      {segments.map((s, i) =>
        s.ruby && !hide ? (
          <ruby key={i}>
            {s.text}
            <rp>(</rp>
            <rt>{s.ruby}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </span>
  );
}
