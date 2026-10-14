import Link from "next/link";
import { notFound } from "next/navigation";
import { ExamText } from "@/components/exam-text";
import { requireUser } from "@/lib/auth";
import { examOrder, type Answers, type MockResult } from "@/lib/mock/mock";
import { loadAttempt } from "@/lib/mock/mock.server";

export const dynamic = "force-dynamic";

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const loaded = /^\d+$/.test(id) ? await loadAttempt(supabase, user.id, Number(id)) : null;
  if (!loaded) notFound();
  const { attempt, mock, questions } = loaded;
  const result = attempt.result as MockResult & { mode?: string; added?: number };
  const answers = attempt.answers as Answers;
  const prediction = result.prediction;

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <Link href="/mock" className="text-sm text-muted underline">
          ← Mock tests
        </Link>
        <span className="text-xs text-muted">
          {new Date(attempt.finished_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          {result.mode === "practice" ? " · practice" : " · exam conditions"}
        </span>
      </header>
      <h1 className="mt-3 text-2xl font-bold">{mock.title}</h1>

      {prediction ? (
        <section
          className={`mt-4 rounded-xl border-2 p-4 ${
            prediction.passed ? "border-green-600 bg-green-50 dark:bg-green-950" : "border-red-600 bg-red-50 dark:bg-red-950"
          }`}
        >
          <p className="text-sm">Predicted score</p>
          <p className="text-3xl font-bold">
            {prediction.total}
            <span className="text-lg font-normal text-muted">/{prediction.maxTotal}</span>
          </p>
          <p className="font-medium">
            {prediction.passed ? "Pass" : "Not a pass yet"} · pass line {prediction.passTotal}
          </p>
          <ul className="mt-3 space-y-2">
            {prediction.sections.map((s) => (
              <li key={s.label}>
                <div className="flex justify-between text-sm">
                  <span>{s.label}</span>
                  <span className={s.passed ? "" : "font-bold text-red-600 dark:text-red-400"}>
                    {s.score}/{s.max} (min {s.min})
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                  <div className={`h-full ${s.passed ? "bg-green-600" : "bg-red-600"}`} style={{ width: `${(s.score / s.max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            A rough guide: right answers scaled to each section&apos;s points. The real exam weights questions differently.
          </p>
        </section>
      ) : (
        <p className="mt-4 text-lg">
          {attempt.correct}/{attempt.total} right
        </p>
      )}

      <section className="mt-6">
        <h2 className="font-bold">By part</h2>
        <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">
          {result.parts.map((p) => {
            const pct = Math.round((p.correct / p.total) * 100);
            return (
              <li key={p.part} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span lang="ja">{p.part}</span>
                <span className={`shrink-0 tabular-nums ${pct < 60 ? "font-bold text-red-600 dark:text-red-400" : ""}`}>
                  {p.correct}/{p.total}
                </span>
              </li>
            );
          })}
        </ul>
        {(result.added ?? 0) > 0 && (
          <p className="mt-2 text-sm">
            {result.added} words from your misses are now in your reviews.{" "}
            <Link href="/study" className="underline">
              Review them
            </Link>
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-bold">Review</h2>
        <ol className="mt-2 space-y-3">
          {examOrder(questions).map((q, i) => {
            const given = answers[q.id];
            const ok = given === q.answer;
            return (
              <li
                key={q.id}
                className={`rounded-xl border p-3 ${ok ? "border-border bg-card" : "border-red-600 bg-red-50 dark:bg-red-950"}`}
              >
                <p className="text-xs text-muted" lang="ja">
                  {i + 1}. {q.part}
                </p>
                {q.passage && (
                  <details className="mt-1" open={q.section === "listening" && !ok}>
                    <summary className="cursor-pointer text-sm text-muted">
                      {q.section === "listening" ? "Script" : "Passage"}
                    </summary>
                    <p className="mt-1 leading-loose" lang="ja">
                      <ExamText text={q.passage} furigana />
                    </p>
                  </details>
                )}
                <p className="mt-1 leading-loose" lang="ja">
                  <ExamText text={q.prompt} furigana />
                </p>
                <ul className="mt-1 space-y-0.5 text-sm" lang="ja">
                  {q.options.map((o, j) => (
                    <li
                      key={j}
                      className={
                        j === q.answer ? "font-bold text-green-700 dark:text-green-400" : j === given ? "text-red-600 line-through dark:text-red-400" : "text-muted"
                      }
                    >
                      {j === q.answer ? "✓ " : j === given ? "✗ " : "　"}
                      <ExamText text={o} furigana />
                    </li>
                  ))}
                </ul>
                {given === null || given === undefined ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">Left blank</p> : null}
                {q.explanation && (
                  <p className="mt-2 text-sm leading-loose">
                    <ExamText text={q.explanation} furigana />
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
