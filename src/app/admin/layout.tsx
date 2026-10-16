import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/content/items", label: "Content" },
  { href: "/admin/ai", label: "AI engine" },
  { href: "/admin/audit", label: "Content audit" },
  { href: "/admin/export", label: "Export", download: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/" className="font-bold">
          日本語<span className="text-accent">Go!</span> admin
        </Link>
        <nav className="flex flex-wrap gap-3 text-sm">
          {NAV.map((n) =>
            n.download ? (
              <a key={n.href} href={n.href} className="text-muted hover:text-foreground">
                {n.label}
              </a>
            ) : (
              <Link key={n.href} href={n.href} className="text-muted hover:text-foreground">
                {n.label}
              </Link>
            ),
          )}
        </nav>
      </header>
      {children}
    </div>
  );
}
