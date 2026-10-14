"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { runSentenceJob, type AiScope, AI_SCOPES } from "@/lib/ai/engine.server";
import { isAiModel } from "@/lib/ai/sentences";

export interface TriggerState {
  message?: string;
  error?: string;
}

/** Start a sentence-generation run from the admin form. */
export async function triggerRun(_prev: TriggerState, formData: FormData): Promise<TriggerState> {
  const { supabase, profile } = await requireAdmin();
  const scope = String(formData.get("scope")) as AiScope;
  const model = String(formData.get("model"));
  const count = Number(formData.get("count"));
  if (!AI_SCOPES.some((s) => s.id === scope) || !isAiModel(model) || !Number.isFinite(count)) return { error: "Invalid settings." };
  try {
    const r = await runSentenceJob(supabase, profile, { scope, model, count });
    revalidatePath("/admin/ai");
    return {
      message: `Wrote ${r.sentences} sentences for ${r.words} words ($${r.costUsd.toFixed(4)}).${
        r.discarded ? ` ${r.discarded} failed the checks and were dropped.` : ""
      } They're waiting for review below.`,
    };
  } catch (e) {
    revalidatePath("/admin/ai");
    return { error: (e as Error).message };
  }
}

/**
 * Approve or reject pending sentences. Approved ones are appended to their
 * word's examples, where study cards and course units pick them up.
 */
export async function reviewSentences(formData: FormData) {
  const { supabase } = await requireAdmin();
  const decision = String(formData.get("decision"));
  const all = formData.get("all") === "1";
  if (decision !== "approve" && decision !== "reject") throw new Error("Unknown decision.");

  let query = supabase.from("ai_sentences").select("id, item_id, jp, en, reading").eq("status", "pending");
  if (!all) query = query.in("id", formData.getAll("id").map(String));
  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  const pending = rows as { id: string; item_id: string; jp: string; en: string; reading: string }[];
  if (!pending.length) return;

  if (decision === "approve") {
    const itemIds = [...new Set(pending.map((p) => p.item_id))];
    const { data: items, error: itemsError } = await supabase.from("items").select("id, examples").in("id", itemIds);
    if (itemsError) throw new Error(itemsError.message);
    for (const item of items as { id: string; examples: { jp: string }[] }[]) {
      const add = pending.filter((p) => p.item_id === item.id && !item.examples.some((e) => e.jp === p.jp));
      if (!add.length) continue;
      const examples = [...item.examples, ...add.map((p) => ({ jp: p.jp, en: p.en, reading: p.reading }))];
      const { error: saveError } = await supabase.from("items").update({ examples }).eq("id", item.id);
      if (saveError) throw new Error(saveError.message);
    }
  }
  const { error: markError } = await supabase
    .from("ai_sentences")
    .update({ status: decision === "approve" ? "approved" : "rejected", reviewed_at: new Date().toISOString() })
    .in("id", pending.map((p) => p.id));
  if (markError) throw new Error(markError.message);
  revalidatePath("/admin/ai");
}
