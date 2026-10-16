import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/supabase/env";

// The Siri Shortcut feed: a learner's phrases as plain text, found by their
// private token (the Shortcut can't sign in). One phrase per block:
// Japanese, then the meaning, then a blank line. ?part=jp or ?part=meaning
// gives just that line of each, for Shortcuts that speak a list.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const part = url.searchParams.get("part");
  if (!/^[0-9a-f]{48}$/.test(token)) return new Response("Not found", { status: 404 });
  const { url: supabaseUrl, key } = supabaseEnv();
  const supabase = createClient(supabaseUrl, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("newcomer_feed", { feed_token: token });
  if (error) return new Response("Feed unavailable", { status: 500 });
  const rows = (data ?? []) as { jp: string; meaning: string }[];
  if (!rows.length) return new Response("Not found", { status: 404 });
  const body =
    part === "jp" ? rows.map((r) => r.jp).join("\n") : part === "meaning" ? rows.map((r) => r.meaning).join("\n") : rows.map((r) => `${r.jp}\n${r.meaning}`).join("\n\n");
  return new Response(body + "\n", {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
