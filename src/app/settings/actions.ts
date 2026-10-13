"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { settingsSchema } from "@/lib/settings";

export interface SettingsState {
  error?: string;
  saved?: boolean;
}

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase, user } = await requireUser();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { saved: true };
}
