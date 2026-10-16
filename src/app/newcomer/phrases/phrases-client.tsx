"use client";

import { useMemo, useState, useTransition } from "react";
import { mastery, PRIORITIES, type Priority } from "@/lib/newcomer/recall";
import type { PhraseRow } from "@/lib/newcomer/newcomer.server";
import { deletePhrase, editPhrase, restorePhrase, savePhrases, setPriority, translatePreview, type Preview } from "../actions";
import { Japanese, MasteryBar, PlayButton, ScriptToggle } from "../ui";

const ORDER: Record<Priority, number> = { priority: 0, normal: 1, less: 2, paused: 3 };
const SEARCH_FROM = 8;

export function PhrasesClient({ initial, canTranslate }: { initial: PhraseRow[]; canTranslate: boolean }) {
  const [phrases, setPhrases] = useState(initial);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<(Preview & { keep: boolean })[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<PhraseRow | null>(null);
  const [undo, setUndo] = useState<{ row: Record<string, unknown>; label: string } | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return phrases
      .filter((p) => !q || [p.meaning, p.source, p.jp, p.kana].some((s) => s.toLowerCase().includes(q)))
      .sort((a, b) => ORDER[a.priority] - ORDER[b.priority] || b.created_at.localeCompare(a.created_at));
  }, [phrases, query]);
  const active = shown.filter((p) => p.priority !== "paused");
  const paused = shown.filter((p) => p.priority === "paused");

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });

  const translate = () =>
    run(async () => {
      const result = await translatePreview(text);
      setPreview(result.phrases.map((p) => ({ ...p, keep: true })));
      setFailed(result.failed);
    });

  const save = () =>
    run(async () => {
      const keep = (preview ?? []).filter((p) => p.keep).map(({ keep, ...p }) => (void keep, p));
      const saved = keep.length ? await savePhrases(keep) : [];
      setPhrases((list) => [...saved, ...list]);
      setPreview(null);
      setFailed([]);
      setText("");
    });

  const update = (id: string, patch: Partial<PhraseRow>) => {
    setPhrases((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setOpen((o) => (o && o.id === id ? { ...o, ...patch } : o));
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My phrases</h1>
        <ScriptToggle />
      </div>

      <section className="mt-4 rounded-xl border border-border bg-card p-4">
        <label htmlFor="new-phrase" className="text-sm font-medium">
          Something you say in your day
        </label>
        <p className="text-xs text-muted">English or Malay. Put each sentence on its own line to add several at once.</p>
        <textarea
          id="new-phrase"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={6000}
          placeholder={"I'm going to the office now.\nSaya nak minum kopi."}
          className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-base"
        />
        {!canTranslate && <p className="mt-1 text-xs text-amber-600">Translation needs the Claude API key set in Vercel.</p>}
        <button
          type="button"
          disabled={pending || !text.trim() || !canTranslate}
          onClick={translate}
          className="mt-2 w-full rounded-lg bg-accent py-2 font-medium text-white disabled:opacity-50"
        >
          {pending && !preview ? "Translating…" : "Translate"}
        </button>

        {preview && (
          <div className="mt-4 space-y-2">
            {preview.map((p, i) => (
              <label key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <input
                  type="checkbox"
                  checked={p.keep}
                  onChange={(e) => setPreview((list) => list!.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))}
                  className="mt-2 h-5 w-5"
                />
                <div className="min-w-0 flex-1">
                  <Japanese kana={p.kana} jp={p.jp} reading={p.reading} className="text-lg" />
                  <div className="text-sm text-muted">{p.meaning}</div>
                </div>
                <PlayButton text={p.jp} />
              </label>
            ))}
            {failed.length > 0 && (
              <p className="text-xs text-amber-600">Couldn&apos;t translate: {failed.join(" · ")}. Try rewording.</p>
            )}
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={save} className="flex-1 rounded-lg bg-accent py-2 font-medium text-white disabled:opacity-50">
                Save {preview.filter((p) => p.keep).length}
              </button>
              <button type="button" disabled={pending} onClick={translate} className="rounded-lg border border-border px-4 py-2">
                Retry
              </button>
              <button type="button" disabled={pending} onClick={() => setPreview(null)} className="rounded-lg border border-border px-4 py-2">
                Cancel
              </button>
            </div>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      {phrases.length >= SEARCH_FROM && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your phrases"
          className="mt-4 w-full rounded-lg border border-border bg-card p-2 text-base"
        />
      )}

      {phrases.length === 0 && <p className="mt-6 text-sm text-muted">No phrases yet. Start with three things you say every day.</p>}
      <ul className="mt-4 space-y-2">
        {active.map((p) => (
          <PhraseItem key={p.id} p={p} onOpen={() => setOpen(p)} />
        ))}
      </ul>
      {paused.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-muted">Paused ({paused.length})</summary>
          <ul className="mt-2 space-y-2 opacity-70">
            {paused.map((p) => (
              <PhraseItem key={p.id} p={p} onOpen={() => setOpen(p)} />
            ))}
          </ul>
        </details>
      )}

      {open && (
        <PhraseSheet
          p={open}
          pending={pending}
          onClose={() => setOpen(null)}
          onPriority={(priority) =>
            run(async () => {
              update(open.id, { priority });
              await setPriority(open.id, priority);
            })
          }
          onEdit={(source) =>
            run(async () => {
              const p = await editPhrase(open.id, source);
              update(open.id, { source: p.source, source_lang: p.source_lang, meaning: p.meaning, jp: p.jp, reading: p.reading, kana: p.kana });
            })
          }
          onDelete={() =>
            run(async () => {
              const row = await deletePhrase(open.id);
              setPhrases((list) => list.filter((x) => x.id !== open.id));
              setOpen(null);
              setUndo({ row, label: open.meaning });
              setTimeout(() => setUndo((u) => (u?.row === row ? null : u)), 8000);
            })
          }
        />
      )}

      {undo && (
        <div className="fixed inset-x-0 bottom-4 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-lg">
          <span className="truncate">Deleted “{undo.label}”</span>
          <button
            type="button"
            className="font-semibold underline"
            onClick={() =>
              run(async () => {
                await restorePhrase(undo.row);
                setPhrases((list) => [undo.row as unknown as PhraseRow, ...list]);
                setUndo(null);
              })
            }
          >
            Undo
          </button>
        </div>
      )}
    </>
  );
}

