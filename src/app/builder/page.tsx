import Link from "next/link";
import { KanjiScope } from "@/components/kanji-scope";
import { Ruby } from "@/components/ruby";
import { requireUser } from "@/lib/auth";
import { loadPatternList } from "@/lib/builder/builder.server";

export const dynamic = "force-dynamic";

export default async function BuilderPage() {
  const { supabase, user } = await requireUser();
  const patterns = await loadPatternList(supabase, user.id);
  const next = patterns.find((p) => !p.progress) ?? null;

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sentence builder</h1>
        <Link href="/" className="text-sm text-muted underline">
          Home
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Tap the tiles into the right order to make the Japanese sentence. Watch out for decoy tiles.
      </p>

      {patterns.length === 0 && <p className="mt-8 text-muted">No builder patterns are live yet.</p>}

      <ol className="mt-6 space-y-2">
        {patterns.map((p, i) => (
          <li key={p.id}>
            <Link
              href={`/builder/${p.slug}`}
              className={`flex items-center gap-3 rounded-xl border bg-card p-3 active:border-accent ${
                p === next ? "border-2 border-accent" : "border-border"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  p.progress
                    ? p.progress.best_score === p.progress.max_score
                      ? "bg-green-600 text-white"
                      : "bg-amber-500 text-white"
                    : p === next
                      ? "bg-accent text-white"
                      : "bg-border text-muted"
                }`}
              >
                {p.progress ? (p.progress.best_score === p.progress.max_score ? "✓" : p.progress.best_score) : i + 1}
              </span>
              <div className="min-w-0">
                <div className="font-medium leading-snug" lang="ja">
                  <KanjiScope level={p.jlpt_level}><Ruby text={p.title} /></KanjiScope>
                </div>
                <div className="text-xs text-muted">
                  {p.jlpt_level} · {p.exerciseCount} sentences
                  {p.progress ? ` · best ${p.progress.best_score}/${p.progress.max_score}` : ""}
                  {p === next ? " · up next" : ""}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
