import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadPattern } from "@/lib/builder/builder.server";
import { BuilderPlayer } from "./player";

export const dynamic = "force-dynamic";

export default async function BuilderPatternPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await requireUser();
  const detail = await loadPattern(supabase, user.id, slug);
  if (!detail) notFound();
  return (
    <BuilderPlayer
      pattern={detail.pattern}
      grammar={detail.grammar}
      nextSlug={detail.nextSlug}
      firstRun={!detail.progress}
    />
  );
}
