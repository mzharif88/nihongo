"use client";

import { createContext, useContext, type ReactNode } from "react";
import { allowanceFor, type KanjiAllowance } from "@/lib/kanji-levels";

// Which kanji the text below may show. Like the JLPT, a kanji above the
// level is printed in kana (its furigana) instead. No scope = no limit.

const Scope = createContext<KanjiAllowance | null>(null);

/**
 * `level`: kanji up to this JLPT level show as kanji; `known`: extra kanji
 * the learner has started; `all`: no limit (kanji cards, kanji questions).
 */
export function KanjiScope({ level, known = "", all = false, children }: { level?: string; known?: string; all?: boolean; children: ReactNode }) {
  return <Scope.Provider value={all || !level ? null : allowanceFor(level, known)}>{children}</Scope.Provider>;
}

export const useKanjiAllowance = () => useContext(Scope);
