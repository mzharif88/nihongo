import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadMockList } from "@/lib/mock/mock.server";

export const dynamic = "force-dynamic";

export default async function MockListPage() {
  const { supabase, user } = await requireUser();
  const all = await loadMockList(supabase, user.id);
  // Full mocks in exam format first; the old app's 10-question quizzes after.
  const mocks = all.filter((m) => !m.slug.startsWith("mock-legacy-"));
  const quizzes = all.filter((m) => m.slug.startsWith("mock-legacy-"));

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mock tests</h1>
        <Link href="/" className="text-sm text-muted underline">
          Home
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Real JLPT order and timing per paper, with a predicted score against the pass lines. Every miss goes into your
        reviews.
      </p>

      {mocks.length === 0 && <p className="mt-8 text-muted">No mock tests are live yet.</p>}

      <MockList mocks={mocks} />
      {quizzes.length > 0 && (
        <>
          <h2 className="mt-10 font-bold">Quick quizzes</h2>
          <p className="text-sm text-muted">Short 10-question sets from the old app. Not in exam format.</p>
          <MockList mocks={quizzes} />
        </>
      )}
    </main>
  );
}

function MockList({ mocks }: { mocks: Awaited<ReturnType<typeof loadMockList>> }) {
  return (
      <ul className="mt-6 space-y-3">
        {mocks.map((m) => {
          const last = m.attempts[0];
          const prediction = last?.result?.prediction;
          // Consecutive passes, newest first: the goal is three in a row.
          let streak = 0;
          for (const a of m.attempts.filter((x) => x.result?.mode !== "practice")) {
            if (!a.passed) break;
            streak++;
          }
          return (
            <li key={m.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-bold">{m.title}</h2>
                <span className="text-xs text-muted">
                  {m.jlpt_level} · {m.questionCount} questions · {m.time_limit_min} min
                </span>
              </div>
              {last ? (
                <p className="mt-1 text-sm">
                  Last:{" "}
                  {prediction ? (
                    <>
                      <span className={last.passed ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                        {prediction.total}/{prediction.maxTotal} · {last.passed ? "pass" : "not yet"}
                      </span>{" "}
                    </>
                  ) : null}
                  ({last.correct}/{last.total} right) ·{" "}
                  <Link href={`/mock/attempts/${last.id}`} className="underline">
                    review
                  </Link>
                  {streak > 0 && <span className="text-muted"> · {streak} pass{streak > 1 ? "es" : ""} in a row</span>}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted">Not taken yet</p>
              )}
              <Link
                href={`/mock/${m.slug}`}
                className="mt-3 block rounded-lg bg-accent px-4 py-2.5 text-center font-medium text-white"
              >
                {last ? "Take again" : "Start"}
              </Link>
            </li>
          );
        })}
      </ul>
  );
}
