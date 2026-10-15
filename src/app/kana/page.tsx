import { requireUser } from "@/lib/auth";
import { KanaChart } from "./chart";

export const dynamic = "force-dynamic";

export default async function KanaPage() {
  await requireUser();
  return <KanaChart />;
}
