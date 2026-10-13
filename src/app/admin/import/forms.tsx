"use client";

import { useActionState } from "react";
import { importBundled, importGroup, importJson, type ImportState } from "../actions";

function Result({ state }: { state: ImportState }) {
  return (
    <div className="mt-3 space-y-2 text-sm">
      {state.message && <p className="whitespace-pre-wrap text-green-700 dark:text-green-400">{state.message}</p>}
      {state.error && <p className="whitespace-pre-wrap text-red-600 dark:text-red-400">{state.error}</p>}
      {state.issues && state.issues.length > 0 && (
        <details className="rounded-lg border border-border p-2">
          <summary className="cursor-pointer">{state.issues.length} skipped records</summary>
          <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
            {state.issues.map((i) => (
              <li key={i.index}>
                <span className="font-mono">
                  #{i.index} {i.slug}
                </span>
                <pre className="whitespace-pre-wrap text-xs text-muted">{i.message}</pre>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function JsonImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importJson, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="file" name="file" accept="application/json,.json" className="block text-sm" />
      <textarea
        name="json"
        rows={8}
        placeholder='{"version": 1, "kind": "items", "source": "claude-draft", "records": [...]}'
        className="w-full rounded-lg border border-border bg-card p-3 font-mono text-xs"
      />
      <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Importing…" : "Import as drafts"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function BundledImportForm({ group, file, label }: { group: string; file: string; label: string }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importBundled, {});
  return (
    <form action={action}>
      <input type="hidden" name="group" value={group} />
      <input type="hidden" name="pack" value={file} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-muted">{file}</div>
          <div className="text-sm">{label}</div>
        </div>
        <button
          disabled={pending}
          className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent disabled:opacity-60"
        >
          {pending ? "Importing…" : "Import"}
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function GroupImportForm({ group, count }: { group: string; count: number }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importGroup, {});
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="group" value={group} />
      <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Importing… (this can take a minute)" : `Import all ${count} in order`}
      </button>
      <Result state={state} />
    </form>
  );
}
