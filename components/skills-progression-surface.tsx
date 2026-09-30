"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const client = () => createBrowserSupabaseClient() as unknown as ProgressionReadClient;
const DEFAULT_FILTERS: SkillFilters = { search: "", domain: "ALL", assessment: "ALL" };

function StateLabel({ value }: { value: string }) {
  return (
    <span className={`progression-state progression-state--${value.toLowerCase()}`}>{value}</span>
  );
}

function SkillRow({ skill }: { skill: SkillView }) {
  return (
    <details className="skill-row" data-testid="skill-row">
      <summary>
        <span className="skill-row__identity">
          <strong>{skill.name}</strong>
          <small>{skill.domain}</small>
        </span>
        <span className="skill-row__state">
          <StateLabel value={skill.assessmentStatus} />
          <span>{skill.visibleLevel ? `Level ${skill.visibleLevel}` : "No Skill Level"}</span>
        </span>
        <span className="skill-row__readiness">
          <small>READINESS</small>
          <strong>{skill.readinessStatus}</strong>
        </span>
        <span aria-hidden="true" className="skill-row__disclosure">
          +
        </span>
      </summary>
      {skill.projectionAvailable ? (
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
  const [skills, setSkills] = useState<SkillView[]>([]);
  const [filters, setFilters] = useState<SkillFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [readinessCurrent, setReadinessCurrent] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await readSkillsProgression(client());
      setSkills(result.skills);
      setReadinessCurrent(result.readinessCurrent);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const filtered = useMemo(() => filterSkills(skills, filters), [skills, filters]);
  const groups = useMemo(() => groupSkillsByDomain(filtered), [filtered]);

  return (
    <div className="progression-stack skills-progression">
      <PageHeader
        eyebrow="DEVELOPMENT · SKILLS"
        title="Skill development."
        description="Proficiency, system confidence, current readiness, exposure, and informative evidence remain separate signals."
      />
      {!readinessCurrent ? (
        <p className="session-notice" role="status">
          Readiness could not be refreshed. Other Skill data is shown, but readiness may not be
          current.
        </p>
      ) : null}
      {loading && !skills.length ? (
        <p className="session-notice" role="status">
          Loading Skill progression…
        </p>
      ) : null}
      {error ? (
        <div className="session-notice" role="alert">
          <p>Skill progression is unavailable right now.</p>
          <button className="action-button action-button--secondary" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}
      {skills.length ? (
        <>
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
                    <SkillRow key={skill.id} skill={skill} />
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
