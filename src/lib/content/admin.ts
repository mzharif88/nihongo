import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentKind, ContentStatus, ParsedImport } from "./schema";

export const KIND_LABELS: Record<ContentKind, string> = {
  items: "Items",
  lessons: "Lessons",
  texts: "Texts & dialogues",
  mock_tests: "Mock tests",
  questions: "Questions",
  sentence_patterns: "Sentence patterns",
};

/** The column shown as each row's headline in admin lists. */
export const TITLE_COLUMN: Record<ContentKind, string> = {
  items: "term",
  lessons: "title",
  texts: "title",
  mock_tests: "title",
  questions: "prompt",
  sentence_patterns: "title",
};

/** Columns managed by the database or the review queue, never edited as content. */
export const SYSTEM_COLUMNS = ["id", "status", "source", "created_at", "updated_at"];

const CHUNK = 250;

export interface ImportResult {
  upserted: number;
  failed: { slugs: string[]; message: string }[];
}

/**
 * Upsert validated records by slug in chunks and log each one in
 * content_reviews as (re)entering draft. Runs as the signed-in admin, so RLS
 * still decides whether the write is allowed.
 */
export async function importRecords(supabase: SupabaseClient, parsed: ParsedImport): Promise<ImportResult> {
  const result: ImportResult = { upserted: 0, failed: [] };
  for (let i = 0; i < parsed.records.length; i += CHUNK) {
    const chunk = parsed.records.slice(i, i + CHUNK);
    const { data, error } = await supabase.from(parsed.kind).upsert(chunk, { onConflict: "slug" }).select("id");
    if (error) {
      result.failed.push({ slugs: chunk.map((r) => String(r.slug)), message: error.message });
      continue;
    }
    result.upserted += data.length;
    const { error: logError } = await supabase.from("content_reviews").insert(
      data.map((row) => ({
        content_table: parsed.kind,
        content_id: row.id,
        to_status: "draft",
        notes: `imported from ${parsed.source}`,
      })),
    );
    if (logError) result.failed.push({ slugs: [], message: `saved, but review log failed: ${logError.message}` });
  }
  return result;
}

/** Move rows that are currently in `from` to `to`, logging each transition. */
export async function changeStatus(
  supabase: SupabaseClient,
  kind: ContentKind,
  ids: string[],
  from: ContentStatus,
  to: ContentStatus,
  notes?: string,
) {
  if (ids.length === 0) return 0;
  const { data, error } = await supabase
    .from(kind)
    .update({ status: to })
    .in("id", ids)
    .eq("status", from)
    .select("id");
  if (error) throw new Error(error.message);
  if (data.length) {
    const { error: logError } = await supabase.from("content_reviews").insert(
      data.map((row) => ({ content_table: kind, content_id: row.id, from_status: from, to_status: to, notes: notes || null })),
    );
    if (logError) throw new Error(logError.message);
  }
  return data.length;
}
