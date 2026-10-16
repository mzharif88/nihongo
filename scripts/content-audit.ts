/**
 * npm run audit: scan every content pack against the audit rules
 * (src/lib/audit/engine.ts) and write content/audit/report.json.
 *
 *   npm run audit                 report; exit 1 on errors or new warnings
 *   npm run audit -- --baseline   also accept today's warning counts as the new baseline
 *   npm run audit -- --check      check only (runs before every build: a deploy with content errors fails)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { regressions, runAudit, type Content, type Pack, type Rec } from "../src/lib/audit/engine";

const ROOT = join(process.cwd(), "content");
const PACK_DIRS = ["legacy", "opendata", "grammar", "radicals", "lessons", "builder", "mock", "reading", "listening"];
export const BASELINE_FILE = join(ROOT, "audit", "baseline.json");
export const REPORT_FILE = join(ROOT, "audit", "report.json");

export function loadContent(): Content {
  const packs: Pack[] = [];
  const items = new Map<string, Rec>();
  for (const dir of PACK_DIRS) {
    if (!existsSync(join(ROOT, dir))) continue;
    for (const f of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".json") && !f.endsWith(".source.json")).sort()) {
      const doc = JSON.parse(readFileSync(join(ROOT, dir, f), "utf8"));
      if (!doc.kind || !Array.isArray(doc.records)) continue;
      packs.push({ file: `${dir}/${f}`, kind: doc.kind, records: doc.records });
      if (doc.kind === "items") for (const r of doc.records as Rec[]) items.set(r.slug, { ...(items.get(r.slug) ?? {}), ...r });
    }
  }
  const topics = new Set((JSON.parse(readFileSync(join(ROOT, "topics", "topics.json"), "utf8")) as { topics: { name: string }[] }).topics.map((t) => t.name));
  const fullMocks = readdirSync(join(ROOT, "mock"))
    .filter((f) => /-full-\d+\.source\.json$/.test(f))
    .map((f) => {
      const src = JSON.parse(readFileSync(join(ROOT, "mock", f), "utf8"));
      return { file: `mock/${f}`, level: src.mock_test.jlpt_level as string, questions: src.questions };
    });
  const allowFile = join(ROOT, "audit", "allow.json");
  const allow = existsSync(allowFile) ? JSON.parse(readFileSync(allowFile, "utf8")).allow : {};
  return { packs, items, topics, fullMocks, allow };
}

export const loadBaseline = (): Record<string, number> => (existsSync(BASELINE_FILE) ? JSON.parse(readFileSync(BASELINE_FILE, "utf8")).warnings : {});

function main() {
  const report = runAudit(loadContent());
  // --check (the pre-build gate) only checks; a normal run also refreshes the report.
  const check = process.argv.includes("--check");
  if (!check) writeFileSync(REPORT_FILE, JSON.stringify(report, null, 1) + "\n");
  const icon = { error: "✖", warning: "▲", info: "·" } as const;
  for (const r of report.rules) console.log(`${icon[r.severity]} ${String(r.count).padStart(5)}  ${r.id}  ${r.title}`);
  console.log(`\n${report.totals.error} errors, ${report.totals.warning} warnings, ${report.totals.info} info${check ? "" : ` → ${REPORT_FILE.replace(process.cwd() + "/", "")}`}`);

  if (process.argv.includes("--baseline")) {
    const warnings = Object.fromEntries(report.rules.filter((r) => r.severity === "warning").map((r) => [r.id, r.count]));
    writeFileSync(BASELINE_FILE, JSON.stringify({ note: "Warning counts the content may not exceed (tests/content-audit.test.ts). Lower them as warnings are fixed: npm run audit -- --baseline", warnings }, null, 1) + "\n");
    console.log("Baseline updated.");
  }
  const worse = regressions(report, loadBaseline());
  for (const r of worse) console.log(`New warnings: ${r.id} (${r.count})`);
  if (report.totals.error > 0 || worse.length) process.exit(1);
}

if (process.argv[1]?.endsWith("content-audit.ts")) main();
