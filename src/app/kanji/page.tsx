import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { KANJI_GROUPS, type KanjiGroup } from "@/lib/kanji/groups";
import { levelRank } from "@/lib/kanji-levels";

export const dynamic = "force-dynamic";

export default async function KanjiGroupsPage() {
  const { profile } = await requireUser();
  const max = levelRank(profile.target_level);
  const groups = KANJI_GROUPS.filter((g) => levelRank(g.level) <= max);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kanji side by side</h1>
        <Link href="/" className="text-sm text-muted underline">
          Home
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Kanji that look alike, and families that share a part and a reading. Compare them on one page, then quiz yourself on
        the difference. Up to {profile.target_level === "N1" ? "N2" : profile.target_level}.
      </p>
      <Section title="Look-alikes" blurb="Easy to mix up: one stroke or one part tells them apart." groups={groups.filter((g) => g.kind === "lookalike")} />
      <Section title="Sound families" blurb="Kanji sharing a part and a reading: the part hints at the sound." groups={groups.filter((g) => g.kind === "family")} />
    </main>
  );
}

function Section({ title, blurb, groups }: { title: string; blurb: string; groups: KanjiGroup[] }) {
  const levels = [...new Set(groups.map((g) => g.level))];
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted">{blurb}</p>
      {levels.map((level) => (
        <div key={level} className="mt-4">
          <h3 className="mb-2 text-sm text-muted">{level}</h3>
          <div className="grid grid-cols-2 gap-2">
            {groups
              .filter((g) => g.level === level)
              .map((g) => (
                <Link key={g.slug} href={`/kanji/${g.slug}`} className="rounded-xl border border-border bg-card p-3 active:border-accent">
                  <div className="text-2xl tracking-widest" lang="ja">
                    {g.kanji.join(" ")}
                  </div>
                  {g.kind === "family" && <div className="mt-1 text-xs text-muted" lang="ja">{g.title.split(": ")[1]}</div>}
                </Link>
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}
