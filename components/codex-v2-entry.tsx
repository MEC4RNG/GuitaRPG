"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CodexV2Reference } from "./codex-v2-reference";
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
type Section = "overview" | "lessons" | "explore" | "applications" | "connections";
const sections: Array<{ id: Section; title: string }> = [
  { id: "overview", title: "Overview" },
  { id: "lessons", title: "Lessons" },
  { id: "explore", title: "How to Explore" },
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
    <div
      className="cv2-definition-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
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
          <button ref={closeRef} type="button" aria-label="Close definition" onClick={onClose}>
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
            <Link
              href={canonicalCodexHref(term.related.kind, term.related.slug)}
              target="_blank"
              rel="noopener noreferrer"
            >
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
  const router = useRouter();
  const [section, setSection] = useState<Section>("overview");
  const [level, setLevel] = useState<LearningLevel>("foundational");
  const [application, setApplication] = useState("all");
  const [openTerm, setOpenTerm] = useState<CodexV2Term | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dictionary = useMemo(() => new Map(terms.map((term) => [term.id, term])), [terms]);

  const modules = entry.modules.filter(
    (item) =>
      item.level === level && (application === "all" || item.application_id === application),
  );
  const goal = entry.learning_levels.find((item) => item.id === level)?.goal;
  const applicationLabel = (id: string) =>
    entry.applications.find((item) => item.id === id)?.title ?? id;
  const hasLessonAtLevel = (applicationId: string, atLevel: LearningLevel) =>
    entry.modules.some((item) => item.application_id === applicationId && item.level === atLevel);
  const availableLevels = (applicationId: string) =>
    levels.filter((candidate) => hasLessonAtLevel(applicationId, candidate));
  const unavailableApplicationCount = entry.applications.filter(
    (item) => !hasLessonAtLevel(item.id, level),
  ).length;
  const isDraftContent = preview || entry.editorial_status === "DRAFT_REVIEW";
  const hasProposedConnections = entry.relationships.some(
    (relationship) => relationship.review_status === "PROPOSED",
  );
  const availabilityText =
    unavailableApplicationCount === 0
      ? `All ${entry.applications.length} applications include ${level} lessons.`
      : `${unavailableApplicationCount} ${unavailableApplicationCount === 1 ? "application has" : "applications have"} no ${level} lesson yet. Unavailable options remain visible for exploration.`;

  function chooseLevel(nextLevel: LearningLevel) {
    setLevel(nextLevel);
    if (application !== "all" && !hasLessonAtLevel(application, nextLevel)) {
      setApplication("all");
    }
  }

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

  const chooseApplication = (id: string) => {
    setApplication(id);
    setLevel(entry.modules.find((item) => item.application_id === id)?.level ?? "foundational");
    setSection("lessons");
  };

  const filters = (
    <div className="cv2-study-filters">
      <div className="cv2-level-controls" role="group" aria-label="Learning level">
        {levels.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={level === item}
            className={level === item ? "is-active" : ""}
            onClick={() => chooseLevel(item)}
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      <label className="cv2-application-filter">
        Musical application
        <select value={application} onChange={(event) => setApplication(event.target.value)}>
          <option value="all">All applications</option>
          {entry.applications.map((item) => {
            const hasLesson = hasLessonAtLevel(item.id, level);
            return (
              <option key={item.id} value={item.id} disabled={!hasLesson}>
                {item.title}
                {hasLesson ? "" : " — no lesson at this level"}
              </option>
            );
          })}
        </select>
      </label>
      {goal ? <p className="cv2-level-goal">{goal}</p> : null}
      <p className="cv2-availability-note">{availabilityText}</p>
    </div>
  );

  return (
    <article className="cv2-entry" aria-labelledby="cv2-entry-title">
      <div className="cv2-breadcrumb">
        {onBack ? (
          <button type="button" onClick={onBack}>
            ← Library
          </button>
        ) : (
          <Link href="/codex">← Codex Library</Link>
        )}
        <span>/ {entry.kind.toLocaleLowerCase()} reference</span>
      </div>
      <header className="cv2-entry-hero">
        <span className="cv2-eyebrow">
          Sound Uncharted · {entry.kind.toLocaleLowerCase()} Codex
        </span>
        <h1 id="cv2-entry-title">{canonicalCodexName(entry.kind, entry.slug)}</h1>
        <p className="cv2-lead">{entry.one_line}</p>
        {preview ? (
          <span className="cv2-draft-label">Design draft · not a published lesson</span>
        ) : null}
      </header>

      <nav className="cv2-entry-tabs" aria-label="Codex entry sections">
        {sections.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={section === item.id}
            className={section === item.id ? "is-active" : ""}
            onClick={() => setSection(item.id)}
          >
            {item.title}
          </button>
        ))}
      </nav>

      <div className="cv2-section-frame">
        {section === "overview" ? (
          <div
            className={`cv2-overview-grid${entry.slug === "arpeggio_sequencing" ? " cv2-overview-grid--arpeggio" : ""}`}
          >
            <section className="cv2-reading-panel" aria-label="Skill overview">
              <span className="cv2-eyebrow">The musical idea</span>
              <h2>What it is</h2>
              <p className="cv2-introduction">{richText(entry.intro)}</p>
              <p>{entry.overview}</p>
              <div className="cv2-distinction">
                <h3>Important distinction</h3>
                <p>{entry.key_distinction}</p>
              </div>
              <button type="button" onClick={() => setSection("lessons")}>
                Explore lessons →
              </button>
            </section>
            <CodexV2Reference blocks={entry.reference_blocks} />
          </div>
        ) : null}

        {section === "lessons" ? (
          <section className="cv2-reading-panel" aria-label="Learning modules">
            <div className="cv2-panel-heading">
              <span className="cv2-eyebrow">Learning progression</span>
              <h2>Lessons</h2>
              <p>
                {entry.modules.length} {isDraftContent ? "draft " : ""}instructional modules ·
                exercises do not record progress
              </p>
            </div>
            {filters}
            {modules.length ? (
              <div className="cv2-modules">
                {modules.map((module) => (
                  <details className="cv2-module" key={module.id}>
                    <summary>
                      <span className="cv2-module-summary-main">
                        <span className="cv2-module-chevron" aria-hidden="true">
                          ▸
                        </span>
                        <strong>{module.title}</strong>
                      </span>
                      <span className="cv2-module-application">
                        {applicationLabel(module.application_id)}
                      </span>
                    </summary>
                    <p>{module.explanation}</p>
                    <h3>Learning objectives</h3>
                    <ul>
                      {module.outcomes.map((outcome, index) => (
                        <li key={index}>{outcome}</li>
                      ))}
                    </ul>
                    <h3>Try it</h3>
                    {module.exercises.map((exercise) => (
                      <div key={exercise.id} className="cv2-exercise">
                        <strong>{exercise.title}</strong>
                        <p>{exercise.setup}</p>
                        <ol>
                          {exercise.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                        <p>
                          <strong>Self-check: </strong>
                          {exercise.self_check}
                        </p>
                        <small>
                          Suggested exploration: {exercise.suggested_minutes} minutes · no progress
                          recorded
                        </small>
                      </div>
                    ))}
                    {preview ? (
                      <Link
                        className="cv2-lesson-workbook-link"
                        href={`/workbooks?codex_module=${encodeURIComponent(module.id)}`}
                      >
                        Practice in Workbook →
                      </Link>
                    ) : null}
                  </details>
                ))}
              </div>
            ) : (
              <p role="status">
                No {isDraftContent ? "draft " : ""}lesson matches this level and application. Choose
                another combination.
              </p>
            )}
            <button type="button" onClick={() => setSection("overview")}>
              View interactive reference →
            </button>
          </section>
        ) : null}

        {section === "explore" ? (
          <section className="cv2-reading-panel" aria-label="How to explore this Skill">
            <div className="cv2-panel-heading">
              <span className="cv2-eyebrow">Guided discovery</span>
              <h2>How to Explore</h2>
              <p>Activities you can try without starting or grading a Quest.</p>
            </div>
            {filters}
            {modules.length ? (
              <div className="cv2-explore-grid">
                {modules.flatMap((module) =>
                  module.exercises.map((exercise) => (
                    <details className="cv2-module cv2-explore-module" key={exercise.id}>
                      <summary>
                        <span className="cv2-module-summary-main">
                          <span className="cv2-module-chevron" aria-hidden="true">
                            ▸
                          </span>
                          <strong>{exercise.title}</strong>
                        </span>
                        <span className="cv2-module-application">
                          {applicationLabel(module.application_id)}
                        </span>
                      </summary>
                      <div className="cv2-exercise">
                        <p>{exercise.setup}</p>
                        <ol>
                          {exercise.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                        <p>
                          <strong>Check yourself: </strong>
                          {exercise.self_check}
                        </p>
                        <small>
                          {exercise.suggested_minutes} minutes suggested · no automatic evidence
                        </small>
                        {preview ? (
                          <Link
                            className="cv2-lesson-workbook-link"
                            href={`/workbooks?codex_module=${encodeURIComponent(module.id)}`}
                          >
                            Practice in Workbook →
                          </Link>
                        ) : null}
                      </div>
                    </details>
                  )),
                )}
              </div>
            ) : (
              <p role="status">No exercises match this combination yet.</p>
            )}
          </section>
        ) : null}

        {section === "applications" ? (
          <section className="cv2-reading-panel" aria-label="Musical applications">
            <div className="cv2-panel-heading">
              <span className="cv2-eyebrow">Musical contexts</span>
              <h2>Where you can use it</h2>
              <p>
                One Skill can support several musical pursuits. Select an application to explore its
                lessons.
              </p>
            </div>
            <div className="cv2-application-grid">
              {entry.applications.map((item) => (
                <button type="button" key={item.id} onClick={() => chooseApplication(item.id)}>
                  <strong>{item.title}</strong>
                  <span className="cv2-app-description">{item.summary}</span>
                  <span className="cv2-app-levels">
                    Lessons available: {availableLevels(item.id).join(" · ") || "none yet"}
                  </span>
                  <span>Explore related lessons →</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {section === "connections" ? (
          <section className="cv2-reading-panel" aria-label="Skill relationships">
            <div className="cv2-panel-heading">
              <span className="cv2-eyebrow">Knowledge connections</span>
              <h2>Musical connections</h2>
              <p>
                {hasProposedConnections
                  ? "Proposed connections for exploration, not approved prerequisites."
                  : "Reviewed musical relationships for further exploration."}
              </p>
            </div>
            {entry.relationships.length ? (
              <ul className="cv2-connections">
                {entry.relationships.map((relationship) => (
                  <li key={`${relationship.type}:${relationship.kind}:${relationship.slug}`}>
                    <span>
                      {connectionName[relationship.type]} ·{" "}
                      {relationship.scope.replaceAll("/", " / ")}
                    </span>
                    <Link
                      href={canonicalCodexHref(relationship.kind, relationship.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {canonicalCodexName(relationship.kind, relationship.slug)} ↗
                    </Link>
                    <p>{relationship.why}</p>
                    {relationship.review_status !== "REVIEWED" ? (
                      <small>Proposed educational connection · not a prerequisite gate</small>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No musical connections are available for this entry yet.</p>
            )}
          </section>
        ) : null}
      </div>

      {openTerm ? (
        <DefinitionDialog
          term={openTerm}
          onClose={closeTerm}
          onReadFull={(term) => {
            closeTerm();
            if (onReadDictionary) onReadDictionary(term);
            else router.push(`/codex/dictionary/${term.slug}`);
          }}
        />
      ) : null}
    </article>
  );
}
