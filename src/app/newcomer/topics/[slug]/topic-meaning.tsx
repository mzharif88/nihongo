"use client";

import { useMeaningLang } from "../../ui";

/** The phrase's meaning in the learner's chosen language (English or Malay). */
export function TopicMeaning({ en, ms }: { en: string; ms: string }) {
  const [lang] = useMeaningLang();
  return <div className="text-sm text-muted">{lang === "ms" ? ms : en}</div>;
}
