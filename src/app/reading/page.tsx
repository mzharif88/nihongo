import Link from "next/link";
import { KanjiScope } from "@/components/kanji-scope";
import { Ruby } from "@/components/ruby";
import { requireUser } from "@/lib/auth";
import { loadReadingList } from "@/lib/reading/reading.server";

export const dynamic = "force-dynamic";

export default async function ReadingListPage() {
  const { supabase, user } = await requireUser();
  const texts = await loadReadingList(supabase, user.id);

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reading</h1>
        <Link href="/" className="text-sm text-muted underline">
          Home
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Short graded passages with furigana you can switch off. Tap a sentence to hear it, then answer the questions.
      </p>
      {texts.length === 0 && <p className="mt-8 text-muted">No passages are live yet.</p>}
      <ol className="mt-6 space-y-2">
        {texts.map((t) => {
          const perfect = t.progress && t.progress.best_score === t.progress.max_score;
          return (
            <li key={t.id}>
              <Link href={`/reading/${t.slug}`} className="block rounded-xl border border-border bg-card p-3 active:border-accent">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium leading-loose" lang="ja">
                    <KanjiScope level={t.jlpt_level}><Ruby text={t.title} /></KanjiScope>
                  </span>
                  {t.progress && (
                    <span className={`shrink-0 text-sm ${perfect ? "text-green-700 dark:text-green-400" : "text-muted"}`}>
                      {perfect ? "✓ " : ""}
                      {t.progress.best_score}/{t.progress.max_score}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  {t.jlpt_level} · {t.questionCount} questions
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
