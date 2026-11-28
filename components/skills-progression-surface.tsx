"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";
import { usePlayerProgression } from "./use-player-progression";

import { PageHeader } from "./page-header";
import {
  DOMAIN_ORDER,
  filterSkills,
  formatRecency,
  groupSkillsByDomain,
  type SkillFilters,
  type SkillView,
} from "@/lib/progression/read-model";
import { readSkillsProgression, type ProgressionReadClient } from "@/lib/progression/repository";
import type { createBrowserSupabaseClient } from "@/lib/supabase/client";

const readPlayerSkills = (client: ReturnType<typeof createBrowserSupabaseClient>) =>
  readSkillsProgression(client as unknown as ProgressionReadClient);

const publicSkills: SkillView[] = CODEX_ENTRIES.filter((entry) => entry.kind === "SKILL").map(
  (entry) => ({
    id: entry.id,
    slug: entry.slug,
    name: entry.name,
    domain: entry.domain?.name ?? "Domain unavailable",
    projectionAvailable: false,
    assessmentStatus: "UNAVAILABLE",
    visibleLevel: null,
    proficiencyScore: null,
    confidenceScore: null,
    readinessStatus: "UNAVAILABLE",
    readinessScore: null,
    exposureCount: null,
    evidenceCount: null,
    lastPracticedAt: null,
    lastEvidenceAt: null,
  }),
);
const DEFAULT_FILTERS: SkillFilters = { search: "", domain: "ALL", assessment: "ALL" };

function StateLabel({ value }: { value: string }) {
  return (
    <span className={`progression-state progression-state--${value.toLowerCase()}`}>{value}</span>
  );
}

function SkillRow({ skill, browsing }: { skill: SkillView; browsing: boolean }) {
  const reference = CODEX_ENTRIES.find((entry) => entry.kind === "SKILL" && entry.id === skill.id);
  return (
    <details
      className="skill-row skill-card"
      data-testid="skill-row"
      data-tier={browsing ? "unrated" : (skill.visibleLevel ?? "unrated").toLowerCase()}
    >
      <summary>
        <span className="skill-row__identity">
          <strong>{skill.name}</strong>
          <small>{skill.domain}</small>
        </span>
        {browsing ? (
          <span className="skill-row__state">Discover this Skill</span>
        ) : (
          <>
            <span className="skill-row__state">
              <StateLabel value={skill.assessmentStatus} />
              <span>{skill.visibleLevel ? `Level ${skill.visibleLevel}` : "No Skill Level"}</span>
            </span>
            <span className="skill-row__readiness">
              <small>READINESS</small>
              <strong>{skill.readinessStatus}</strong>
            </span>
          </>
        )}
        <span aria-hidden="true" className="skill-row__disclosure">
          ▾
        </span>
      </summary>
      {reference ? (
        <div className="skill-card-reference">
          <p>{reference.definition}</p>
          <Link href={reference.href}>Read Codex reference →</Link>
        </div>
      ) : null}
      {browsing ? (
        <p className="skill-row__unavailable">Start your journey to track this Skill.</p>
      ) : skill.projectionAvailable ? (
        <dl className="skill-detail">
          <div>
            <dt>Proficiency</dt>
            <dd>
              {skill.proficiencyScore === null
                ? "Insufficient evidence"
                : `${skill.proficiencyScore.toFixed(2)} / 100`}
            </dd>
          </div>
          <div>
            <dt>System confidence</dt>
            <dd>
              {skill.assessmentStatus === "UNRATED"
                ? "Not rated"
                : `${skill.confidenceScore?.toFixed(0)} / 100`}
            </dd>
          </div>
          <div>
            <dt>Current readiness</dt>
            <dd>
              {skill.readinessScore === null
                ? skill.readinessStatus
                : `${skill.readinessStatus} · ${skill.readinessScore.toFixed(2)}`}
            </dd>
          </div>
          <div>
            <dt>Practice exposures</dt>
            <dd>{skill.exposureCount}</dd>
          </div>
          <div>
            <dt>Informative evidence</dt>
            <dd>{skill.evidenceCount}</dd>
          </div>
          <div>
            <dt>Last practiced</dt>
            <dd>{formatRecency(skill.lastPracticedAt, "No recorded practice")}</dd>
          </div>
          <div>
            <dt>Last evidence</dt>
            <dd>{formatRecency(skill.lastEvidenceAt, "No evidence yet")}</dd>
          </div>
        </dl>
      ) : (
        <p className="skill-row__unavailable" role="status">
          This Skill projection is unexpectedly unavailable. It has not been treated as Level I.
        </p>
      )}
    </details>
  );
}

