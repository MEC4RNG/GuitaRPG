"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CodexEntry, CodexKind } from "@/lib/codex/catalog-v1";
const filters: Array<{ value: CodexKind | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "SKILL", label: "Skills" },
  { value: "CONCEPT", label: "Concepts" },
  { value: "CONTEXT", label: "Contexts" },
  { value: "CONSTRAINT", label: "Constraints" },
];
export function CodexSurface({ entries }: { entries: CodexEntry[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<CodexKind | "ALL">("ALL");
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return entries.filter(
      (entry) =>
        (kind === "ALL" || entry.kind === kind) &&
        (!needle ||
          [entry.name, entry.slug, entry.definition, ...entry.aliases, ...entry.legacySearchTerms]
            .join(" ")
            .toLocaleLowerCase()
            .includes(needle)),
    );
  }, [entries, kind, query]);
  function clear() {
    setQuery("");
    setKind("ALL");
  }
  return (
    <div className="codex-stack">
      <section className="codex-controls" aria-label="Search and filter Codex">
        <label>
          Search the Codex
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="Try Dorian or Barre Chords"
          />
        </label>
        <fieldset>
          <legend>Filter by kind</legend>
          <div className="codex-filter-list">
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={kind === filter.value ? "is-active" : ""}
                aria-pressed={kind === filter.value}
                onClick={() => setKind(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </fieldset>
      </section>
      <p className="codex-result-count" aria-live="polite">
        {results.length} {results.length === 1 ? "entry" : "entries"}
      </p>
      {results.length ? (
        <ul className="codex-results">
          {results.map((entry) => (
            <li key={entry.id}>
              <article className="codex-card">
                <div>
                  <span className="codex-kind">{entry.kind}</span>
                  {entry.domain ? <span>{entry.domain.name}</span> : null}
                  {typeof entry.metadata.context_family === "string" ? (
                    <span>{entry.metadata.context_family}</span>
                  ) : null}
                </div>
                <h2>
                  <Link href={entry.href}>{entry.name}</Link>
                </h2>
                <p>{entry.definition}</p>
                <Link className="codex-detail-link" href={entry.href}>
                  Read about {entry.name}
                </Link>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <section className="codex-empty">
          <h2>No Codex entries match that search.</h2>
          <button type="button" onClick={clear}>
            Clear search and filters
          </button>
        </section>
      )}
    </div>
  );
}
