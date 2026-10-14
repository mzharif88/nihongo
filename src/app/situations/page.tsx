import Link from "next/link";
import { KanjiScope } from "@/components/kanji-scope";
import { Ruby } from "@/components/ruby";
import { requireUser } from "@/lib/auth";
import { SITUATION_GROUPS, situationGroup } from "@/lib/lessons/lessons";
import { loadLessonList } from "@/lib/lessons/lessons.server";

export const dynamic = "force-dynamic";

export default async function SituationsPage() {
  const { supabase, user } = await requireUser();
  const lessons = await loadLessonList(supabase, user.id);

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Everyday situations</h1>
        <Link href="/" className="text-sm text-muted underline">
          Home
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Real scenes in Japan: read the signs and menus, understand what staff say, and pick the right reply. Each
        one has key phrases, a dialogue and a quiz. Do them in any order.
      </p>

      {SITUATION_GROUPS.map((group) => {
        const inGroup = lessons.filter((l) => situationGroup(l.slug) === group.id);
        if (!inGroup.length) return null;
        const done = inGroup.filter((l) => l.state === "done").length;
        return (
          <section key={group.id} className="mt-6">
            <h2 className="flex items-baseline justify-between">
              <span className="font-bold">
                {group.title} <span className="font-normal text-muted" lang="ja">· <KanjiScope level={"N5"}><Ruby text={group.jp} /></KanjiScope></span>
              </span>
              <span className="text-xs text-muted">
                {done}/{inGroup.length} done
              </span>
            </h2>
            <p className="text-xs text-muted">{group.blurb}</p>
            <ol className="mt-2 space-y-2">
              {inGroup.map((l, i) => (
                <li key={l.id}>
                  <Link
                    href={`/lessons/${l.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 active:border-accent"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        l.state === "done" ? "bg-green-600 text-white" : "bg-border text-muted"
                      }`}
                    >
                      {l.state === "done" ? "✓" : i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium leading-snug">
                        <KanjiScope level={l.jlpt_level}><Ruby text={l.title} /></KanjiScope>
                      </div>
                      <div className="text-xs text-muted">
                        {l.itemCount} words
                        {l.progress ? ` · best ${l.progress.score}/${l.progress.max_score}` : ""}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </main>
  );
}
