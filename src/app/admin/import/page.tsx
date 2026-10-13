import { PACK_GROUPS } from "@/lib/content/packs";
import { BundledImportForm, GroupImportForm, JsonImportForm } from "./forms";

export default function ImportPage() {
  return (
    <main className="space-y-8">
      <section>
        <h1 className="text-xl font-bold">Import JSON</h1>
        <p className="mt-1 text-sm text-muted">
          One file per content kind, in the format described in <code>docs/import-format.md</code>. Records are matched by
          slug; every imported record lands as a draft, including updates to live ones.
        </p>
        <JsonImportForm />
      </section>
      {PACK_GROUPS.map((group) => (
        <section key={group.id}>
          <h2 className="text-lg font-bold">{group.title}</h2>
          <p className="mt-1 text-sm text-muted">{group.description}</p>
          <GroupImportForm group={group.id} count={group.packs.length} />
          <ul className="mt-3 space-y-2">
            {group.packs.map((p) => (
              <li key={p.file} className="rounded-xl border border-border bg-card p-3">
                <BundledImportForm group={group.id} file={p.file} label={p.label} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
