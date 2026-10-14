import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadLesson } from "@/lib/lessons/lessons.server";
import { KanjiScope } from "@/components/kanji-scope";
import { LessonPlayer } from "./player";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await requireUser();
  const detail = await loadLesson(supabase, user.id, slug);
  if (!detail) notFound();

  if (detail.summary.state === "locked") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-bold">Not unlocked yet</h1>
        <p className="mt-2 text-muted">Finish the lessons before this one first.</p>
        <Link href="/lessons" className="mt-8 rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
          Back to lessons
        </Link>
      </main>
    );
  }

  return (
    <KanjiScope level={detail.lesson.jlpt_level}>
      <LessonPlayer lesson={detail.lesson} items={detail.items} grammar={detail.grammar} replay={!!detail.summary.progress} />
    </KanjiScope>
  );
}
