import { requireUser } from "@/lib/auth";
import { aiConfigured } from "@/lib/ai/engine.server";
import { loadMyPhrases } from "@/lib/newcomer/newcomer.server";
import { loadSpend } from "@/lib/newcomer/translate.server";
import { PhrasesClient } from "./phrases-client";

export const dynamic = "force-dynamic";

export default async function MyPhrasesPage() {
  const { supabase } = await requireUser();
  const [phrases, spend] = await Promise.all([loadMyPhrases(supabase), loadSpend(supabase)]);
  return <PhrasesClient initial={phrases} canTranslate={aiConfigured()} spend={spend} />;
}