function PhraseItem({ p, onOpen }: { p: PhraseRow; onOpen: () => void }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          {p.priority === "priority" && <span className="rounded bg-accent px-1.5 text-xs text-white">Priority</span>}
          {p.priority === "less" && <span className="rounded border border-border px-1.5 text-xs text-muted">Less often</span>}
        </div>
        <Japanese kana={p.kana} jp={p.jp} reading={p.reading} className="block text-lg" />
        <div className="truncate text-sm text-muted">{p.meaning}</div>
        <div className="mt-1">
          <MasteryBar score={mastery(p.right_count, p.wrong_count)} />
        </div>
      </button>
      <PlayButton text={p.jp} />
    </li>
  );
}

/** The detail sheet: everything about one phrase, with its controls pinned to the bottom of the screen. */
function PhraseSheet({
  p,
  pending,
  onClose,
  onPriority,
  onEdit,
  onDelete,
}: {
  p: PhraseRow;
  pending: boolean;
  onClose: () => void;
  onPriority: (p: Priority) => void;
  onEdit: (source: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [source, setSource] = useState(p.source);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-background" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button type="button" onClick={onClose} className="text-sm text-muted underline">
          ← Back
        </button>
        <ScriptToggle />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex items-start gap-3">
          <Japanese kana={p.kana} jp={p.jp} reading={p.reading} className="flex-1 text-2xl" />
          <PlayButton text={p.jp} />
        </div>
        <p className="mt-3 text-muted">{p.meaning}</p>
        <div className="mt-4">
          <MasteryBar score={mastery(p.right_count, p.wrong_count)} />
          <p className="mt-1 text-xs text-muted">
            {p.right_count} right · {p.wrong_count} wrong
            {p.last_reviewed_at ? ` · last recalled ${new Date(p.last_reviewed_at).toLocaleDateString()}` : ""}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-border p-3">
          <div className="text-xs text-muted">You wrote ({p.source_lang === "ms" ? "Malay" : "English"})</div>
          {editing ? (
            <>
              <textarea
                value={source}
                onChange={(e) => setSource(e.target.value)}
                maxLength={300}
                rows={2}
                className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-base"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={pending || !source.trim()}
                  onClick={() => {
                    onEdit(source);
                    setEditing(false);
                  }}
                  className="flex-1 rounded-lg bg-accent py-2 text-sm text-white disabled:opacity-50"
                >
                  Translate again
                </button>
                <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-border px-3 text-sm">
                  Cancel
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">Your recall progress stays.</p>
            </>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <p className="mt-1">{p.source}</p>
              <button type="button" onClick={() => setEditing(true)} className="text-sm text-muted underline">
                Edit
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border bg-card px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-2">
          {PRIORITIES.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={pending}
              onClick={() => onPriority(o.id)}
              title={o.hint}
              className={`rounded-lg border py-2 text-xs ${p.priority === o.id ? "border-accent bg-accent text-white" : "border-border"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-center text-xs text-muted">{PRIORITIES.find((o) => o.id === p.priority)?.hint}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
          className={`mt-2 w-full rounded-lg py-2 text-sm ${confirmDelete ? "bg-red-600 text-white" : "text-red-600"}`}
        >
          {confirmDelete ? "Tap again to delete" : "Delete"}
        </button>
      </div>
    </div>
  );
}
