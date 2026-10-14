import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { buildPapers } from "@/lib/mock/mock";
import { loadMock } from "@/lib/mock/mock.server";
import { MockPlayer } from "./player";

export const dynamic = "force-dynamic";

export default async function MockPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase } = await requireUser();
  const loaded = await loadMock(supabase, slug);
  if (!loaded) notFound();
  // Answers stay on the server: the player gets questions without them.
  const papers = buildPapers(loaded.mock.jlpt_level, loaded.questions).map((p) => ({
    ...p,
    questions: p.questions.map((q) => ({
      id: q.id,
      slug: q.slug,
      position: q.position,
      section: q.section,
      part: q.part,
      passage: q.passage,
      prompt: q.prompt,
      options: q.options,
    })),
  }));
  return <MockPlayer mock={loaded.mock} papers={papers} />;
}
