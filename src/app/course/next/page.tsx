import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadCourse, unitHref } from "@/lib/course/course.server";

export const dynamic = "force-dynamic";

/** Straight into the next unit of the course (the overview if there's none). */
export default async function NextUnit() {
  const { supabase, profile } = await requireUser();
  const { units } = await loadCourse(supabase, profile);
  redirect(units[0] ? unitHref(units[0]) : "/course");
}
