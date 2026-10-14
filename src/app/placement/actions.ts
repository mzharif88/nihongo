"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { markKnown } from "@/lib/placement/placement.server";

/** Save a placement result: words answered right and the levels passed become known. */
export async function applyPlacement(input: { correctIds: string[]; levels: string[] }): Promise<{ marked: number }> {
  const { supabase, profile } = await requireUser();
  const correctIds = input.correctIds.filter((id) => typeof id === "string").slice(0, 100);
  const levels = input.levels.filter((l) => typeof l === "string").slice(0, 4);
  const marked = await markKnown(supabase, profile, { correctIds, levels });
  revalidatePath("/");
  revalidatePath("/course");
  return { marked };
}
