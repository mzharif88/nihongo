import Link from "next/link";
import { Ruby } from "@/components/ruby";
import { requireUser } from "@/lib/auth";
import { loadCourse, unitHref } from "@/lib/course/course.server";
import type { Unit } from "@/lib/course/engine";
import { toMarkup, alignReading } from "@/lib/furigana";

export const dynamic = "force-dynamic";

export default async function CoursePage() {
  const { supabase, profile } = await requireUser();
  const course = await loadCourse(supabase, profile);
  const [next, ...later] = course.units;
  const current = course.levels.find((l) => l.started < l.total)?.level ?? null;

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your course</h1>
        <Link href="/" className="text-sm text-muted underline">
          Home
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Built from the words and kanji you haven&apos;t learned yet, level by level up to your target ({profile.target_level}
        {profile.target_level === "N1" ? "; the course covers up to N2 for now" : ""}). Each unit teaches a kanji, its parts and
        the words that use it, so new words are readable with kanji you&apos;ve just met. It re-plans after every unit.
      </p>

      <section className="mt-6 space-y-3">
        {course.levels.map((l) => (
          <div key={l.level}>
            <div className="flex items-baseline justify-between text-sm">
              <span className={l.level === current ? "font-bold" : ""}>
                {l.level}
                {l.level === current ? " · current" : ""}
              </span>
              <span className="text-xs text-muted">
                {l.learned} learned · {l.started}/{l.total} started
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-accent" style={{ width: `${l.total ? (l.started / l.total) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-3 text-sm text-muted">
        <p className="font-medium text-foreground">How it&apos;s adapting</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {course.adaptation.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
          {next?.refresh.length ? <li>Words you keep missing come back inside units that share their kanji.</li> : null}
        </ul>
      </section>

      {next ? (
        <section className="mt-6">
          <h2 className="text-sm text-muted">Next unit</h2>
          <UnitCard unit={next} highlight />
          <a
            href={unitHref(next)}
            className="mt-3 block rounded-xl bg-accent px-4 py-3.5 text-center text-lg font-medium text-white"
          >
            Start unit
          </a>
          {course.state.dueCount > 0 && (
            <p className="mt-2 text-center text-xs text-muted">
              {course.state.dueCount} reviews are due.{" "}
              <Link href="/study" className="underline">
                Do them first
              </Link>{" "}
              to lock in what you&apos;ve learned.
            </p>
          )}
        </section>
      ) : (
        <p className="mt-8 text-center text-muted">You&apos;ve started everything up to {profile.target_level}. Keep up your reviews!</p>
      )}

      {later.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm text-muted">Coming up</h2>
          <div className="mt-2 space-y-2">
            {later.map((u) => (
              <UnitCard key={u.key} unit={u} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function UnitCard({ unit, highlight = false }: { unit: Unit; highlight?: boolean }) {
  const kinds = { radical: "part", kanji: "kanji", word: "word", kana: "kana" } as Record<string, string>;
  return (
    <div className={`mt-2 rounded-xl border bg-card p-3 ${highlight ? "border-2 border-accent" : "border-border"}`}>
      <div className="font-bold" lang="ja">
        {unit.title}
      </div>
      <ul className="mt-2 flex flex-wrap gap-2" lang="ja">
        {unit.items.map((i) => (
          <li key={i.id} className="rounded-lg border border-border px-2 py-1 text-sm leading-loose" title={i.meaning}>
            <Ruby text={withReading(i)} />
            <span className="ml-1 text-xs text-muted">{highlight ? i.meaning.split(/[,;]/)[0] : kinds[i.type]}</span>
          </li>
        ))}
      </ul>
      {unit.refresh.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          Plus a refresh of: <span lang="ja">{unit.refresh.map((i) => i.term).join("、")}</span>
        </p>
      )}
    </div>
  );
}

/** A word with furigana from its reading; kanji items show the character alone. */
function withReading(i: Unit["items"][number]): string {
  return i.type === "word" && "reading" in i && typeof i.reading === "string" ? toMarkup(alignReading(i.term, i.reading)) : i.term;
}
