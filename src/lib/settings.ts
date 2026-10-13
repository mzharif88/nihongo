import { z } from "zod";
import { JLPT_LEVELS } from "@/lib/content/schema";

/** Learner-editable profile fields (matches the columns granted to `authenticated`). */
export const settingsSchema = z.object({
  target_level: z.enum(JLPT_LEVELS),
  exam_date: z.union([z.literal(""), z.iso.date()]).transform((d) => d || null),
  goal: z.enum(["exam", "conversation", "both"]),
  timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), "Unknown timezone"),
});