export function SkillsProgressionSurface() {
  const { state, retry } = usePlayerProgression(readPlayerSkills);
  const browsing = state.kind === "visitor" || state.kind === "setup";
  const result = state.kind === "player" ? state.value : null;
  const skills = browsing ? publicSkills : (result?.skills ?? []);
  const [filters, setFilters] = useState<SkillFilters>(DEFAULT_FILTERS);
  const effectiveFilters = browsing ? { ...filters, assessment: "ALL" as const } : filters;
  const filtered = filterSkills(skills, effectiveFilters);
  const groups = useMemo(() => groupSkillsByDomain(filtered), [filtered]);

  return (
    <div className="progression-stack skills-progression">
      <PageHeader
        eyebrow="DEVELOPMENT · SKILLS"
        title="Skill development."
        description={
          browsing
            ? "Discover the musical Skills you can develop across six domains."
            : "Proficiency, system confidence, current readiness, exposure, and informative evidence remain separate signals."
        }
      />
      {browsing ? (
        <section className="skill-explainer">
          <h2>Start your journey to track progression</h2>
          <p>Browse every Skill without an account. Your levels appear once you build evidence.</p>
          <Link className="action-button action-button--primary" href="/onboarding?next=/skills">
            {state.kind === "setup" ? "Continue Player setup" : "Start playing"}
          </Link>
          <Link href="/profile">Access your Player</Link>
        </section>
      ) : null}
      {result && !result.readinessCurrent ? (
        <p className="session-notice" role="status">
          Readiness could not be refreshed. Other Skill data is shown, but readiness may not be
          current.
        </p>
      ) : null}
      {state.kind === "loading" ? (
        <p className="session-notice" role="status">
          Loading Skill progression…
        </p>
      ) : null}
      {state.kind === "error" ? (
        <div className="session-notice" role="alert">
          <p>Skill progression is unavailable right now.</p>
          <button className="action-button action-button--secondary" onClick={retry}>
            Retry
          </button>
        </div>
      ) : null}
      {skills.length ? (
        <>
          {!browsing ? (
          <section className="skill-explainer" aria-label="How to read Skill progression">
            <p>
              <strong>Proficiency</strong> is the demonstrated Skill estimate.{" "}
              <strong>System confidence</strong> is certainty in that estimate.
            </p>
            <p>
              <strong>Readiness</strong> is current preparedness relative to demonstrated
              proficiency; LOW readiness does not demote a Skill Level.
            </p>
          </section>
          ) : null}
          <form className="skill-filters" onSubmit={(event) => event.preventDefault()}>
            <label>
              Search Skills
              <input
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Search by Skill name"
                type="search"
                value={filters.search}
              />
            </label>
            <label>
              Domain
              <select
                onChange={(event) =>
                  setFilters((current) => ({ ...current, domain: event.target.value }))
                }
                value={filters.domain}
              >
                <option value="ALL">All Domains</option>
                {DOMAIN_ORDER.map((domain) => (
                  <option key={domain}>{domain}</option>
                ))}
              </select>
            </label>
            {!browsing ? (
            <label>
              Assessment status
              <select
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    assessment: event.target.value as SkillFilters["assessment"],
                  }))
                }
                value={filters.assessment}
              >
                <option value="ALL">All</option>
                <option value="UNRATED">UNRATED</option>
                <option value="ESTIMATED">ESTIMATED</option>
                <option value="ESTABLISHED">ESTABLISHED</option>
              </select>
            </label>
            ) : null}
          </form>
          <p className="skill-result-count" role="status">
            Showing {filtered.length} of {skills.length} active Skills
          </p>
          {groups.length ? (
            groups.map((group) => (
              <section
                className="skill-domain"
                aria-labelledby={`domain-${group.domain.replaceAll(" ", "-")}`}
                key={group.domain}
              >
                <header>
                  <h2 id={`domain-${group.domain.replaceAll(" ", "-")}`}>{group.domain}</h2>
                  <span>{group.skills.length} Skills</span>
                </header>
                <div className="skill-list">
                  {group.skills.map((skill) => (
                    <SkillRow key={skill.id} skill={skill} browsing={browsing} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <p className="session-notice">No Skills match these filters.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
