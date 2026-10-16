import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { LEVELS, nextScene, SCENES, sceneDone, sceneOpen } from "@/lib/newcomer/listening";
import { loadListening } from "@/lib/newcomer/newcomer.server";
import { STARTER } from "@/lib/newcomer/starter";

export const dynamic = "force-dynamic";

export default async function ListeningPage() {
  const { supabase } = await requireUser();
  const progress = await loadListening(supabase);
  const next = nextScene(progress);
  const titles = new Map(STARTER.map((t) => [t.slug, t.title]));
  const topics = [...new Set(SCENES.map((s) => s.topic))];
  const done = SCENES.filter((s) => sceneDone(progress.get(s.slug))).length;

  return (
    <>
      <h1 className="text-2xl font-bold">Listen first</h1>
      <p className="mt-1 text-sm text-muted">
        Hear a short scene before you see any text, catch what you can, then read it. Lots of easy listening is how the sounds of
        Japanese become yours.
      </p>
      <p className="mt-1 text-xs text-muted">
        {done}/{SCENES.length} scenes done. A harder level opens once you catch the gist of the one below, or hear it three times.
      </p>

      {next && (
        <Link href={`/newcomer/listening/${next.slug}`} className="mt-4 block rounded-xl bg-accent p-4 text-white">
          <div className="text-xs opacity-90">Next up · {titles.get(next.topic) ?? next.topic} · {LEVELS[next.level]}</div>
          <div className="text-lg font-semibold">▶ {next.title}</div>
        </Link>
      )}

      {topics.map((topic) => (
        <section key={topic} className="mt-6">
          <h2 className="text-sm font-semibold text-muted">{titles.get(topic) ?? topic}</h2>
          <ul className="mt-2 space-y-2">
            {SCENES.filter((s) => s.topic === topic)
              .sort((a, b) => a.level - b.level)
              .map((s) => {
                const open = sceneOpen(s, progress);
                const p = progress.get(s.slug);
                const body = (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-muted">
                        Level {s.level} · {LEVELS[s.level]}
                      </div>
                      <div className="truncate font-medium">{s.title}</div>
                    </div>
                    <span className="shrink-0 text-sm text-muted">
                      {!open ? "🔒" : sceneDone(p) ? "✓" : p?.plays ? `heard ${p.plays}×` : ""}
                    </span>
                  </div>
                );
                return (
                  <li key={s.slug}>
                    {open ? (
                      <Link href={`/newcomer/listening/${s.slug}`} className="block rounded-xl border border-border bg-card p-3 active:border-accent">
                        {body}
                      </Link>
                    ) : (
                      <div className="rounded-xl border border-border p-3 opacity-60">{body}</div>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
      {SCENES.length === 0 && <p className="mt-6 text-sm text-muted">Scenes are on their way.</p>}
    </>
  );
}
