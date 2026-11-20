"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CodexV2Entry as Entry, CodexV2Term, LearningLevel } from "@/lib/codex/v2/content";
import { canonicalCodexHref } from "@/lib/codex/v2/content";
import { CodexV2Entry } from "./codex-v2-entry";

export function CodexV2Library({
  entries,
  terms,
}: {
  entries: readonly Entry[];
  terms: readonly CodexV2Term[];
}) {
  const [view, setView] = useState<"library" | "entry" | "dictionary">("library");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [termSearch, setTermSearch] = useState("");
  const [level, setLevel] = useState<LearningLevel | "all">("all");
  const selected = entries.find((entry) => entry.slug === selectedSlug) ?? null;
  const selectedTerm = terms.find((term) => term.id === selectedTermId) ?? null;
  const results = useMemo(
    () =>
      entries.filter(
        (entry) =>
          (level === "all" || entry.modules.some((module) => module.level === level)) &&
          [
            entry.slug.replaceAll("_", " "),
            entry.one_line,
            ...entry.applications.map((item) => item.title),
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(search.trim().toLocaleLowerCase()),
      ),
    [entries, level, search],
  );
  const matchingTerms = useMemo(
    () =>
      terms.filter((term) =>
        [term.term, term.definition]
          .join(" ")
          .toLocaleLowerCase()
          .includes(termSearch.trim().toLocaleLowerCase()),
      ),
    [terms, termSearch],
  );

  function openEntry(slug: string) {
    setSelectedSlug(slug);
    setSelectedTermId(null);
    setView("entry");
  }
  function openTerm(term: CodexV2Term) {
    setSelectedTermId(term.id);
    setView("dictionary");
  }

  return (
    <div className="cv2-library">
      <header className="cv2-library-header">
        <span className="cv2-eyebrow">Sound Uncharted · Learn</span>
        <h1>Explore the musical library.</h1>
        <p>A connected reference for understanding, practicing, and creating music.</p>
        <p className="cv2-draft-label">Design review only · not an official published curriculum</p>
        <div className="cv2-library-nav" role="group" aria-label="Library destinations">
          <button
            type="button"
            aria-pressed={view !== "dictionary"}
            onClick={() => {
              setView("library");
              setSelectedSlug(null);
            }}
          >
            Codex Library
          </button>
          <button
            type="button"
            aria-pressed={view === "dictionary"}
            onClick={() => {
              setView("dictionary");
              setSelectedTermId(null);
            }}
          >
            Music Dictionary
          </button>
          <Link href="/codex">Current Codex ↗</Link>
        </div>
      </header>
      {view === "entry" && selected ? (
        <CodexV2Entry
          key={selected.slug}
          entry={selected}
          terms={terms}
          preview
          onBack={() => setView("library")}
          onReadDictionary={openTerm}
        />
      ) : null}
      {view === "library" ? (
        <section className="cv2-library-index" aria-labelledby="cv2-library-index-title">
          <div className="cv2-index-header">
            <div>
              <span className="cv2-eyebrow">The Library</span>
              <h2 id="cv2-library-index-title">Musical Skills</h2>
              <p>Choose a subject to explore its lessons, applications, and related knowledge.</p>
            </div>
            <span>{results.length} preview entries</span>
          </div>
          <div className="cv2-filters">
            <label>
              Search Skills
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Try rhythm, triads, or scale degrees"
              />
            </label>
            <label>
              Learning material
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as LearningLevel | "all")}
              >
                <option value="all">All levels</option>
                <option value="foundational">Foundational</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
          <div className="cv2-cards">
            {results.map((entry) => (
              <article className="cv2-card" key={entry.slug}>
                <span className="cv2-eyebrow">Skill · {entry.modules.length} sample lessons</span>
                <h3>
                  {entry.slug
                    .replaceAll("_", " ")
                    .replace(/\b\w/g, (letter) => letter.toUpperCase())}
                </h3>
                <p>{entry.one_line}</p>
                <button type="button" onClick={() => openEntry(entry.slug)}>
                  Explore this Skill →
                </button>
              </article>
            ))}
          </div>
          {!results.length ? (
            <p role="status">No preview Skills match. Try a different search or learning level.</p>
          ) : null}
        </section>
      ) : null}
      {view === "dictionary" ? (
        <section className="cv2-dictionary" aria-labelledby="cv2-dictionary-title">
          <div className="cv2-index-header">
            <div>
              <span className="cv2-eyebrow">Reference</span>
              <h2 id="cv2-dictionary-title">Music Dictionary</h2>
              <p>Short explanations for musical terms used throughout Sound Uncharted.</p>
            </div>
            <span>{terms.length} preview terms</span>
          </div>
          <label className="cv2-dictionary-search">
            Find a term
            <input
              type="search"
              value={termSearch}
              onChange={(event) => setTermSearch(event.target.value)}
              placeholder="Try tonic or subdivision"
            />
          </label>
          <div className="cv2-dictionary-grid">
            <div className="cv2-term-list" role="list" aria-label="Dictionary entries">
              {matchingTerms.map((term) => (
                <button
                  key={term.id}
                  type="button"
                  role="listitem"
                  aria-current={term.id === selectedTermId ? "true" : undefined}
                  onClick={() => setSelectedTermId(term.id)}
                >
                  {term.term}
                </button>
              ))}
            </div>
            <article className="cv2-term-detail">
              {selectedTerm ? (
                <>
                  <span className="cv2-eyebrow">Dictionary entry · design draft</span>
                  <h3>{selectedTerm.term}</h3>
                  <p>{selectedTerm.definition}</p>
                  <p>{selectedTerm.detail}</p>
                  {selectedTerm.related ? (
                    <Link
                      href={canonicalCodexHref(
                        selectedTerm.related.kind,
                        selectedTerm.related.slug,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Related Codex reference ↗
                    </Link>
                  ) : null}
                </>
              ) : (
                <p>Select a term to read its full definition.</p>
              )}
            </article>
          </div>
        </section>
      ) : null}
    </div>
  );
}
