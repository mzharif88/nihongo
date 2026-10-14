import Link from "next/link";

export const metadata = { title: "Attributions · NihonGo! JLPT" };

const SOURCES = [
  {
    name: "KANJIDIC2",
    by: "Electronic Dictionary Research and Development Group (EDRDG)",
    url: "https://www.edrdg.org/wiki/index.php/KANJIDIC_Project",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    use: "Kanji meanings, on/kun readings, stroke counts, school grades and frequency ranks.",
  },
  {
    name: "KRADFILE",
    by: "Michael Raine, Jim Breen, Jim Rose and the Electronic Dictionary Research and Development Group",
    url: "https://www.edrdg.org/krad/kradinf.html",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    use: "Kanji component breakdowns behind the memory hints.",
  },
  {
    name: "JLPT kanji and vocabulary lists",
    by: "Jonathan Waller, tanos.co.uk",
    url: "http://www.tanos.co.uk/jlpt/",
    license: "CC BY",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    use: "JLPT level assignments for kanji and words (community estimates; JLPT has published no official lists since 2010).",
  },
  {
    name: "JMdict",
    by: "Electronic Dictionary Research and Development Group (EDRDG)",
    url: "https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    use: "English glosses in the JLPT vocabulary lists derive from JMdict.",
  },
  {
    name: "kanji-data",
    by: "David Gouveia",
    url: "https://github.com/davidluzgouveia/kanji-data",
    license: "MIT",
    licenseUrl: "https://github.com/davidluzgouveia/kanji-data/blob/master/LICENSE",
    use: "JSON packaging of KANJIDIC2 with updated JLPT levels. Its WaniKani-derived fields are not used.",
  },
  {
    name: "open-anki-jlpt-decks",
    by: "Jamie Sinclair",
    url: "https://github.com/jamsinclair/open-anki-jlpt-decks",
    license: "MIT",
    licenseUrl: "https://github.com/jamsinclair/open-anki-jlpt-decks/blob/main/LICENSE",
    use: "CSV packaging of the N5–N2 vocabulary lists.",
  },
];

export default function AttributionsPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <Link href="/" className="text-sm text-muted">
        ← Home
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Attributions</h1>
      <p className="mt-2 text-sm text-muted">
        Kanji and vocabulary data come from these open sources. Data derived from CC BY-SA sources is shared under the
        same license. Lessons, dialogues, mnemonics and mock questions written for this app are original.
      </p>
      <ul className="mt-6 space-y-4">
        {SOURCES.map((s) => (
          <li key={s.name} className="rounded-xl border border-border bg-card p-4">
            <a href={s.url} className="font-medium underline" rel="noreferrer">
              {s.name}
            </a>
            <p className="text-sm text-muted">{s.by}</p>
            <p className="mt-2 text-sm">{s.use}</p>
            <a href={s.licenseUrl} className="mt-2 inline-block text-xs text-muted underline" rel="noreferrer">
              {s.license}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
