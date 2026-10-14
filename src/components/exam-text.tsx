import { Fragment } from "react";
import { Ruby } from "./ruby";

/**
 * Exam text: ruby markup plus {{underlined}} targets, line breaks kept.
 * `furigana` shows readings; `hideTarget` keeps them off the underlined part
 * (in a kanji-reading question the reading is the answer). Kanji above the
 * surrounding <KanjiScope> show as kana, except the underlined target of a
 * kanji question and anything marked `keepKanji` (kanji-question options).
 */
export function ExamText({
  text,
  furigana,
  hideTarget = false,
  keepKanji = false,
}: {
  text: string;
  furigana: boolean;
  hideTarget?: boolean;
  keepKanji?: boolean;
}) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\{\{.*?\}\})/).map((part, j) => {
            const target = part.match(/^\{\{(.*)\}\}$/);
            if (target) {
              return (
                <u key={j} className="decoration-2 underline-offset-4">
                  <Ruby text={target[1]} hide={!furigana || hideTarget} keepKanji />
                </u>
              );
            }
            return part ? <Ruby key={j} text={part} hide={!furigana} keepKanji={keepKanji} /> : null;
          })}
        </Fragment>
      ))}
    </>
  );
}
