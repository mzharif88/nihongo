import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTENT_STATUSES, JLPT_LEVELS, type ContentKind, type ContentStatus, type ParsedImport } from "./schema";

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

export interface ContentFilters {
  status?: ContentStatus;
  level?: (typeof JLPT_LEVELS)[number];
  tag?: string;
  q?: string;
}

/** Read list filters from search params or form fields, dropping anything invalid. */
export function parseFilters(kind: ContentKind, get: (key: string) => string | undefined): ContentFilters {
  const tag = kind === "items" ? get("tag")?.trim() : undefined;
  return {
    status: CONTENT_STATUSES.find((s) => s === get("status")),
    level: JLPT_LEVELS.find((l) => l === get("level")),
    tag: tag || undefined,
    q: get("q")?.trim() || undefined,
  };
}

// The subset of Supabase's filter builder used here. Typed structurally because
// inferring through PostgrestFilterBuilder's generics hits TS's depth limit.
interface Filterable {
  eq(column: string, value: string): Filterable;
  contains(column: string, value: string[]): Filterable;
  or(filters: string): Filterable;
}

/** Apply the same filters to a list query or a bulk update, so "all matching" means what the list shows. */
export function applyFilters<T>(query: T, kind: ContentKind, f: ContentFilters): T {
  let q = query as unknown as Filterable;
  if (f.status) q = q.eq("status", f.status);
  if (f.level) q = q.eq("jlpt_level", f.level);
  if (f.tag) q = q.contains("tags", [f.tag]);
  if (f.q) {
    const term = f.q.replace(/[%,()]/g, " ");
    q = q.or(`slug.ilike.%${term}%,${TITLE_COLUMN[kind]}.ilike.%${term}%`);
  }
  return q as unknown as T;
}

/** Move every row matching the filters (which must include the current status) to `to`. */
export async function changeStatusWhere(
  supabase: SupabaseClient,
  kind: ContentKind,
  filters: ContentFilters & { status: ContentStatus },
  to: ContentStatus,
  notes?: string,
) {
  const { data, error } = await applyFilters(supabase.from(kind).update({ status: to }), kind, filters).select("id");
  if (error) throw new Error(error.message);
  for (let i = 0; i < data.length; i += CHUNK) {
    const { error: logError } = await supabase.from("content_reviews").insert(
      data.slice(i, i + CHUNK).map((row) => ({
        content_table: kind,
        content_id: row.id,
        from_status: filters.status,
        to_status: to,
        notes: notes || null,
      })),
    );
    if (logError) throw new Error(logError.message);
  }
  return data.length;
}
