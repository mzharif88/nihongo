"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { mastery, PRIORITIES, type Priority } from "@/lib/newcomer/recall";
import type { PhraseRow } from "@/lib/newcomer/newcomer.server";
import type { Spend } from "@/lib/newcomer/translate.server";
import { deletePhrase, editPhrase, movePhrase, restorePhrase, savePhrases, setPriority, translatePreview } from "../actions";
import { Japanese, MasteryBar, PhraseColourKey, PlayButton, ScriptToggle } from "../ui";

const SEARCH_FROM = 8;

/** A small USD amount: $0.0042 below a cent, $0.12 above. */
export const usd = (n: number) => `$${n < 0.01 ? n.toFixed(4) : n.toFixed(2)}`;

export function PhrasesClient({ initial, canTranslate, spend: initialSpend }: { initial: PhraseRow[]; canTranslate: boolean; spend: Spend }) {
  const [phrases, setPhrases] = useState(initial);
  const [spend, setSpend] = useState(initialSpend);
  const addSpend = (cost: number) => setSpend((s) => ({ ...s, month: s.month + cost, total: s.total + cost }));
  const [text, setText] = useState("");
  const [added, setAdded] = useState<{ count: number; failed: string[]; cost: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<PhraseRow | null>(null);
  const [undo, setUndo] = useState<{ row: Record<string, unknown>; label: string } | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return phrases
      .filter((p) => !q || [p.meaning, p.source, p.jp, p.kana].some((s) => s.toLowerCase().includes(q)))
      .sort((a, b) => a.position - b.position || b.created_at.localeCompare(a.created_at));
  }, [phrases, query]);
  // While dragging, the list follows the finger; the new order is saved on release.
  const [drag, setDrag] = useState<{ id: string; order: string[] } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const byId = useMemo(() => new Map(phrases.map((p) => [p.id, p])), [phrases]);
  const unpaused = shown.filter((p) => p.priority !== "paused");
  const active = drag ? drag.order.map((id) => byId.get(id)!).filter(Boolean) : unpaused;
  const canDrag = !query.trim() && unpaused.length > 1;
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

  // One step: translate the lines and add them straight to the list (a wrong one can be deleted, with Undo).
  const add = () =>
    run(async () => {
      setAdded(null);
      const result = await translatePreview(text);
      if (result.error) throw new Error(result.error);
      addSpend(result.cost ?? 0);
      const saved = result.phrases.length ? await savePhrases(result.phrases) : [];
      setPhrases((list) => [...saved, ...list]);
      setAdded({ count: saved.length, failed: result.failed, cost: result.cost ?? 0 });
      // Keep the lines that didn't translate in the box, so they can be reworded.
      setText(result.failed.join("\n"));
    });

  const dragMove = (y: number) => {
    if (!drag || !listRef.current) return;
    if (y < 80) window.scrollBy(0, -12);
    else if (y > window.innerHeight - 80) window.scrollBy(0, 12);
    const rows = [...listRef.current.children] as HTMLElement[];
    const others = drag.order.filter((id) => id !== drag.id);
    let to = others.length;
    for (let i = 0, j = 0; i < rows.length; i++) {
      if (drag.order[i] === drag.id) continue;
      const r = rows[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        to = j;
        break;
      }
      j++;
    }
    const order = [...others.slice(0, to), drag.id, ...others.slice(to)];
    if (order.join() !== drag.order.join()) setDrag({ ...drag, order });
  };

  const dragEnd = () => {
    if (!drag) return;
    const { id, order } = drag;
    setDrag(null);
    const i = order.indexOf(id);
    const before = byId.get(order[i - 1]);
    const after = byId.get(order[i + 1]);
    const current = byId.get(id);
    if (!current || order.join() === unpaused.map((x) => x.id).join()) return;
    const position = before && after ? (before.position + after.position) / 2 : before ? before.position + 1 : after ? after.position - 1 : current.position;
    run(async () => {
      update(id, { position });
      await movePhrase(id, position);
    });
  };

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
      <div className="mt-2">
        <PhraseColourKey />
      </div>

      <section className="mt-4 rounded-xl border border-border bg-card p-4">
        <label htmlFor="new-phrase" className="text-sm font-medium">
          Something you say in your day
        </label>
        <p className="text-xs text-muted">English or Malay. Put each sentence on its own line to add several at once. To set the scene, start with who or where and a colon.</p>
        <textarea
          id="new-phrase"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={6000}
          placeholder={"I'm going to the office now.\nto my boss: can I leave early today?\nkat kedai: saya nak beli ini."}
          className="mt-2 w-full rounded-lg border border-border bg-background p-2 text-base"
        />
        {!canTranslate && <p className="mt-1 text-xs text-amber-600">Translation needs the Claude API key set in Vercel.</p>}
        <button
          type="button"
          disabled={pending || !text.trim() || !canTranslate}
          onClick={add}
          className="mt-2 w-full rounded-lg bg-accent py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add to my list"}
        </button>
        {added && added.count > 0 && (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">
            Added {added.count} {added.count === 1 ? "phrase" : "phrases"} in Japanese (AI cost {usd(added.cost)}). Tap one below to hear it, edit it or delete it.
          </p>
        )}
        {added && added.failed.length > 0 && (
          <p className="mt-1 text-xs text-amber-600">Couldn&apos;t translate {added.failed.length === 1 ? "this line" : "these lines"}, left in the box: reword and try again.</p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <p className="mt-3 border-t border-border pt-2 text-xs text-muted">
          AI spend: {usd(spend.month)} this month of {usd(spend.budget)} · {usd(spend.total)} in total
        </p>
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
      {canDrag && <p className="mt-4 text-xs text-muted">Hold ⠿ and drag to put your phrases in your own order. Playlist plays them in this order.</p>}
      <ul ref={listRef} className="mt-2 space-y-2">
        {active.map((p) => (
          <PhraseItem
            key={p.id}
            p={p}
            onOpen={() => setOpen(p)}
            dragging={drag?.id === p.id}
            handle={
              canDrag
                ? {
                    onPointerDown: (e) => {
                      e.preventDefault();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDrag({ id: p.id, order: unpaused.map((x) => x.id) });
                    },
                    onPointerMove: (e) => dragMove(e.clientY),
                    onPointerUp: dragEnd,
                    onPointerCancel: dragEnd,
                  }
                : null
            }
          />
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
              if ("error" in p) throw new Error(p.error);
              addSpend(p.cost);
              update(open.id, { source: p.source, source_lang: p.source_lang, meaning: p.meaning, jp: p.jp, reading: p.reading, kana: p.kana, words: p.words });
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

type Handle = Pick<React.DOMAttributes<HTMLButtonElement>, "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel">;

function PhraseItem({ p, onOpen, handle = null, dragging = false }: { p: PhraseRow; onOpen: () => void; handle?: Handle | null; dragging?: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl border bg-card p-3 ${dragging ? "relative z-10 border-accent shadow-lg" : "border-border"}`}>
      {handle && (
        <button type="button" aria-label="Drag to reorder" className="-ml-1 flex h-10 w-6 shrink-0 cursor-grab touch-none select-none items-center justify-center text-xl text-muted" {...handle}>
          ⠿
        </button>
      )}
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          {p.priority === "priority" && <span className="rounded bg-accent px-1.5 text-xs text-white">Priority</span>}
          {p.priority === "less" && <span className="rounded border border-border px-1.5 text-xs text-muted">Less often</span>}
        </div>
        <Japanese kana={p.kana} jp={p.jp} reading={p.reading} className="block text-lg" />
        <div className="truncate text-sm text-muted">{p.meaning}</div>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1">
            <MasteryBar score={mastery(p.right_count, p.wrong_count)} />
          </div>
          {Number(p.cost_usd) > 0 && <span className="text-[10px] text-muted">{usd(Number(p.cost_usd))}</span>}
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
            {Number(p.cost_usd) > 0 ? ` · AI cost ${usd(Number(p.cost_usd))}` : ""}
            {p.last_reviewed_at ? ` · last recalled ${new Date(p.last_reviewed_at).toLocaleDateString()}` : ""}
          </p>
        </div>

        {p.words.length > 0 && (
          <p className="mt-4 text-xs text-muted">
            Words from this phrase that are on the JLPT N5–N2 lists come first in Study everything.
          </p>
        )}

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
