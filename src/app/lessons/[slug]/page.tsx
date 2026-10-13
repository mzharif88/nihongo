import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { lessonStates, type LessonRow, type LessonSummary } from "@/lib/lessons/lessons";
import { LessonPlayer, type LessonItem } from "./player";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await requireUser();

  const [{ data: lesson }, { data: all }, { data: progress }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, slug, jlpt_level, position, title, situation, item_slugs, grammar_slug, dialogue, checks, notes")
      .eq("slug", slug)
      .eq("status", "live")
      .maybeSingle<LessonRow>(),
    supabase
      .from("lessons")
      .select("id, slug, jlpt_level, position, title, situation")
      .eq("status", "live")
      .returns<LessonSummary[]>(),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id),
  ]);
  if (!lesson) notFound();

  const course = lessonStates(all ?? [], new Set((progress ?? []).map((p) => p.lesson_id)));
  const index = course.findIndex((l) => l.id === lesson.id);
  if (course[index]?.state === "locked") notFound();
  // Finishing this lesson unlocks the next one, so the player links it either way.
  const next = course[index + 1];

  const slugs = [...lesson.item_slugs, ...(lesson.grammar_slug ? [lesson.grammar_slug] : [])];
  const { data: items } = slugs.length
    ? await supabase
        .from("items")
        .select("slug, type, term, reading, romaji, meaning, mnemonic, examples, audio_url")
        .eq("status", "live")
        .in("slug", slugs)
        .returns<LessonItem[]>()
    : { data: [] as LessonItem[] };
  const bySlug = new Map((items ?? []).map((i) => [i.slug, i]));

  return (
    <LessonPlayer
      lesson={lesson}
      words={lesson.item_slugs.flatMap((s) => bySlug.get(s) ?? [])}
      grammar={lesson.grammar_slug ? (bySlug.get(lesson.grammar_slug) ?? null) : null}
      nextSlug={next?.slug ?? null}
    />
  );
}
