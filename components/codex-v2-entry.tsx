"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  canonicalCodexHref,
  canonicalCodexName,
  type CodexV2Entry as Entry,
  type CodexV2Inline,
  type CodexV2Term,
  type LearningLevel,
} from "@/lib/codex/v2/content";

const levels: LearningLevel[] = ["foundational", "intermediate", "advanced"];
type Section = "overview" | "lessons" | "applications" | "connections";
const sections: Array<{ id: Section; title: string }> = [
  { id: "overview", title: "Overview" },
  { id: "lessons", title: "Lessons" },
  { id: "applications", title: "Applications" },
  { id: "connections", title: "Connections" },
];
const connectionName: Record<string, string> = {
  REQUIRED_PREREQUISITE: "Required prerequisite",
  RECOMMENDED_FOUNDATION: "Recommended foundation",
  RELATED: "Related knowledge",
  DEVELOPS_TOWARD: "Develops toward",
};

function DefinitionDialog({
  term,
  onClose,
  onReadFull,
}: {
  term: CodexV2Term;
  onClose: () => void;
  onReadFull: (term: CodexV2Term) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  return (
    <div className="cv2-definition-backdrop" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cv2-definition-heading"
        className="cv2-definition-dialog"
        onKeyDown={trapFocus}
      >
        <header>
          <span className="cv2-eyebrow">Music Dictionary</span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close definition"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <h2 id="cv2-definition-heading">{term.term}</h2>
        <p>{term.definition}</p>
        <p>{term.detail}</p>
        <div className="cv2-definition-actions">
          <button type="button" onClick={() => onReadFull(term)}>
            Read full dictionary entry
          </button>
          {term.related ? (
            <Link href={canonicalCodexHref(term.related.kind, term.related.slug)}
              target="_blank" rel="noopener noreferrer">
              Related Codex entry ↗
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CodexV2Entry({
  entry,
  terms,
  onBack,
  onReadDictionary,
  preview = false,
}: {
  entry: Entry;
  terms: readonly CodexV2Term[];
  onBack?: () => void;
  onReadDictionary?: (term: CodexV2Term) => void;
  preview?: boolean;
}) {
  const [section, setSection] = useState<Section>("overview");
  const [level, setLevel] = useState<LearningLevel>("foundational");
  const [application, setApplication] = useState("all");
  const [openTerm, setOpenTerm] = useState<CodexV2Term | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const dictionary = useMemo(() => new Map(terms.map((term) => [term.id, term])), [terms]);
  const modules = entry.modules.filter(
    (item) => item.level === level && (application === "all" || item.application_id === application),
  );

  function closeTerm() {
    setOpenTerm(null);
    const trigger = triggerRef.current;
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus();
    });
  }
  function richText(inline: CodexV2Inline[]) {
    return inline.map((part, index) => {
      const glossaryTerm = part.term_id ? dictionary.get(part.term_id) : null;
      return glossaryTerm ? (
        <button
          key={index}
          className="cv2-glossary-term"
          type="button"
          aria-label={`Define ${glossaryTerm.term}`}
          onClick={(event) => {
            triggerRef.current = event.currentTarget;
            setOpenTerm(glossaryTerm);
          }}
        >
          {part.text}
        </button>
      ) : (
        <span key={index}>{part.text}</span>
      );
    });
  }

  return (
    <article className="cv2-entry" aria-labelledby="cv2-entry-title">
      <div className="cv2-breadcrumb">
        {onBack ? <button type="button" onClick={onBack}>← Library</button> : (
          <Link href="/codex">← Codex Library</Link>
        )}
        <span> / {entry.kind.toLocaleLowerCase()} reference</span>
      </div>
      <header className="cv2-entry-hero">
        <span className="cv2-eyebrow">Sound Uncharted · {entry.kind.toLocaleLowerCase()} Codex</span>
        {preview ? <span className="cv2-draft-label">Design draft · not a published lesson</span> : null}
        <h1 id="cv2-entry-title">{canonicalCodexName(entry.kind, entry.slug)}</h1>
        <p className="cv2-lead">{entry.one_line}</p>
        <span className="cv2-edition">Codex V2 · {entry.revision}</span>
      </header>
      <nav className="cv2-entry-tabs" aria-label="Codex entry sections">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={section === item.id}
            className={section === item.id ? "is-active" : ""}
            onClick={() => setSection(item.id)}
          >
            {item.title}
          </button>
        ))}
      </nav>
      {section === "overview" ? (
        <section className="cv2-reading-panel" aria-label="Skill overview">
          <h2>What it is</h2>
          <p>{richText(entry.intro)}</p>
          <h3>Find your starting point</h3>
          <p>Choose a learning level or musical application in Lessons. These describe
            educational material, not your personal ability or Quest difficulty.</p>
          <button type="button" onClick={() => setSection("lessons")}>Explore lessons →</button>
        </section>
      ) : null}
      {section === "lessons" ? (
        <section className="cv2-reading-panel" aria-label="Learning modules">
          <h2>Learn and explore</h2>
          <div className="cv2-level-controls" role="group" aria-label="Learning level">
            {levels.map((item) => (
              <button type="button" key={item} aria-pressed={level === item}
                className={level === item ? "is-active" : ""} onClick={() => setLevel(item)}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
          <label className="cv2-application-filter">
            Musical application
            <select value={application} onChange={(event) => setApplication(event.target.value)}>
              <option value="all">All applications</option>
              {entry.applications.map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </label>
          {modules.length ? modules.map((module) => (
            <details className="cv2-module" key={module.id} open={modules.length === 1}>
              <summary>{module.title} <span>{module.application_id}</span></summary>
              <p>{module.explanation}</p>
              <h3>Try it</h3>
              <ol>{module.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
              {preview ? <small>Educational draft · does not record progress</small> : null}
            </details>
          )) : (
            <p role="status">No reviewed module is available for this combination yet.
              Choose another level or application.</p>
          )}
        </section>
      ) : null}
      {section === "applications" ? (
        <section className="cv2-reading-panel">
          <h2>Where you can use it</h2>
          <div className="cv2-application-grid">
            {entry.applications.map((item) => (
              <button type="button" key={item.id} onClick={() => {
                setApplication(item.id);
                setLevel(entry.modules.find((m) => m.application_id === item.id)?.level ?? "foundational");
                setSection("lessons");
              }}>
                <strong>{item.title}</strong>
                <span>Explore related lessons →</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {section === "connections" ? (
        <section className="cv2-reading-panel">
          <h2>Musical connections</h2>
          {entry.relationships.length ? (
            <ul className="cv2-connections">{entry.relationships.map((relationship) => (
              <li key={`${relationship.type}:${relationship.kind}:${relationship.slug}`}>
                <span>{connectionName[relationship.type]}</span>
                <Link href={canonicalCodexHref(relationship.kind, relationship.slug)}
                  target="_blank" rel="noopener noreferrer">
                  {canonicalCodexName(relationship.kind, relationship.slug)} ↗
                </Link>
                {relationship.review_status !== "REVIEWED" ? (
                  <small>Proposed relationship · not a prerequisite gate</small>
                ) : null}
              </li>
            ))}</ul>
          ) : <p>No verified relationship content has been published for this entry.</p>}
        </section>
      ) : null}
      {openTerm ? (
        <DefinitionDialog term={openTerm} onClose={closeTerm}
          onReadFull={(term) => {
            closeTerm();
            if (onReadDictionary) onReadDictionary(term);
            else window.location.assign(`/codex/dictionary/${term.slug}`);
          }} />
      ) : null}
    </article>
  );
}
