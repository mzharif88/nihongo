"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { grade, type Priority } from "@/lib/newcomer/recall";
import { splitLines, type CheckedPhrase } from "@/lib/newcomer/translate";
import { translateLines } from "@/lib/newcomer/translate.server";
import { PHRASE_COLUMNS, type PhraseRow } from "@/lib/newcomer/newcomer.server";
import { scene } from "@/lib/newcomer/listening";
import { starterTopic } from "@/lib/newcomer/starter";

const PRIORITY = z.enum(["priority", "normal", "less", "paused"]);

export interface Preview extends CheckedPhrase {
  /** This phrase's share of the call's cost, saved with it. */
  cost: number;
}

/** Translate one or more lines (one per line) without saving: the learner checks, then saves. */
export async function translatePreview(text: string): Promise<{ phrases: Preview[]; failed: string[] }> {
  const { supabase } = await requireUser();
  const lines = splitLines(z.string().max(6000).parse(text));
  if (!lines.length) throw new Error("Type a sentence first.");
  if (lines.some((l) => l.length > 300)) throw new Error("Keep each sentence under 300 characters.");
  const { kept, failed, cost } = await translateLines(supabase, lines);
  const share = kept.length ? cost / kept.length : 0;
  return { phrases: kept.map((p) => ({ ...p, cost: share })), failed };
}

const SavePhrase = z.object({
  source: z.string().min(1).max(300),
  source_lang: z.enum(["en", "ms"]),
  meaning: z.string().min(1).max(400),
  jp: z.string().min(1).max(200),
  reading: z.string().min(1).max(600),
  kana: z.string().min(1).max(300),
  words: z.array(z.string().max(20)).max(15).default([]),
  cost: z.number().min(0).max(1),
});

/** Save checked previews; returns the saved rows for the page's list. */
export async function savePhrases(phrases: Preview[]): Promise<PhraseRow[]> {
  const { supabase } = await requireUser();
  const rows = z.array(SavePhrase).max(20).parse(phrases).map(({ cost, ...p }) => ({ ...p, cost_usd: cost }));
  const { data, error } = await supabase.from("newcomer_phrases").insert(rows).select(PHRASE_COLUMNS);
  if (error) throw new Error(error.message);
  return data as unknown as PhraseRow[];
}

export async function setPriority(id: string, priority: Priority) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("newcomer_phrases").update({ priority: PRIORITY.parse(priority) }).eq("id", z.string().uuid().parse(id));
  if (error) throw new Error(error.message);
}

/** Delete a phrase; returns the row so the page can offer Undo. */
export async function deletePhrase(id: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("newcomer_phrases").delete().eq("id", z.string().uuid().parse(id)).select("*").single();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function restorePhrase(row: Record<string, unknown>) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("newcomer_phrases").insert(row);
  if (error) throw new Error(error.message);
}

/** Change the sentence: translate the new wording and replace the phrase, keeping its progress. */
export async function editPhrase(id: string, source: string): Promise<Preview> {
  const { supabase } = await requireUser();
  const line = z.string().min(1).max(300).parse(source.trim());
  const { kept, cost } = await translateLines(supabase, [line]);
  if (!kept.length) throw new Error("Couldn't translate that. Try rewording it.");
  const p = kept[0];
  const { error } = await supabase
    .from("newcomer_phrases")
    .update({ source: p.source, source_lang: p.source_lang, meaning: p.meaning, jp: p.jp, reading: p.reading, kana: p.kana, words: p.words })
    .eq("id", z.string().uuid().parse(id));
  if (error) throw new Error(error.message);
  return { ...p, cost };
}

const Answer = z.object({ key: z.string().regex(/^(mine:[0-9a-f-]{36}|starter:[a-z0-9-]+)$/), correct: z.boolean(), at: z.string().datetime().optional() });

/** Record one self-graded recall answer (also used to replay answers saved offline). */
export async function recordRecall(input: { key: string; correct: boolean; at?: string }) {
  const { supabase, user } = await requireUser();
  const { key, correct, at } = Answer.parse(input);
  const now = at ? new Date(at) : new Date();
  if (key.startsWith("mine:")) {
    const id = key.slice(5);
    const { data, error } = await supabase.from("newcomer_phrases").select("right_count, wrong_count, streak, due_at, priority").eq("id", id).single();
    if (error) throw new Error(error.message);
    const next = grade({ right: data.right_count, wrong: data.wrong_count, streak: data.streak, due: data.due_at }, correct, data.priority, now);
    const { error: e2 } = await supabase
      .from("newcomer_phrases")
      .update({ right_count: next.right, wrong_count: next.wrong, streak: next.streak, due_at: next.due, last_reviewed_at: now.toISOString() })
      .eq("id", id);
    if (e2) throw new Error(e2.message);
    return;
  }
  const slug = key.slice(8);
  if (!slug.includes("-") || !starterTopic(slug.replace(/-\d+$/, ""))) throw new Error("Unknown phrase.");
  const { data } = await supabase.from("newcomer_progress").select("right_count, wrong_count, streak, due_at").eq("phrase_slug", slug).maybeSingle();
  const next = grade(
    { right: data?.right_count ?? 0, wrong: data?.wrong_count ?? 0, streak: data?.streak ?? 0, due: data?.due_at ?? now.toISOString() },
    correct,
    "normal",
    now,
  );
  const { error } = await supabase.from("newcomer_progress").upsert({
    user_id: user.id,
    phrase_slug: slug,
    right_count: next.right,
    wrong_count: next.wrong,
    streak: next.streak,
    due_at: next.due,
    last_reviewed_at: now.toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** The private Shortcut feed link's token, made on first use. */
export async function feedToken(): Promise<string> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("newcomer_feeds").select("token").maybeSingle();
  if (data?.token) return data.token;
  const token = randomBytes(24).toString("hex");
  const { error } = await supabase.from("newcomer_feeds").insert({ token });
  if (error) throw new Error(error.message);
  return token;
}

/** Replace the feed link, so an old copy stops working. */
export async function resetFeedToken(): Promise<string> {
  const { supabase, user } = await requireUser();
  const token = randomBytes(24).toString("hex");
  const { error } = await supabase.from("newcomer_feeds").upsert({ user_id: user.id, token });
  if (error) throw new Error(error.message);
  return token;
}

const Listen = z.object({ slug: z.string().regex(/^[a-z-]+-\d$/), gistCorrect: z.boolean().optional() });

/** Count one listen to a scene; with the gist answer, remember whether it was caught (a catch sticks). */
export async function recordListen(input: { slug: string; gistCorrect?: boolean }) {
  const { supabase, user } = await requireUser();
  const { slug, gistCorrect } = Listen.parse(input);
  if (!scene(slug)) throw new Error("Unknown scene.");
  const { data } = await supabase.from("newcomer_listening").select("plays, gist_correct").eq("scene_slug", slug).maybeSingle();
  const { error } = await supabase.from("newcomer_listening").upsert({
    user_id: user.id,
    scene_slug: slug,
    plays: (data?.plays ?? 0) + (gistCorrect === undefined ? 1 : 0),
    gist_correct: data?.gist_correct === true ? true : (gistCorrect ?? data?.gist_correct ?? null),
    last_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/** Log a playlist play for Night Recall (at most one per 10 minutes). */
export async function recordPlay() {
  const { supabase } = await requireUser();
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await supabase.from("newcomer_plays").select("id", { count: "exact", head: true }).eq("source", "app").gte("played_at", since);
  if (count) return;
  const { error } = await supabase.from("newcomer_plays").insert({ source: "app" });
  if (error) throw new Error(error.message);
}
