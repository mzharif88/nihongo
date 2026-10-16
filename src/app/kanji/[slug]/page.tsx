import Link from "next/link";
import { notFound } from "next/navigation";
import { Ruby } from "@/components/ruby";
import { requireUser } from "@/lib/auth";
import { groupBySlug } from "@/lib/kanji/groups";
import { loadGroupCards } from "@/lib/kanji/groups.server";
import { CompareQuiz } from "./quiz";

export const dynamic = "force-dynamic";

export default async function KanjiGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = groupBySlug(slug);
  if (!group) notFound();
  const { supabase, user } = await requireUser();
  const cards = await loadGroupCards(supabase, user.id, group);

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <Link href="/kanji" className="text-sm text-muted underline">
        ← Kanji side by side
      </Link>
      <h1 className="mt-2 text-2xl font-bold" lang="ja">
        {group.title}
      </h1>
      <p className="mt-1 text-xs text-muted">
        {group.kind === "lookalike" ? "Look-alikes" : "Sound family"} · {group.level}
      </p>
      <p className="mt-3 rounded-xl border-2 border-accent bg-card p-3 text-sm leading-relaxed">{group.difference}</p>

      <section className={`mt-4 grid gap-3 ${cards.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {cards.map((c) => (
          <div key={c.term} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-start justify-between">
              <span className="text-6xl leading-none" lang="ja">
                {c.term}
              </span>
              <span className="text-xs text-muted">
                {c.level ?? ""}
                {c.started ? " · ✓" : ""}
              </span>
            </div>
            <div className="mt-2 font-medium">{c.meaning}</div>
            {(c.on.length > 0 || c.kun.length > 0) && (
              <div className="mt-1 text-sm text-muted" lang="ja">
                {[c.on.length ? `音 ${c.on.slice(0, 2).join("・")}` : "", c.kun.length ? `訓 ${c.kun.slice(0, 2).join("・")}` : ""].filter(Boolean).join("　")}
              </div>
            )}
            {c.parts.length > 0 && (
              <div className="mt-2 text-xs text-muted" lang="ja">
                {c.parts.map((p) => `${p.term} ${p.meaning}`).join(" + ")}
              </div>
            )}
            {group.hints[c.term] && <div className="mt-2 text-sm">{group.hints[c.term]}</div>}
            {c.word && (
              <div className="mt-2 border-t border-border pt-2 text-sm">
                <span className="text-lg" lang="ja">
                  <Ruby text={c.word.term} reading={c.word.reading} />
                </span>{" "}
                <span className="text-muted">{c.word.meaning}</span>
              </div>
            )}
          </div>
        ))}
      </section>

      <CompareQuiz cards={cards.map((c) => ({ term: c.term, meaning: c.meaning }))} />
    </main>
  );
}
