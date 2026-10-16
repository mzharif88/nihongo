import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadMyPhrases, loadStarterProgress, starterRecall, starterTopics } from "@/lib/newcomer/newcomer.server";
import { starterTopic } from "@/lib/newcomer/starter";
import { PlaylistClient, type Track } from "./playlist-client";

export const dynamic = "force-dynamic";

export default async function PlaylistPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic: slug } = await searchParams;
  const { supabase } = await requireUser();
  let title = "My phrases";
  let tracks: Track[];
  if (slug) {
    const topic = starterTopic(slug);
    if (!topic) notFound();
    title = topic.title;
    tracks = starterRecall(topic, await loadStarterProgress(supabase)).map((p) => ({
      jp: p.jp,
      kana: p.kana,
      reading: p.reading,
      meaning: p.meaning,
      meaningMs: p.meaningMs,
      lang: null,
    }));
  } else {
    // Paused phrases stay out; priority ones lead.
    const mine = (await loadMyPhrases(supabase)).filter((p) => p.priority !== "paused");
    mine.sort((a, b) => Number(b.priority === "priority") - Number(a.priority === "priority"));
    tracks = mine.map((p) => ({ jp: p.jp, kana: p.kana, reading: p.reading, meaning: p.meaning, meaningMs: null, lang: p.source_lang }));
  }

  return (
    <>
      <div className="mb-3 flex gap-1 overflow-x-auto text-xs">
        <Link href="/newcomer/playlist" className={`shrink-0 rounded-full border px-3 py-1 ${!slug ? "border-accent text-accent" : "border-border text-muted"}`}>
          My phrases
        </Link>
        {starterTopics().map((t) => (
          <Link
            key={t.slug}
            href={`/newcomer/playlist?topic=${t.slug}`}
            className={`shrink-0 rounded-full border px-3 py-1 ${slug === t.slug ? "border-accent text-accent" : "border-border text-muted"}`}
          >
            {t.title}
          </Link>
        ))}
      </div>
      <PlaylistClient key={slug ?? "mine"} title={title} tracks={tracks} starter={!!slug} />
    </>
  );
}
