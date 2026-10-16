import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { aiConfigured } from "@/lib/ai/engine.server";
import { costUsd } from "@/lib/ai/sentences";
import { acceptTranslations, NEWCOMER_MODEL, SYSTEM_PROMPT, Translation, userPrompt, type CheckedPhrase } from "./translate";

/** Monthly cap on translation spend per learner, in USD (NEWCOMER_MONTHLY_BUDGET_USD, default $5). */
export function newcomerBudget(): number {
  const v = Number(process.env.NEWCOMER_MONTHLY_BUDGET_USD);
  return Number.isFinite(v) && v > 0 ? v : 5;
}

async function spentThisMonth(supabase: SupabaseClient, now = new Date()): Promise<number> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data, error } = await supabase.from("newcomer_phrases").select("cost_usd").gte("created_at", start);
  if (error) throw new Error(error.message);
  return (data as { cost_usd: number | string }[]).reduce((n, r) => n + Number(r.cost_usd), 0);
}

/** Translate the learner's lines with Claude; returns the checked phrases, what failed, and the cost of the call. */
export async function translateLines(supabase: SupabaseClient, lines: string[]): Promise<{ kept: CheckedPhrase[]; failed: string[]; cost: number }> {
  if (!aiConfigured()) throw new Error("Translation isn't switched on yet: ANTHROPIC_API_KEY needs adding in Vercel.");
  const budget = newcomerBudget();
  if ((await spentThisMonth(supabase)) >= budget) throw new Error(`This month's translation budget ($${budget.toFixed(2)}) is used up.`);

  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: NEWCOMER_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Translation) },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt(lines) }],
  });
  if (response.stop_reason === "refusal") throw new Error("The translation was declined. Try rewording the sentence.");
  if (!response.parsed_output) throw new Error(`No usable translation (stopped: ${response.stop_reason}).`);
  const cost = costUsd(response.model, response.usage.input_tokens, response.usage.output_tokens);
  return { ...acceptTranslations(lines, response.parsed_output), cost };
}
