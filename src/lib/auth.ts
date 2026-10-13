import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  display_name: string | null;
  role: "learner" | "admin";
  goal: "exam" | "conversation" | "both";
  target_level: string;
  exam_date: string | null;
  daily_minutes: number;
}

/** The signed-in user and their profile, or a redirect to /login. */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single<Profile>();
  if (!profile) redirect("/login");
  return { supabase, user: data.user, profile };
}

/**
 * Gate for /admin pages and actions. Non-admins get a 404 so the console's
 * existence isn't advertised. RLS enforces the same rule on every write.
 */
export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile.role !== "admin") notFound();
  return ctx;
}
