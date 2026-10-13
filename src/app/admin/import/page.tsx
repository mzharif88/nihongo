import { BUNDLED_PACKS } from "@/lib/content/packs";
import { BundledImportForm, JsonImportForm } from "./forms";

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
      <section>
        <h2 className="text-lg font-bold">Old NihonGo! content</h2>
        <p className="mt-1 text-sm text-muted">Ported from the legacy app. Import top to bottom.</p>
        <ul className="mt-3 space-y-2">
          {BUNDLED_PACKS.map((p) => (
            <li key={p.file} className="rounded-xl border border-border bg-card p-3">
              <BundledImportForm file={p.file} label={p.label} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
