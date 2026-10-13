import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { KIND_LABELS, SYSTEM_COLUMNS } from "@/lib/content/admin";
import { isContentKind, nextStatuses, type ContentStatus } from "@/lib/content/schema";
import { updateStatus } from "../../../actions";
import { RecordEditor } from "./editor";

export default async function ContentRecord({ params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params;
  if (!isContentKind(kind)) notFound();
  const { supabase } = await requireAdmin();

  const { data: row } = await supabase.from(kind).select("*").eq("slug", slug).maybeSingle();
  if (!row) notFound();
  const { data: history } = await supabase
    .from("content_reviews")
    .select("id, from_status, to_status, notes, created_at")
    .eq("content_table", kind)
    .eq("content_id", row.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const editable = Object.fromEntries(Object.entries(row).filter(([k]) => !SYSTEM_COLUMNS.includes(k)));
  const status = row.status as ContentStatus;

  return (
    <main className="space-y-6">
      <div>
        <Link href={`/admin/content/${kind}`} className="text-sm text-muted">
          ← {KIND_LABELS[kind]}
        </Link>
        <h1 className="mt-1 font-mono text-lg break-all">{slug}</h1>
        <p className="text-sm text-muted">
          Status <strong>{status}</strong> · source {row.source ?? "—"} · updated{" "}
          {new Date(row.updated_at).toLocaleString()}
        </p>
      </div>

      <form action={updateStatus} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="from" value={status} />
        <input type="hidden" name="id" value={row.id} />
        <input name="notes" placeholder="Review note (optional)" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5" />
        {nextStatuses(status).map((to) => (
          <button key={to} name="to" value={to} className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white">
            Move to {to}
          </button>
        ))}
      </form>

      <RecordEditor kind={kind} id={row.id} slug={slug} initial={JSON.stringify(editable, null, 2)} />

      {history && history.length > 0 && (
        <section>
          <h2 className="font-medium">History</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {history.map((h) => (
              <li key={h.id}>
                {new Date(h.created_at).toLocaleString()}: {h.from_status ?? "new"} → {h.to_status}
                {h.notes ? ` (${h.notes})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
