import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dueCount, nightRecallOpen, overallMastery } from "@/lib/newcomer/recall";
import { loadMyPhrases, loadStarterProgress, mineAsRecall, openStage, starterRecall, starterTopics } from "@/lib/newcomer/newcomer.server";
import { STAGES } from "@/lib/newcomer/starter";
import { MasteryBar } from "./ui";

export const dynamic = "force-dynamic";

export default async function NewcomerPage() {
  const { supabase, profile } = await requireUser();
  const [mine, progress] = await Promise.all([loadMyPhrases(supabase), loadStarterProgress(supabase)]);
  const recall = mine.map(mineAsRecall);
  const due = dueCount(recall);
  const night = nightRecallOpen(new Date(), profile.timezone);

  return (
    <>
      <h1 className="text-2xl font-bold">Newcomer</h1>
      <p className="mt-1 text-sm text-muted">
        Speak the way children learn: whole sentences from your own day, heard again and again, said out loud, then recalled.
      </p>

      <Link href="/newcomer/recall" className={`mt-5 block rounded-xl p-5 text-white ${night ? "bg-indigo-700" : "bg-accent"}`}>
        <div className="text-lg font-semibold">{night ? "🌙 Night Recall" : "Active recall"}</div>
        <div className="text-sm opacity-90">
          {recall.length === 0 ? "Add a few of your own sentences first" : due ? `${due} of your phrases waiting` : "All caught up. Practise anyway?"}
        </div>
      </Link>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <Link href="/newcomer/phrases" className="rounded-xl border border-border bg-card p-4 active:border-accent">
          <div className="font-medium">My phrases</div>
          <div className="text-xs text-muted">{mine.length} saved</div>
          <div className="mt-2">
            <MasteryBar score={overallMastery(recall)} />
          </div>
        </Link>
        <Link href="/newcomer/playlist" className="rounded-xl border border-border bg-card p-4 active:border-accent">
          <div className="font-medium">Playlist</div>
          <div className="text-xs text-muted">Listen, pause, say it back</div>
        </Link>
      </section>

      <h2 className="mt-8 text-sm font-semibold text-muted">Starter topics</h2>
      <p className="text-xs text-muted">Everyday phrases that grow from single chunks to short stories as you get them right.</p>
      <ul className="mt-3 space-y-2">
        {starterTopics().map((t) => {
          const items = starterRecall(t, progress);
          const stage = openStage(t, progress);
          return (
            <li key={t.slug}>
              <Link href={`/newcomer/topics/${t.slug}`} className="block rounded-xl border border-border bg-card p-3 active:border-accent">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{t.title}</span>
                  <span className="text-xs text-muted">
                    {items.length}/{t.phrases.length} open · {STAGES[stage]}
                  </span>
                </div>
                <div className="mt-2">
                  <MasteryBar score={overallMastery(items)} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 text-xs text-muted">
        Play your phrases with the phone locked:{" "}
        <Link href="/newcomer/shortcut" className="underline">
          set up the Siri Shortcut
        </Link>
        .
      </p>
    </>
  );
}
