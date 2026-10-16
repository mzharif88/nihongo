import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { ShortcutLink } from "./shortcut-link";

export const dynamic = "force-dynamic";

export default async function ShortcutPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("newcomer_feeds").select("token").maybeSingle();
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <>
      <h1 className="text-2xl font-bold">Listen with the phone locked</h1>
      <p className="mt-2 text-sm text-muted">
        Web pages can&apos;t speak once the iPhone locks. A Siri Shortcut can: it reads your phrases from a private link and speaks
        them with the Japanese voice, screen off, in your pocket.
      </p>

      <ShortcutLink origin={origin} initial={data?.token ?? null} />

      <h2 className="mt-8 font-semibold">Make the Shortcut (once)</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">
        <li>Open the Shortcuts app, tap +, and name it “Japanese phrases”.</li>
        <li>
          Add <b>Get Contents of URL</b> and paste your link above.
        </li>
        <li>
          Add <b>Split Text</b>, split by <b>New Lines</b>.
        </li>
        <li>
          Add <b>Repeat with Each</b>. Inside it:
          <ul className="mt-1 list-disc pl-5">
            <li>
              <b>Speak Text</b> with <b>Repeat Item</b>. Tap the arrow: Language Japanese, Voice Otoya, Wait Until Finished on.
            </li>
            <li>
              <b>Wait</b> 4 seconds (your turn to say it).
            </li>
          </ul>
        </li>
        <li>Run it from the Shortcuts app, the Home Screen, or say “Hey Siri, Japanese phrases”.</li>
      </ol>
      <p className="mt-4 text-xs text-muted">
        The link plays your own phrases (not paused ones, priority first), always the latest list. Anyone with the link can hear
        them, so keep it to yourself; reset it if it leaks.
      </p>
    </>
  );
}
