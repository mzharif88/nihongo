import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadReading } from "@/lib/reading/reading.server";
import { KanjiScope } from "@/components/kanji-scope";
import { Listener } from "./listener";

export const dynamic = "force-dynamic";

export default async function ListeningPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await requireUser();
  const loaded = await loadReading(supabase, user.id, slug, "listening");
  if (!loaded) notFound();
  return (
    <KanjiScope level={loaded.text.jlpt_level}>
      <Listener text={loaded.text} questions={loaded.questions} />
    </KanjiScope>
  );
}
