"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { TOPIC_ID } from "@/lib/study/topics";

/** Set (or clear, with "auto") where today's new items come from. */
export async function setStudyTopic(formData: FormData) {
  const { supabase, user } = await requireUser();
  const value = String(formData.get("topic") ?? "auto");
  const study_topic = value === "auto" ? null : value;
  if (study_topic !== null && !TOPIC_ID.test(study_topic)) throw new Error("Unknown topic.");
  const { error } = await supabase.from("profiles").update({ study_topic }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
