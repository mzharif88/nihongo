import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { mastery, overallMastery } from "@/lib/newcomer/recall";
import { loadStarterProgress, openStage, starterRecall } from "@/lib/newcomer/newcomer.server";
import { STAGES, starterTopic } from "@/lib/newcomer/starter";
import { Japanese, MasteryBar, MeaningToggle, PlayButton, ScriptToggle } from "../../ui";
import { TopicMeaning } from "./topic-meaning";

export const dynamic = "force-dynamic";

export default async function StarterTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = starterTopic(slug);
  if (!topic) notFound();
  const { supabase } = await requireUser();
  const progress = await loadStarterProgress(supabase);
  const stage = openStage(topic, progress);
  const open = starterRecall(topic, progress);
  const stages = [...new Set(topic.phrases.map((p) => p.stage))].sort((a, b) => a - b);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{topic.title}</h1>
        <span className="flex gap-2">
          <MeaningToggle />
          <ScriptToggle />
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">{topic.description}</p>
      <div className="mt-3">
        <MasteryBar score={overallMastery(open)} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href={`/newcomer/recall?topic=${slug}`} className="rounded-xl bg-accent py-3 text-center font-semibold text-white">
          Recall
        </Link>
        <Link href={`/newcomer/playlist?topic=${slug}`} className="rounded-xl border border-border py-3 text-center font-semibold">
          ▶ Playlist
        </Link>
      </div>

      {stages.map((s) => {
        const phrases = topic.phrases.filter((p) => p.stage === s);
        const locked = s > stage;
        return (
          <section key={s} className="mt-6">
            <h2 className="text-sm font-semibold text-muted">
              {s}. {STAGES[s]} {locked && "🔒"}
            </h2>
            {locked ? (
              <p className="mt-1 text-xs text-muted">Opens when you get 70% of the phrases above right in recall.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {phrases.map((p) => {
                  const r = progress.get(p.slug);
                  return (
                    <li key={p.slug} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                      <div className="min-w-0 flex-1">
                        <Japanese kana={p.kana} jp={p.jp} reading={p.reading} className="block text-lg" />
                        <TopicMeaning en={p.en} ms={p.ms} />
                        <div className="mt-1">
                          <MasteryBar score={r ? mastery(r.right_count, r.wrong_count) : null} />
                        </div>
                      </div>
                      <PlayButton text={p.jp} />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </>
  );
}
