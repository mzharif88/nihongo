import { NewcomerNav, OfflineReady } from "./ui";

export default function NewcomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-xl px-4 pb-8">
      <NewcomerNav />
      <OfflineReady />
      {children}
    </main>
  );
}
