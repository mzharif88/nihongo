import { requireUser } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai/engine.server";
import { loadMyPhrases } from "@/lib/newcomer/newcomer.server";
import { PhrasesClient } from "./phrases-client";

export const dynamic = "force-dynamic";

export default async function MyPhrasesPage() {
  const { supabase } = await requireUser();
  const phrases = await loadMyPhrases(supabase);
  return <PhrasesClient initial={phrases} canTranslate={aiConfigured()} />;
}
