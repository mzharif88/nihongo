import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiConfigured, anthropicClient } from "@/lib/ai/engine.server";
import { costUsd } from "@/lib/ai/sentences";
import { acceptTranslations, NEWCOMER_MODEL, SYSTEM_PROMPT, Translation, userPrompt, type CheckedPhrase } from "./translate";

/** Monthly cap on translation spend per learner, in USD (NEWCOMER_MONTHLY_BUDGET_USD, default $5). */
export function newcomerBudget(): number {
  const v = Number(process.env.NEWCOMER_MONTHLY_BUDGET_USD);
  return Number.isFinite(v) && v > 0 ? v : 5;
}

export interface Spend {
  /** USD spent on translations this calendar month (UTC). */
  month: number;
  /** USD spent ever. */
  total: number;
  /** The monthly cap. */
  budget: number;
}

/** What the learner has spent on Claude translations, from the spend log (kept when phrases are deleted). */
export async function loadSpend(supabase: SupabaseClient, now = new Date()): Promise<Spend> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data, error } = await supabase.from("newcomer_ai_spend").select("cost_usd, created_at");
  if (error) throw new Error(error.message);
  const rows = data as { cost_usd: number | string; created_at: string }[];
  const sum = (r: typeof rows) => r.reduce((n, x) => n + Number(x.cost_usd), 0);
  return { month: sum(rows.filter((r) => r.created_at >= start)), total: sum(rows), budget: newcomerBudget() };
}

/** Translate the learner's lines with Claude; returns the checked phrases, what failed, and the cost of the call. */
export async function translateLines(
  supabase: SupabaseClient,
  lines: string[],
  kind: "add" | "edit" = "add",
): Promise<{ kept: CheckedPhrase[]; failed: string[]; cost: number }> {
  if (!aiConfigured()) throw new Error("Translation isn't switched on yet: ANTHROPIC_API_KEY needs adding in Vercel.");
  const budget = newcomerBudget();
  if ((await loadSpend(supabase)).month >= budget) throw new Error(`This month's translation budget ($${budget.toFixed(2)}) is used up.`);

  const client = anthropicClient();
  const response = await client.beta.messages.parse({
    model: NEWCOMER_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Translation) },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt(lines) }],
  });
  const cost = costUsd(response.model, response.usage.input_tokens, response.usage.output_tokens);
  // Log the spend whether or not every line came back usable: the call was paid for.
  const { error: spendError } = await supabase.from("newcomer_ai_spend").insert({ kind, lines: lines.length, cost_usd: cost });
  if (spendError) console.error("newcomer_ai_spend", spendError.message);
  if (response.stop_reason === "refusal") throw new Error("The translation was declined. Try rewording the sentence.");
  if (!response.parsed_output) throw new Error(`No usable translation (stopped: ${response.stop_reason}).`);
  return { ...acceptTranslations(lines, response.parsed_output), cost };
}
