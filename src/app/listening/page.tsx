import Link from "next/link";
import { Ruby } from "@/components/ruby";
import { requireUser } from "@/lib/auth";
import { loadReadingList } from "@/lib/reading/reading.server";

export const dynamic = "force-dynamic";

export default async function ListeningListPage() {
  const { supabase, user } = await requireUser();
  const sets = await loadReadingList(supabase, user.id, "listening");
  const levels = [...new Set(sets.map((s) => s.jlpt_level))];

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Listening</h1>
        <Link href="/" className="text-sm text-muted underline">
          Home
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Drills in the JLPT listening format, one part per set. Turn your sound on: listen, answer, then read the script with
        furigana.
      </p>
      {sets.length === 0 && <p className="mt-8 text-muted">No listening drills are live yet.</p>}
      {levels.map((level) => (
        <section key={level} className="mt-6">
          <h2 className="mb-2 text-sm text-muted">{level}</h2>
          <ol className="space-y-2">
            {sets
              .filter((s) => s.jlpt_level === level)
              .map((t) => {
                const perfect = t.progress && t.progress.best_score === t.progress.max_score;
                return (
                  <li key={t.id}>
                    <Link href={`/listening/${t.slug}`} className="block rounded-xl border border-border bg-card p-3 active:border-accent">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium leading-loose" lang="ja">
                          <Ruby text={t.title} />
                        </span>
                        {t.progress && (
                          <span className={`shrink-0 text-sm ${perfect ? "text-green-700 dark:text-green-400" : "text-muted"}`}>
                            {perfect ? "✓ " : ""}
                            {t.progress.best_score}/{t.progress.max_score}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">{t.questionCount} questions</div>
                    </Link>
                  </li>
                );
              })}
          </ol>
        </section>
      ))}
    </main>
  );
}
