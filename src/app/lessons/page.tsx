import Link from "next/link";
import { KanjiScope } from "@/components/kanji-scope";
import { Ruby } from "@/components/ruby";
import { requireUser } from "@/lib/auth";
import { isSituation } from "@/lib/lessons/lessons";
import { loadLessonList } from "@/lib/lessons/lessons.server";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const { supabase, user } = await requireUser();
  const lessons = (await loadLessonList(supabase, user.id)).filter((l) => !isSituation(l.slug));
  const levels = [...new Set(lessons.map((l) => l.jlpt_level))];

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lessons</h1>
        <Link href="/" className="text-sm text-muted underline">
          Home
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Short situations with new words, one grammar point, a dialogue and quick checks. Finishing a lesson
        adds its words to your reviews and unlocks the next one.
      </p>

      <Link href="/situations" className="mt-4 block rounded-xl border border-border bg-card p-3 text-sm active:border-accent">
        <span className="font-medium">Everyday situations →</span>{" "}
        <span className="text-muted">trains, restaurants, shopping and the convenience store.</span>
      </Link>

      {lessons.length === 0 && <p className="mt-8 text-muted">No lessons are live yet.</p>}

      {levels.map((level) => (
        <section key={level} className="mt-6">
          <h2 className="mb-2 text-sm text-muted">{level}</h2>
          <ol className="space-y-2">
            {lessons
              .filter((l) => l.jlpt_level === level)
              .map((l) => {
                const body = (
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        l.state === "done"
                          ? "bg-green-600 text-white"
                          : l.state === "next"
                            ? "bg-accent text-white"
                            : "bg-border text-muted"
                      }`}
                    >
                      {l.state === "done" ? "✓" : l.state === "locked" ? "🔒" : l.position}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium leading-snug">
                        <KanjiScope level={l.jlpt_level}><Ruby text={l.title} /></KanjiScope>
                      </div>
                      <div className="text-xs text-muted">
                        {l.itemCount} words
                        {l.progress ? ` · best ${l.progress.score}/${l.progress.max_score}` : ""}
                        {l.state === "next" ? " · up next" : ""}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={l.id}>
                    {l.state === "locked" ? (
                      <div className="rounded-xl border border-border bg-card p-3 opacity-60">{body}</div>
                    ) : (
                      <Link
                        href={`/lessons/${l.slug}`}
                        className={`block rounded-xl border bg-card p-3 active:border-accent ${
                          l.state === "next" ? "border-2 border-accent" : "border-border"
                        }`}
                      >
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
          </ol>
        </section>
      ))}
    </main>
  );
}
