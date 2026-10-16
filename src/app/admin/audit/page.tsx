import reportJson from "../../../../content/audit/report.json";
import baselineJson from "../../../../content/audit/baseline.json";
import type { Report } from "@/lib/audit/engine";

// The latest content audit (npm run audit writes content/audit/report.json).

const report = reportJson as unknown as Report;
const baseline = (baselineJson as { warnings: Record<string, number> }).warnings;

const STYLE = {
  error: "border-red-600 bg-red-50 dark:bg-red-950",
  warning: "border-amber-500 bg-amber-50 dark:bg-amber-950",
  info: "border-border bg-card",
} as const;

export default function AuditPage() {
  const rules = [...report.rules].sort((a, b) => Number(b.count > 0) - Number(a.count > 0) || ["error", "warning", "info"].indexOf(a.severity) - ["error", "warning", "info"].indexOf(b.severity));
  return (
    <main>
      <h1 className="text-2xl font-bold">Content audit</h1>
      <p className="mt-1 text-sm text-muted">
        Checks every pack against the JLPT&apos;s standards and what suits beginners. Run <code>npm run audit</code> to refresh;
        errors fail the tests, and warnings may not rise above the baseline. Last run {new Date(report.generatedAt).toLocaleString("en-GB")}.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Errors" value={report.totals.error} tone={report.totals.error ? "text-red-600" : "text-green-600"} />
        <Stat label="Warnings" value={report.totals.warning} tone="text-amber-600" />
        <Stat label="Info" value={report.totals.info} tone="text-muted" />
      </div>
      <div className="mt-6 space-y-3">
        {rules.map((r) => (
          <details key={r.id} className={`rounded-xl border p-3 ${r.count ? STYLE[r.severity] : "border-border bg-card opacity-70"}`}>
            <summary className="cursor-pointer">
              <span className="font-medium">{r.title}</span>
              <span className="ml-2 text-sm text-muted">
                {r.count === 0 ? "✓ clean" : `${r.count} ${r.severity}${r.count === 1 ? "" : "s"}`}
                {r.severity === "warning" && r.count > 0 ? ` · baseline ${baseline[r.id] ?? 0}` : ""}
              </span>
            </summary>
            <p className="mt-2 text-sm text-muted">{r.why}</p>
            {r.samples.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm" lang="ja">
                {r.samples.map((s, i) => (
                  <li key={i} className="break-words">
                    <span className="text-xs text-muted">{s.file}{s.slug ? ` · ${s.slug}` : ""}</span>
                    <br />
                    {s.message}
                  </li>
                ))}
                {r.count > r.samples.length && <li className="text-xs text-muted">…and {r.count - r.samples.length} more (npm run audit)</li>}
              </ul>
            )}
          </details>
        ))}
      </div>
    </main>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
