import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { JLPT_LEVELS } from "@/lib/content/schema";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { profile } = await requireUser();
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link href="/" className="text-sm text-muted">
        ← Home
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted">Your exam date and target level set how many new items you get each day.</p>
      <SettingsForm
        levels={[...JLPT_LEVELS]}
        timezones={Intl.supportedValuesOf("timeZone")}
        initial={{
          target_level: profile.target_level,
          exam_date: profile.exam_date ?? "",
          goal: profile.goal,
          timezone: profile.timezone,
        }}
      />
    </main>
  );
}
