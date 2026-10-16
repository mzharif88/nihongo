import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";
import { loadCourse } from "@/lib/course/course.server";
import { planUnits } from "@/lib/course/engine";
import {
  acceptSentences,
  AI_MODELS,
  costUsd,
  SentenceBatch,
  SYSTEM_PROMPT,
  userPrompt,
  type AiModelId,
  type WordRequest,
} from "./sentences";

/** Words per API request; a run of more words makes several requests. */
const CHUNK = 20;
export const MAX_WORDS_PER_RUN = 60;

/** Monthly spend cap in USD (AI_MONTHLY_BUDGET_USD, default $10). Runs are refused once it's reached. */
export function monthlyBudget(): number {
  const v = Number(process.env.AI_MONTHLY_BUDGET_USD);
  return Number.isFinite(v) && v > 0 ? v : 10;
}

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

/**
 * The Claude client. A key made at the organisation level (not inside a
 * workspace) must name its workspace on every request: set
 * ANTHROPIC_WORKSPACE_ID in Vercel to the workspace's ID (wrkspc_…).
 */
export function anthropicClient(): Anthropic {
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  return new Anthropic(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {});
}

/** A Claude API error in words the learner can act on (server errors are hidden in production). */
export function friendlyAiError(e: unknown): string {
  if (e instanceof Anthropic.APIError) {
    const message = String((e.error as { error?: { message?: string } } | undefined)?.error?.message ?? e.message);
    if (/workspace/i.test(message)) return "The Claude API key isn't tied to a workspace. Add ANTHROPIC_WORKSPACE_ID in Vercel, or use a key created inside a workspace.";
    if (e.status === 401) return "The Claude API key was rejected. Check ANTHROPIC_API_KEY in Vercel.";
    if (e.status === 403) return "The Claude API key isn't allowed to use this model.";
    if (e.status === 429) return "Too many requests to Claude right now. Try again in a minute.";
    if (e.status && e.status >= 500) return "Claude is busy or down. Try again shortly.";
    return `Claude couldn't translate that (${e.status ?? "error"}). Try again.`;
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

export type AiScope = "course" | "N5" | "N4" | "N3" | "N2";
export const AI_SCOPES: { id: AiScope; label: string }[] = [
  { id: "course", label: "Words in my next course units" },
  { id: "N5", label: "N5 words without sentences" },
  { id: "N4", label: "N4 words without sentences" },
  { id: "N3", label: "N3 words without sentences" },
  { id: "N2", label: "N2 words without sentences" },
];

type WordRow = { id: string; slug: string; term: string; reading: string | null; meaning: string; jlpt_level: string; type: string; examples: unknown[] };

/** Spend so far this calendar month (UTC). */
export async function spentThisMonth(supabase: SupabaseClient, now = new Date()): Promise<number> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data, error } = await supabase.from("ai_runs").select("cost_usd").gte("created_at", start);
  if (error) throw new Error(error.message);
  return (data as { cost_usd: number | string }[]).reduce((n, r) => n + Number(r.cost_usd), 0);
}

/** The next words that need sentences: no examples yet and nothing waiting in review. */
async function pickWords(supabase: SupabaseClient, profile: Profile, scope: AiScope, count: number): Promise<WordRow[]> {
  if (scope !== "course") {
    const { data, error } = await supabase.rpc("words_needing_examples", { lvl: scope, max_words: count });
    if (error) throw new Error(error.message);
    return data as WordRow[];
  }
  const [course, { data: pending, error }] = await Promise.all([
    loadCourse(supabase, profile),
    supabase.from("ai_sentences").select("item_id").neq("status", "rejected"),
  ]);
  if (error) throw new Error(error.message);
  const taken = new Set((pending as { item_id: string }[]).map((p) => p.item_id));
  // Units several steps ahead, so sentences are ready before the learner gets there.
  const units = planUnits(course.items, profile.target_level, course.state, { count: 8 });
  const rows = new Map(course.items.map((i) => [i.id, i]));
  return units
    .flatMap((u) => u.items)
    .map((i) => rows.get(i.id)!)
    .filter((i) => i.type === "word" && !(i.examples ?? []).length && !taken.has(i.id))
    .slice(0, count) as unknown as WordRow[];
}

