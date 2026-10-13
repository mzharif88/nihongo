import type { Topic } from "@/lib/study/topics";
import { setStudyTopic } from "./topic-actions";

const GROUPS: Topic["group"][] = ["Scripts", "Kanji", "Words by level", "Words by topic"];

/** Home-page picker for where today's new items come from. */
export function TopicPicker({ topics, chosen, active }: { topics: Topic[]; chosen: string | null; active: Topic | null }) {
  const finished = chosen !== null && active === null;
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4">
      <h2 className="font-medium">Topic of the day</h2>
      <p className="mt-1 text-sm text-muted">New items come from this topic. Reviews of everything you’ve learned still show up.</p>
      <form action={setStudyTopic} className="mt-3 flex gap-2">
        <select
          name="topic"
          defaultValue={chosen ?? "auto"}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-base"
        >
          <option value="auto">Auto: follow the course order</option>
          {GROUPS.map((group) => {
            const inGroup = topics.filter((t) => t.group === group);
            if (inGroup.length === 0) return null;
            return (
              <optgroup key={group} label={group}>
                {inGroup.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.remaining === 0 && t.id !== chosen}>
                    {t.label} ({t.remaining === 0 ? "done" : `${t.remaining} new`})
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <button className="shrink-0 rounded-lg bg-accent px-4 py-2.5 font-medium text-white">Set</button>
      </form>
      {finished && (
        <p className="mt-2 text-sm text-muted">You’ve started everything in this topic. New items follow the course order until you pick another.</p>
      )}
    </section>
  );
}
