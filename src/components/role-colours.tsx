"use client";

import { useState } from "react";
import { ROLE_COLOURS_KEY as KEY } from "@/lib/role-colours";
import { readSaved, useHydrated, writeSaved } from "@/lib/saved-progress";

const LEGEND = [
  { role: "s", label: "Subject / topic", hint: "は・が" },
  { role: "o", label: "Object", hint: "を" },
  { role: "v", label: "Verb", hint: "" },
  { role: "p", label: "Particle", hint: "" },
] as const;

/** The colour key: what each grammar colour means. */
export function RoleLegend() {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {LEGEND.map((l) => (
        <span key={l.role} className={`role-${l.role} font-medium`}>
          ■ {l.label}
          {l.hint && <span lang="ja"> {l.hint}</span>}
        </span>
      ))}
    </p>
  );
}

/** Switch grammar colours on or off, with the key. */
export function RoleColoursToggle() {
  const hydrated = useHydrated();
  return <Toggle key={hydrated ? "client" : "server"} resume={hydrated} />;
}

function Toggle({ resume }: { resume: boolean }) {
  const [on, setOn] = useState(() => !(resume && readSaved<string>(KEY) === "off"));
  function flip() {
    const next = !on;
    setOn(next);
    writeSaved(KEY, next ? null : "off");
    document.documentElement.classList.toggle("roles-off", !next);
  }
  return (
    <div className="space-y-2">
      <button onClick={flip} className="rounded-full border border-border px-3 py-1 text-sm text-muted">
        Grammar colours {on ? "on" : "off"}
      </button>
      {on && <RoleLegend />}
    </div>
  );
}
