import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { KIND_LABELS } from "@/lib/content/admin";
import { CONTENT_KIND_NAMES, CONTENT_STATUSES } from "@/lib/content/schema";

export default async function AdminOverview() {
  const { supabase } = await requireAdmin();
  const counts = await Promise.all(
    CONTENT_KIND_NAMES.map(async (kind) => {
      const byStatus = await Promise.all(
        CONTENT_STATUSES.map(async (status) => {
          const { count } = await supabase.from(kind).select("*", { count: "exact", head: true }).eq("status", status);
          return [status, count ?? 0] as const;
        }),
      );
      return { kind, byStatus: Object.fromEntries(byStatus) as Record<(typeof CONTENT_STATUSES)[number], number> };
    }),
  );

  return (
    <main>
      <h1 className="text-xl font-bold">Content bank</h1>
      <p className="mt-1 text-sm text-muted">
        Drafts go through review before learners see them: draft → reviewed → live.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="p-3 font-medium">Kind</th>
              {CONTENT_STATUSES.map((s) => (
                <th key={s} className="p-3 text-right font-medium capitalize">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {counts.map(({ kind, byStatus }) => (
              <tr key={kind} className="border-t border-border">
                <td className="p-3">
                  <Link href={`/admin/content/${kind}`} className="hover:text-accent">
                    {KIND_LABELS[kind]}
                  </Link>
                </td>
                {CONTENT_STATUSES.map((s) => (
                  <td key={s} className="p-3 text-right tabular-nums">
                    <Link href={`/admin/content/${kind}?status=${s}`} className="hover:text-accent">
                      {byStatus[s]}
                    </Link>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/admin/import" className="rounded-xl border border-border bg-card p-4 hover:border-accent">
          <div className="font-medium">Import JSON</div>
          <div className="text-sm text-muted">Drafts from Claude chat, or the old NihonGo! content packs.</div>
        </Link>
        <a href="/admin/export" className="rounded-xl border border-border bg-card p-4 hover:border-accent">
          <div className="font-medium">Download weekly export</div>
          <div className="text-sm text-muted">Your review history, SRS state and all content as JSON.</div>
        </a>
      </div>
    </main>
  );
}