export interface RunResult {
  runId: string;
  words: number;
  sentences: number;
  discarded: number;
  costUsd: number;
}

/**
 * Generate example sentences: pick words, ask Claude in chunks, keep the
 * sentences that pass the checks as pending review, and log the run's
 * tokens and cost. Refuses to start once the monthly budget is spent.
 */
export async function runSentenceJob(
  supabase: SupabaseClient,
  profile: Profile,
  opts: { scope: AiScope; model: AiModelId; count: number },
): Promise<RunResult> {
  if (!aiConfigured()) throw new Error("ANTHROPIC_API_KEY isn't set in the Vercel project.");
  const budget = monthlyBudget();
  const spent = await spentThisMonth(supabase);
  if (spent >= budget) throw new Error(`This month's AI budget ($${budget.toFixed(2)}) is used up.`);

  const count = Math.max(1, Math.min(MAX_WORDS_PER_RUN, Math.round(opts.count)));
  const words = await pickWords(supabase, profile, opts.scope, count);
  if (!words.length) throw new Error("No words need sentences in that scope.");

  const { data: run, error: runError } = await supabase
    .from("ai_runs")
    .insert({ model: opts.model, scope: opts.scope, words_requested: words.length })
    .select("id")
    .single<{ id: string }>();
  if (runError) throw new Error(runError.message);

  const model = AI_MODELS.find((m) => m.id === opts.model)!;
  const client = anthropicClient();
  const totals = { input: 0, output: 0, cost: 0, created: 0, discarded: 0 };
  const bySlug = new Map(words.map((w) => [w.slug, w]));

  try {
    for (let i = 0; i < words.length; i += CHUNK) {
      const chunk: WordRequest[] = words.slice(i, i + CHUNK).map((w) => ({
        slug: w.slug,
        term: w.term,
        reading: w.reading,
        meaning: w.meaning,
        level: w.jlpt_level,
      }));
      const response = await client.beta.messages.parse({
        model: model.id,
        max_tokens: 16000,
        ...(model.fallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
        output_config: { effort: "low", format: betaZodOutputFormat(SentenceBatch) },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt(chunk) }],
      });
      totals.input += response.usage.input_tokens;
      totals.output += response.usage.output_tokens;
      // Priced at the model that actually answered (a fallback may have served it).
      totals.cost += costUsd(response.model, response.usage.input_tokens, response.usage.output_tokens);
      if (response.stop_reason === "refusal") throw new Error("The model declined the request.");
      if (!response.parsed_output) throw new Error(`No usable output (stopped: ${response.stop_reason}).`);

      const { kept, discarded } = acceptSentences(chunk, response.parsed_output);
      totals.discarded += discarded;
      if (kept.length) {
        const { error } = await supabase.from("ai_sentences").insert(
          kept.map((s) => ({ run_id: run.id, item_id: bySlug.get(s.slug)!.id, jp: s.jp, en: s.en, reading: s.reading })),
        );
        if (error) throw new Error(error.message);
        totals.created += kept.length;
      }
    }
    await finish(supabase, run.id, "succeeded", totals);
    return { runId: run.id, words: words.length, sentences: totals.created, discarded: totals.discarded, costUsd: totals.cost };
  } catch (e) {
    const message = e instanceof Anthropic.APIError ? `API error ${e.status}: ${e.message}` : (e as Error).message;
    await finish(supabase, run.id, "failed", totals, message);
    throw new Error(message);
  }
}

async function finish(
  supabase: SupabaseClient,
  id: string,
  status: "succeeded" | "failed",
  t: { input: number; output: number; cost: number; created: number; discarded: number },
  error?: string,
) {
  await supabase
    .from("ai_runs")
    .update({
      status,
      input_tokens: t.input,
      output_tokens: t.output,
      cost_usd: Number(t.cost.toFixed(4)),
      sentences_created: t.created,
      sentences_discarded: t.discarded,
      error: error?.slice(0, 500) ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id);
}
