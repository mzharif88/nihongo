"use client";

import { useActionState } from "react";
import { saveRecord, type SaveState } from "../../../actions";

export function RecordEditor({ kind, id, slug, initial }: { kind: string; id: string; slug: string; initial: string }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveRecord, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slug" value={slug} />
      <textarea
        name="json"
        defaultValue={initial}
        rows={24}
        spellCheck={false}
        className="w-full rounded-xl border border-border bg-card p-3 font-mono text-xs leading-relaxed"
      />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
        <span className="text-sm text-muted">Saving keeps the current status.</span>
      </div>
      {state.saved && <p className="text-sm text-green-700 dark:text-green-400">Saved.</p>}
      {state.error && <pre className="whitespace-pre-wrap text-sm text-red-600 dark:text-red-400">{state.error}</pre>}
    </form>
  );
}
