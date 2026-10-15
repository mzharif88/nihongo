import Link from "next/link";
import { notFound } from "next/navigation";
import { Ruby } from "@/components/ruby";
import { requireUser } from "@/lib/auth";
import { particleGroup } from "@/lib/particles/particles";
import { ParticleQuiz } from "./quiz";

export const dynamic = "force-dynamic";

export default async function ParticleGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const group = particleGroup(slug);
  if (!group) notFound();
  await requireUser();

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <Link href="/particles" className="text-sm text-muted underline">
        ← Particles
      </Link>
      <h1 className="mt-2 flex items-baseline gap-3">
        <span className="text-4xl font-bold" lang="ja">
          {group.particle}
        </span>
        <span className="text-lg font-medium">{group.title}</span>
      </h1>

      {group.uses.length > 0 && (
        <section className="mt-4 space-y-2">
          {group.uses.map((u) => (
            <div key={u.label} className="rounded-xl border border-border bg-card p-3">
              <div className="font-medium">{u.label}</div>
              <div className="text-sm text-muted">{u.note}</div>
              <div className="mt-1 text-lg leading-loose" lang="ja">
                <Ruby text={u.example} />
              </div>
            </div>
          ))}
        </section>
      )}

      <ParticleQuiz slug={group.slug} cards={group.cards} limit={group.slug === "mixed" ? 20 : undefined} />
    </main>
  );
}
