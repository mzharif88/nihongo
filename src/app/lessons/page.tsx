import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { lessonStates, type LessonSummary } from "@/lib/lessons/lessons";

export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const { supabase, user } = await requireUser();
  const [{ data: lessons, error }, { data: progress, error: progressError }] = await Promise.all([
    // Admins can read drafts too, so filter to live explicitly.
    supabase
      .from("lessons")
      .select("id, slug, jlpt_level, position, title, situation")
      .eq("status", "live")
      .returns<LessonSummary[]>(),
    supabase.from("lesson_progress").select("lesson_id, checks_correct, checks_total").eq("user_id", user.id),
  ]);
  if (error) throw new Error(error.message);
  if (progressError) throw new Error(progressError.message);

  const scores = new Map((progress ?? []).map((p) => [p.lesson_id, p]));
  const course = lessonStates(lessons ?? [], new Set(scores.keys()));
  const levels = [...new Set(course.map((l) => l.jlpt_level))];

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <Link href="/" className="text-sm text-muted underline">
        ← Home
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Lessons</h1>
      <p className="mt-1 text-sm text-muted">
        One situation, one grammar point and a handful of words per lesson. Finishing one adds its words to your
        reviews.
      </p>

      {course.length === 0 && (
        <p className="mt-8 rounded-xl border border-border bg-card p-5 text-center text-muted">
          No lessons are live yet.
        </p>
      )}

      {levels.map((level) => (
        <section key={level} className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{level}</h2>
          <ol className="mt-2 space-y-2">
            {course
              .filter((l) => l.jlpt_level === level)
              .map((l) => {
                const score = scores.get(l.id);
                const body = (
                  <>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">
                        {l.position}. {l.title}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {l.state === "done" && score
                          ? `✓ ${score.checks_correct}/${score.checks_total}`
                          : l.state === "next"
                            ? "Next up"
                            : l.state === "locked"
                              ? "🔒"
                              : ""}
                      </span>
                    </div>
                    {l.situation && <div className="mt-0.5 text-sm text-muted">{l.situation}</div>}
                  </>
                );
                return (
                  <li key={l.id}>
                    {l.state === "locked" ? (
                      <div className="rounded-xl border border-border bg-card p-4 opacity-50">{body}</div>
                    ) : (
                      <Link
                        href={`/lessons/${l.slug}`}
                        className={`block rounded-xl border bg-card p-4 hover:border-accent ${
                          l.state === "next" ? "border-accent" : "border-border"
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
