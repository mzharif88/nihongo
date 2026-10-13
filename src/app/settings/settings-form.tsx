"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";

interface Props {
  levels: string[];
  timezones: string[];
  initial: { target_level: string; exam_date: string; goal: string; timezone: string };
}

const field = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-base";

export function SettingsForm({ levels, timezones, initial }: Props) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm text-muted">Target JLPT level</span>
        <select name="target_level" defaultValue={initial.target_level} className={field}>
          {levels.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-muted">Exam date (JLPT is the first Sunday of July and December)</span>
        <input type="date" name="exam_date" defaultValue={initial.exam_date} className={field} />
      </label>
      <label className="block">
        <span className="text-sm text-muted">Goal</span>
        <select name="goal" defaultValue={initial.goal} className={field}>
          <option value="exam">Pass the exam</option>
          <option value="conversation">Conversation</option>
          <option value="both">Both</option>
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-muted">Timezone (when your study day resets)</span>
        <select name="timezone" defaultValue={initial.timezone} className={field}>
          {timezones.map((tz) => (
            <option key={tz}>{tz}</option>
          ))}
        </select>
      </label>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.saved && <p className="text-sm text-green-700 dark:text-green-400">Saved.</p>}
      <button disabled={pending} className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
