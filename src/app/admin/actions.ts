"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { changeStatus, changeStatusWhere, parseFilters, SYSTEM_COLUMNS } from "@/lib/content/admin";
import { CONTENT_KINDS, CONTENT_STATUSES, isContentKind, nextStatuses, type ContentStatus } from "@/lib/content/schema";

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
