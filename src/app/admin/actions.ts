"use server";

import { readFile } from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { changeStatus, changeStatusWhere, importRecords, parseFilters, SYSTEM_COLUMNS } from "@/lib/content/admin";
import { PACK_GROUPS, packPath } from "@/lib/content/packs";
import {
  CONTENT_KINDS,
  CONTENT_STATUSES,
  isContentKind,
  nextStatuses,
  parseImport,
  type ContentStatus,
  type ImportIssue,
} from "@/lib/content/schema";

export interface ImportState {
  message?: string;
  error?: string;
  issues?: ImportIssue[];
}

async function runImport(raw: string): Promise<ImportState> {
  const { supabase } = await requireAdmin();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: "That isn't valid JSON." };
  }
  let parsed;
  try {
    parsed = parseImport(json);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const result = await importRecords(supabase, parsed);
  revalidatePath("/admin", "layout");
  const failed = result.failed.reduce((n, f) => n + f.slugs.length, 0);
  return {
    message: `Imported ${result.upserted} ${parsed.kind} as drafts.${failed ? ` ${failed} failed to save.` : ""}${
      parsed.issues.length ? ` ${parsed.issues.length} skipped as invalid.` : ""
    }`,
    error: result.failed.length ? result.failed.map((f) => f.message).join("; ") : undefined,
    issues: parsed.issues,
  };
}

export async function importJson(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const file = formData.get("file");
  const pasted = String(formData.get("json") ?? "").trim();
  if (file instanceof File && file.size > 0) return runImport(await file.text());
  if (pasted) return runImport(pasted);
  return { error: "Paste JSON or choose a file." };
}

export async function importBundled(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const path = packPath(String(formData.get("group") ?? ""), String(formData.get("pack") ?? ""));
  if (!path) return { error: "Unknown pack." };
  return runImport(await readFile(path, "utf8"));
}

/** Import every pack in a group, in order, stopping at the first pack that fails outright. */
export async function importGroup(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const group = PACK_GROUPS.find((g) => g.id === formData.get("group"));
  if (!group) return { error: "Unknown pack group." };
  const messages: string[] = [];
  for (const pack of group.packs) {
    const result = await runImport(await readFile(packPath(group.id, pack.file)!, "utf8"));
    messages.push(`${pack.label}: ${result.message ?? result.error}`);
    if (!result.message) return { error: messages.join("\n") };
  }
  return { message: messages.join("\n") };
}

export async function updateStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const kind = String(formData.get("kind"));
  const from = String(formData.get("from")) as ContentStatus;
  // Bulk buttons submit move=<scope>:<to>, e.g. "all:live" or "selected:reviewed".
  const [scope, toRaw] = String(formData.get("move") ?? `selected:${formData.get("to")}`).split(":");
  const to = toRaw as ContentStatus;
  const ids = formData.getAll("id").map(String);
  if (!isContentKind(kind) || !CONTENT_STATUSES.includes(from) || !nextStatuses(from).includes(to)) {
    throw new Error("Invalid status change.");
  }
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  if (scope === "all") {
    // Every row matching the list's filters, not just the ticked ones on this page.
    const filters = parseFilters(kind, (k) => formData.get(k)?.toString());
    await changeStatusWhere(supabase, kind, { ...filters, status: from }, to, notes);
  } else {
    await changeStatus(supabase, kind, ids, from, to, notes);
  }
  revalidatePath("/admin", "layout");
}

export interface SaveState {
  error?: string;
  saved?: boolean;
}

export async function saveRecord(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const { supabase } = await requireAdmin();
  const kind = String(formData.get("kind"));
  const id = String(formData.get("id"));
  if (!isContentKind(kind)) return { error: "Unknown content kind." };

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(String(formData.get("json") ?? ""));
  } catch {
    return { error: "That isn't valid JSON." };
  }
  for (const col of SYSTEM_COLUMNS) delete json[col];
  // Drop nulls so optional fields validate as absent, then store them as null again.
  const present = Object.fromEntries(Object.entries(json).filter(([, v]) => v !== null));
  const result = CONTENT_KINDS[kind].safeParse(present);
  if (!result.success) return { error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n") };

  const data = result.data as Record<string, unknown>;
  const update = Object.fromEntries(Object.keys(CONTENT_KINDS[kind].shape).map((k) => [k, data[k] ?? null]));

  const { error } = await supabase.from(kind).update(update).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin", "layout");
  if (update.slug !== formData.get("slug")) redirect(`/admin/content/${kind}/${update.slug}`);
  return { saved: true };
}
