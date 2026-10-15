import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { MIXED_SLUG, PARTICLE_GROUPS } from "@/lib/particles/particles";
import { BestScore } from "./best-score";

export const dynamic = "force-dynamic";

export default async function ParticlesPage() {
  await requireUser();
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Particles</h1>
        <Link href="/" className="text-sm text-muted underline">
          Home
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Which particle goes with which word: 電車<b>に</b>乗る, 公園<b>で</b>遊ぶ, 道<b>を</b>渡る. Pick a particle to see how it&apos;s
        used, then fill in the blanks.
      </p>
      <Link
        href={`/particles/${MIXED_SLUG}`}
        className="mt-4 flex items-center justify-between rounded-xl border-2 border-accent bg-card p-4"
      >
        <div>
          <div className="font-bold">All particles mixed</div>
          <div className="text-xs text-muted">20 random cards from every group</div>
        </div>
        <BestScore slug={MIXED_SLUG} />
      </Link>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {PARTICLE_GROUPS.map((g) => (
          <Link key={g.slug} href={`/particles/${g.slug}`} className="rounded-xl border border-border bg-card p-4 active:border-accent">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold" lang="ja">
                {g.particle}
              </span>
              <span className="text-xs text-muted">
                {g.romaji} · {g.level}
              </span>
            </div>
            <div className="mt-1 text-xs leading-snug text-muted">{g.title}</div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-muted">{g.cards.length} cards</span>
              <BestScore slug={g.slug} />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
