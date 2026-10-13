import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { applyFilters, KIND_LABELS, parseFilters, TITLE_COLUMN } from "@/lib/content/admin";
import {
  CONTENT_KIND_NAMES,
  CONTENT_STATUSES,
  isContentKind,
  JLPT_LEVELS,
  nextStatuses,
  type ContentStatus,
} from "@/lib/content/schema";
import { updateStatus } from "../../actions";
import { ConfirmButton, SelectAll } from "./select-all";

const PAGE_SIZE = 50;

interface Row {
  id: string;
  slug: string;
  status: ContentStatus;
  jlpt_level: string;
  type?: string;
  tags?: string[];
  [key: string]: unknown;
}

export default async function ContentList({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { kind } = await params;
  if (!isContentKind(kind)) notFound();
  const sp = await searchParams;
  const filters = parseFilters(kind, (k) => sp[k]);
  const { status, level, q, tag } = filters;
  const page = Math.max(0, Number(sp.page ?? 0) || 0);

  const { supabase } = await requireAdmin();
  const titleCol = TITLE_COLUMN[kind];
  const query = applyFilters(supabase.from(kind).select("*", { count: "exact" }), kind, filters)
    .order("slug")
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  const { data, count, error } = await query.returns<Row[]>();
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const total = count ?? 0;

  const link = (patch: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams();
    const merged = { status, level, q, tag, page: undefined as number | undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") next.set(k, String(v));
    const s = next.toString();
    return `/admin/content/${kind}${s ? `?${s}` : ""}`;
  };

  return (
    <main>
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        {CONTENT_KIND_NAMES.map((k) => (
          <Link
            key={k}
            href={`/admin/content/${k}`}
            className={`rounded-full border px-3 py-1 ${k === kind ? "border-accent text-accent" : "border-border text-muted"}`}
          >
            {KIND_LABELS[k]}
          </Link>
        ))}
      </nav>

      <nav className="mb-3 flex gap-1 rounded-xl border border-border bg-card p-1 text-sm">
        {[...CONTENT_STATUSES, undefined].map((s) => (
          <Link
            key={s ?? "all"}
            href={link({ status: s })}
            className={`flex-1 rounded-lg px-2 py-1.5 text-center capitalize ${s === status ? "bg-accent text-white" : "text-muted"}`}
          >
            {s ?? "all"}
          </Link>
        ))}
      </nav>

      <form className="flex flex-wrap gap-2 text-sm" action={`/admin/content/${kind}`}>
        <input name="q" defaultValue={q} placeholder="Search slug or text" className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2" />
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-border bg-card px-2 py-2">
          <option value="">Any status</option>
          {CONTENT_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select name="level" defaultValue={level ?? ""} className="rounded-lg border border-border bg-card px-2 py-2">
          <option value="">Any level</option>
          {JLPT_LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        {kind === "items" && (
          <input name="tag" defaultValue={tag} placeholder="Tag" className="w-28 rounded-lg border border-border bg-card px-3 py-2" />
        )}
        <button className="rounded-lg border border-border px-3 py-2">Filter</button>
      </form>

      <p className="mt-3 text-sm text-muted">
        {total} {KIND_LABELS[kind].toLowerCase()}
        {status ? ` in ${status}` : ""}. {!status && "Pick Draft, Reviewed or Live above to move content in bulk."}
      </p>

      <form action={updateStatus} id="bulk" className="mt-3">
        <input type="hidden" name="kind" value={kind} />
        {status && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
            <input type="hidden" name="from" value={status} />
            {level && <input type="hidden" name="level" value={level} />}
            {tag && <input type="hidden" name="tag" value={tag} />}
            {q && <input type="hidden" name="q" value={q} />}
            <input name="notes" placeholder="Review note (optional)" className="w-full rounded-lg border border-border bg-background px-3 py-1.5" />
            {total > 0 &&
              nextStatuses(status).map((to) => (
                <ConfirmButton
                  key={`all-${to}`}
                  name="move"
                  value={`all:${to}`}
                  confirm={`Move all ${total} matching ${KIND_LABELS[kind].toLowerCase()} from ${status} to ${to}?`}
                  className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white"
                >
                  Move all {total} to {to}
                </ConfirmButton>
              ))}
            <span className="mx-1 text-muted">or</span>
            <SelectAll form="bulk" />
            {nextStatuses(status).map((to) => (
              <button key={to} name="move" value={`selected:${to}`} className="rounded-lg border border-border px-3 py-1.5">
                Move selected to {to}
              </button>
            ))}
          </div>
        )}

        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-3 p-3">
              {status && <input type="checkbox" name="id" value={row.id} className="mt-1.5 size-4" aria-label={`Select ${row.slug}`} />}
              <Link href={`/admin/content/${kind}/${row.slug}`} className="min-w-0 flex-1">
                <div className="truncate text-base">{String(row[titleCol] ?? "")}</div>
                <div className="truncate font-mono text-xs text-muted">
                  {row.slug} · {row.jlpt_level}
                  {row.type ? ` · ${row.type}` : ""}
                  {row.tags?.length ? ` · ${row.tags.join(", ")}` : ""}
                </div>
              </Link>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted">{row.status}</span>
            </li>
          ))}
          {rows.length === 0 && <li className="p-6 text-center text-sm text-muted">Nothing here yet.</li>}
        </ul>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        {page > 0 ? <Link href={link({ page: page - 1 })}>← Previous</Link> : <span />}
        {(page + 1) * PAGE_SIZE < total && <Link href={link({ page: page + 1 })}>Next →</Link>}
      </div>
    </main>
  );
}
