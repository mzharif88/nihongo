import { requireAdmin } from "@/lib/auth";
import { CONTENT_KIND_NAMES } from "@/lib/content/schema";

const PAGE = 1000;
const LEARNER_TABLES = ["profiles", "gamification", "user_items", "reviews", "mistakes"] as const;

/**
 * Full JSON backup: the admin's own learner data plus the whole content bank
 * and review log. Supabase Free has no managed backups, so download this weekly.
 */
export async function GET() {
  const { supabase, user } = await requireAdmin();

  async function all(table: string, ownerColumn?: string) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = supabase.from(table).select("*").range(from, from + PAGE - 1);
      if (ownerColumn) q = q.eq(ownerColumn, user.id);
      const { data, error } = await q;
      if (error) throw new Error(`${table}: ${error.message}`);
      rows.push(...data);
      if (data.length < PAGE) return rows;
    }
  }

  const learner: Record<string, unknown[]> = {};
  for (const t of LEARNER_TABLES) learner[t] = await all(t, t === "profiles" ? "id" : "user_id");
  const content: Record<string, unknown[]> = {};
  for (const t of [...CONTENT_KIND_NAMES, "content_reviews"]) content[t] = await all(t);

  const exportedAt = new Date().toISOString();
  const body = JSON.stringify({ app: "nihongo-jlpt", exported_at: exportedAt, user_id: user.id, learner, content }, null, 2);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="nihongo-jlpt-export-${exportedAt.slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
