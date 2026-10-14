"use client";

import { useActionState } from "react";
import { triggerRun, type TriggerState } from "./actions";

interface Props {
  scopes: { id: string; label: string }[];
  models: { id: string; label: string; input: number; output: number }[];
  maxWords: number;
  disabled: string | null;
}

export function TriggerForm({ scopes, models, maxWords, disabled }: Props) {
  const [state, action, pending] = useActionState<TriggerState, FormData>(triggerRun, {});
  return (
    <form action={action} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-muted">Words from</span>
          <select name="scope" className="mt-1 w-full rounded-lg border border-border bg-background p-2">
            {scopes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted">How many words</span>
          <input
            name="count"
            type="number"
            min={1}
            max={maxWords}
            defaultValue={20}
            className="mt-1 w-full rounded-lg border border-border bg-background p-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-muted">Model</span>
          <select name="model" className="mt-1 w-full rounded-lg border border-border bg-background p-2">
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} (${m.input}/${m.output} per M tokens)
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted">
        Two sentences per word, checked automatically (contains the word, furigana matches, right length). A run of 20 words
        typically costs a few cents on Opus 5.5 and much less on the cheaper models.
      </p>
      <button
        disabled={pending || !!disabled}
        className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Writing sentences… (up to a minute)" : "Run now"}
      </button>
      {disabled && <p className="text-sm text-red-600 dark:text-red-400">{disabled}</p>}
      {state.message && <p className="text-sm text-green-700 dark:text-green-400">{state.message}</p>}
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
