import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { nextScene, scene, sceneOpen } from "@/lib/newcomer/listening";
import { loadListening } from "@/lib/newcomer/newcomer.server";
import { SceneClient } from "./scene-client";

export const dynamic = "force-dynamic";

export default async function ScenePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = scene(slug);
  if (!s) notFound();
  const { supabase } = await requireUser();
  const progress = await loadListening(supabase);
  if (!sceneOpen(s, progress)) redirect("/newcomer/listening");
  // Suggest what comes after this one, counting this scene as done.
  const after = nextScene(new Map([...progress, [s.slug, { plays: 99, gist_correct: true }]]));
  return <SceneClient scene={s} nextSlug={after?.slug ?? null} />;
}
