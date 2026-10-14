import Link from "next/link";
import { StudySession } from "@/app/study/session";
import { requireUser } from "@/lib/auth";
import { loadCourse, loadSentences } from "@/lib/course/course.server";
import { unitCards } from "@/lib/course/unit";
import { loadKanjiStage } from "@/lib/study/kanji-stage.server";

export const dynamic = "force-dynamic";

const slugs = (s?: string) => (s ? s.split(",").filter((x) => /^[a-z0-9][a-z0-9-]*$/.test(x)).slice(0, 20) : []);

export default async function UnitPage({ searchParams }: { searchParams: Promise<{ i?: string; r?: string }> }) {
  const { i, r } = await searchParams;
  const { supabase, profile } = await requireUser();
  const [course, kanji] = await Promise.all([loadCourse(supabase, profile), loadKanjiStage(supabase, profile.id)]);
  const bySlug = new Map(course.items.map((x) => [x.slug, x]));
  // New items must still be unstarted, refreshers already started: a stale link just teaches what's left.
  const items = slugs(i).flatMap((s) => bySlug.get(s) ?? []).filter((x) => !course.state.started.has(x.id));
  const refresh = slugs(r).flatMap((s) => bySlug.get(s) ?? []).filter((x) => course.state.started.has(x.id));

  if (!items.length && !refresh.length) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <div className="text-5xl">✓</div>
        <h1 className="mt-4 text-2xl font-bold">This unit is done</h1>
        <a href="/course/next" className="mt-8 rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
          Next unit
        </a>
        <Link href="/course" className="mt-3 text-sm text-muted underline">
          Your course
        </Link>
      </main>
    );
  }

  const corpus = await loadSentences(supabase, course.items);
  const pool = course.items.filter((x) => x.type === "word" || x.type === "kanji" || x.type === "kana" || x.type === "radical");
  const title = course.units.find((u) => u.items.some((x) => x.id === items[0]?.id))?.title ?? "Course unit";
  return (
    <StudySession
      title={title}
      cards={unitCards(items, refresh, pool, corpus)}
      keepGoingHref="/course/next"
      source="course"
      kanji={kanji}
      doneLink={{ href: "/course", label: "Your course" }}
    />
  );
}
