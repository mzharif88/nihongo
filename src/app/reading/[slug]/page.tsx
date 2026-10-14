import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadReading } from "@/lib/reading/reading.server";
import { Reader } from "./reader";

export const dynamic = "force-dynamic";

export default async function ReadingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await requireUser();
  const loaded = await loadReading(supabase, user.id, slug);
  if (!loaded) notFound();
  return <Reader text={loaded.text} questions={loaded.questions} />;
}
