import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { checkpoints, READINESS_LEVELS, type ReadinessLevel } from "@/lib/readiness/readiness";
import { loadReadiness } from "@/lib/readiness/readiness.server";
import { localDate } from "@/lib/study/streak";

export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function ReadinessPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level: asked } = await searchParams;
  const { supabase, profile } = await requireUser();
  const all = await loadReadiness(supabase, profile.id);
  const current = all.find((r) => !r.ready) ?? all[all.length - 1];
  const r = all.find((x) => x.level === asked) ?? current;
  const today = localDate(new Date(), profile.timezone);
  const plan = checkpoints(today, profile.exam_date, profile.target_level, Object.fromEntries(all.map((x) => [x.level, x.ready])));
  const due = plan.find((p) => p.level === r.level);

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Exam readiness</h1>
        <Link href="/" className="text-sm text-muted underline">
          Home
        </Link>
      </header>

      <nav className="mt-4 flex gap-2">
        {READINESS_LEVELS.map((l: ReadinessLevel) => {
          const x = all.find((y) => y.level === l)!;
          return (
            <Link
              key={l}
              href={`/readiness?level=${l}`}
              className={`flex-1 rounded-lg border px-2 py-2 text-center text-sm ${l === r.level ? "border-accent bg-accent text-white" : "border-border"}`}
            >
              <div className="font-semibold">{l}</div>
              <div className="text-xs opacity-80">{x.ready ? "ready ✓" : `${x.percent}%`}</div>
            </Link>
          );
        })}
      </nav>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 text-center">
        <div className="text-5xl font-bold">{r.percent}%</div>
        <div className="mt-1 text-sm text-muted">
          {r.ready ? `Ready for ${r.level}: every area meets its target.` : `of the way to ${r.level}`}
        </div>
        {due && !r.ready && <div className="mt-2 text-xs text-muted">Aim to be ready by {fmt(due.date)} to stay on course for {profile.target_level}.</div>}
      </section>

      {r.focus && (
        <Link href={r.focus.href} className="mt-3 block rounded-xl bg-accent p-4 text-white">
          <div className="text-xs opacity-90">Do this next · {r.focus.label}</div>
          <div className="text-lg font-semibold">{r.focus.next} →</div>
        </Link>
      )}

      <ul className="mt-6 space-y-3">
        {r.areas.map((a) => (
          <li key={a.id}>
            <Link href={a.href} className="block rounded-xl border border-border bg-card p-3 active:border-accent">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">
                  {a.met ? "✓ " : ""}
                  {a.label}
                </span>
                <span className="text-xs text-muted">{Math.round(a.progress * 100)}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                <div className={`h-full ${a.met ? "bg-green-600" : "bg-accent"}`} style={{ width: `${Math.max(a.progress * 100, 2)}%` }} />
              </div>
              <div className="mt-1 text-xs text-muted">{a.detail}</div>
              <div className="text-xs text-muted">Target: {a.target}</div>
            </Link>
          </li>
        ))}
      </ul>

      {plan.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-muted">Checkpoints to {profile.target_level}</h2>
          <p className="text-xs text-muted">
            The time to your exam date ({fmt(profile.exam_date!)}), shared out by how much each level asks. A guide, not a deadline.
          </p>
          <ol className="mt-2 space-y-1 text-sm">
            {plan.map((p) => (
              <li key={p.level} className="flex justify-between rounded-lg border border-border px-3 py-2">
                <span>{p.level} ready</span>
                <span className="text-muted">by {fmt(p.date)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      <p className="mt-6 text-xs text-muted">
        Known means a word or kanji you&apos;ve reviewed into long-term memory. Mock scores count only in exam mode.
      </p>
    </main>
  );
}
