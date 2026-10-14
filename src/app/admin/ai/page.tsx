import { Ruby } from "@/components/ruby";
import { requireAdmin } from "@/lib/auth";
import { AI_SCOPES, aiConfigured, MAX_WORDS_PER_RUN, monthlyBudget, spentThisMonth } from "@/lib/ai/engine.server";
import { AI_MODELS } from "@/lib/ai/sentences";
import { reviewSentences } from "./actions";
import { TriggerForm } from "./trigger-form";

export const dynamic = "force-dynamic";
// A run makes one API call per 20 words; give it time.
export const maxDuration = 300;

interface Run {
  id: string;
  model: string;
  scope: string;
  status: string;
  words_requested: number;
  sentences_created: number;
  sentences_discarded: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number | string;
  error: string | null;
  created_at: string;
}

const usd = (n: number) => `$${n.toFixed(n < 1 ? 4 : 2)}`;
const num = (n: number) => n.toLocaleString("en-US");

export default async function AiEnginePage() {
  const { supabase } = await requireAdmin();
  const [{ data: runs, error }, { data: sentences, error: sError }, { data: coverage, error: cError }, spent] = await Promise.all([
    supabase.from("ai_runs").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("ai_sentences").select("id, item_id, status"),
    supabase.rpc("example_coverage"),
    spentThisMonth(supabase),
  ]);
  if (error || sError || cError) throw new Error((error ?? sError ?? cError)!.message);
  const allRuns = runs as Run[];
  const allSentences = sentences as { id: string; item_id: string; status: string }[];

  const { data: pendingRows } = await supabase
    .from("ai_sentences")
    .select("id, jp, en, reading, created_at, items(term, reading, meaning, jlpt_level)")
    .eq("status", "pending")
    .order("created_at")
    .limit(100);
  const pending = (pendingRows ?? []) as unknown as {
    id: string;
    jp: string;
    en: string;
    reading: string;
    items: { term: string; reading: string | null; meaning: string; jlpt_level: string } | null;
  }[];

  const budget = monthlyBudget();
  const configured = aiConfigured();
  const totals = {
    runs: allRuns.length,
    failed: allRuns.filter((r) => r.status === "failed").length,
    cost: allRuns.reduce((n, r) => n + Number(r.cost_usd), 0),
    input: allRuns.reduce((n, r) => n + r.input_tokens, 0),
    output: allRuns.reduce((n, r) => n + r.output_tokens, 0),
    produced: allSentences.length,
    approved: allSentences.filter((s) => s.status === "approved").length,
    rejected: allSentences.filter((s) => s.status === "rejected").length,
    pending: allSentences.filter((s) => s.status === "pending").length,
    words: new Set(allSentences.filter((s) => s.status !== "rejected").map((s) => s.item_id)).size,
    discarded: allRuns.reduce((n, r) => n + r.sentences_discarded, 0),
  };
  const disabled = !configured
    ? "Add ANTHROPIC_API_KEY to the Vercel project's environment variables, then redeploy."
    : spent >= budget
      ? `This month's budget (${usd(budget)}) is used up. Raise AI_MONTHLY_BUDGET_USD to run more.`
      : null;

  return (
    <main className="space-y-8">
      <section>
        <h1 className="text-xl font-bold">AI engine</h1>
        <p className="mt-1 text-sm text-muted">
          Writes example sentences for words that have none, so course units get fill-in-the-blank practice. Every sentence is
          checked automatically, then waits here for your review before learners see it.
        </p>
        <p className="mt-2 text-sm">
          Status:{" "}
          {configured ? (
            <span className="font-medium text-green-700 dark:text-green-400">API key set</span>
          ) : (
            <span className="font-medium text-red-600 dark:text-red-400">No API key</span>
          )}
        </p>
      </section>

      <section>
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Spend this month</span>
          <span className="tabular-nums text-muted">
            {usd(spent)} of {usd(budget)} budget
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full ${spent >= budget ? "bg-red-600" : "bg-accent"}`}
            style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted">Estimated from token usage at list prices. Set AI_MONTHLY_BUDGET_USD in Vercel to change the cap.</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Total spend" value={usd(totals.cost)} />
        <Tile label="Runs" value={num(totals.runs)} sub={totals.failed ? `${totals.failed} failed` : undefined} />
        <Tile label="Tokens in / out" value={`${num(totals.input)} / ${num(totals.output)}`} />
        <Tile label="Words covered" value={num(totals.words)} />
        <Tile label="Sentences written" value={num(totals.produced)} sub={totals.discarded ? `${totals.discarded} dropped by checks` : undefined} />
        <Tile label="Approved" value={num(totals.approved)} />
        <Tile label="Waiting for review" value={num(totals.pending)} />
        <Tile label="Rejected" value={num(totals.rejected)} />
      </section>

      <section>
        <h2 className="font-bold">Words with example sentences</h2>
        <div className="mt-2 space-y-2">
          {(coverage as { level: string; words: number; with_examples: number }[])
            .filter((c) => ["N5", "N4", "N3", "N2", "N1"].includes(c.level))
            .map((c) => (
              <div key={c.level}>
                <div className="flex justify-between text-sm">
                  <span>{c.level}</span>
                  <span className="tabular-nums text-muted">
                    {num(Number(c.with_examples))} / {num(Number(c.words))}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-accent" style={{ width: `${(Number(c.with_examples) / Number(c.words)) * 100}%` }} />
                </div>
              </div>
            ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold">Run the engine</h2>
        <TriggerForm
          scopes={AI_SCOPES}
          models={AI_MODELS.map((m) => ({ id: m.id, label: m.label, input: m.input, output: m.output }))}
          maxWords={MAX_WORDS_PER_RUN}
          disabled={disabled}
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">Waiting for review ({totals.pending})</h2>
          {pending.length > 0 && (
            <form action={reviewSentences}>
              <input type="hidden" name="all" value="1" />
              <button name="decision" value="approve" className="text-sm text-accent underline">
                Approve all
              </button>
            </form>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing to review.</p>
        ) : (
          <form action={reviewSentences} className="mt-2 space-y-2">
            <ul className="space-y-2">
              {pending.map((p) => (
                <li key={p.id} className="flex gap-3 rounded-xl border border-border bg-card p-3">
                  <input type="checkbox" name="id" value={p.id} defaultChecked className="mt-2" aria-label="Select" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted" lang="ja">
                      {p.items?.jlpt_level} · {p.items?.term}
                      {p.items?.reading ? `（${p.items.reading}）` : ""} · {p.items?.meaning}
                    </div>
                    <div className="text-lg leading-loose" lang="ja">
                      <Ruby text={p.reading} />
                    </div>
                    <div className="text-sm text-muted">{p.en}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="action-bar flex gap-3">
              <button name="decision" value="approve" className="flex-1 rounded-lg bg-accent px-4 py-2 font-medium text-white">
                Approve selected
              </button>
              <button name="decision" value="reject" className="flex-1 rounded-lg border border-border px-4 py-2 font-medium">
                Reject selected
              </button>
            </div>
          </form>
        )}
      </section>

      <section>
        <h2 className="font-bold">Recent runs</h2>
        {allRuns.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No runs yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="p-2 font-medium">When</th>
                  <th className="p-2 font-medium">Scope</th>
                  <th className="p-2 font-medium">Model</th>
                  <th className="p-2 text-right font-medium">Words</th>
                  <th className="p-2 text-right font-medium">Sentences</th>
                  <th className="p-2 text-right font-medium">Tokens</th>
                  <th className="p-2 text-right font-medium">Cost</th>
                  <th className="p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {allRuns.slice(0, 30).map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="p-2">{r.scope}</td>
                    <td className="p-2 whitespace-nowrap">{r.model.replace("claude-", "")}</td>
                    <td className="p-2 text-right tabular-nums">{r.words_requested}</td>
                    <td className="p-2 text-right tabular-nums">{r.sentences_created}</td>
                    <td className="p-2 text-right tabular-nums">{num(r.input_tokens + r.output_tokens)}</td>
                    <td className="p-2 text-right tabular-nums">{usd(Number(r.cost_usd))}</td>
                    <td className="p-2">
                      <span className={r.status === "failed" ? "text-red-600 dark:text-red-400" : r.status === "running" ? "text-muted" : ""}>
                        {r.status}
                      </span>
                      {r.error && <div className="text-xs text-muted">{r.error}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
