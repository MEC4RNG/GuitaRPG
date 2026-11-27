"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { readHomeOverview, type HomeOverview } from "@/lib/ux/home-overview";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AtlasBrand, AtlasCompass, AtlasDomainIcon, AtlasStatus, type AtlasDomain } from "./studio-atlas-primitives";

const visitorFeatures: Array<{ title: string; text: string; domain: AtlasDomain }> = [
  { title: "Practice with purpose", text: "Generate focused guitar quests with musical goals, constraints and a clear challenge to work toward.", domain: "technique" },
  { title: "Explore music on your terms", text: "Investigate music theory, technique and musicianship through Map, Explore and Craft, then apply what you discover.", domain: "fretboard" },
  { title: "Build your musical journal", text: "Keep personal notes, tablature and chord diagrams together in your own Workbooks.", domain: "creativity_expression" },
  { title: "See your development", text: "Record practice and use evidence-informed training recommendations to choose what to work on next.", domain: "rhythm" },
  { title: "Discover the Codex", text: "Explore a library of musical skills, concepts and references whenever inspiration strikes.", domain: "harmony_theory" },
  { title: "Make practice your own", text: "Set your goals, tuning and challenge preferences so training reflects the music you want to play.", domain: "ear_musicianship" },
];

export function StudioAtlasHome() {
  const [overview, setOverview] = useState<HomeOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
    let observedOwner: string | null | undefined;
    let active = true;
    let generation = 0;
    const load = async () => {
      const request = ++generation;
      setOverview(null);
      setFailed(false);
      try {
        const result = await readHomeOverview(client);
        if (active && request === generation) setOverview(result);
      } catch {
        if (active && request === generation) setFailed(true);
      }
    };
    let timer = window.setTimeout(() => void load(), 0);
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        observedOwner = session?.user.id ?? null;
        return;
      }
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      const owner = session?.user.id ?? null;
      if (event !== "USER_UPDATED" && observedOwner === owner) return;
      observedOwner = owner;
      generation += 1;
      setOverview(null);
      setFailed(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void load(), 0);
    });
    return () => {
      active = false;
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [attempt]);

  return (
    <section className="studio-atlas sa-home" aria-labelledby="sa-home-title">
      <header className="sa-header">
        <AtlasBrand />
        <Link className="sa-button sa-button--secondary" href="/profile">
          Player profile
        </Link>
      </header>
      {overview?.kind === "player" ? (
        <h1 id="sa-home-title">
          {overview.name ? `Welcome, ${overview.name}` : "Your musical journey"}
        </h1>
      ) : (
        <h1 id="sa-home-title">Your musical journey</h1>
      )}
      {failed ? (
        <section className="sa-panel" role="alert">
          <h2>Your journey is unavailable</h2>
          <p>We could not verify your Player or current practice. Your saved work is unchanged.</p>
          <button
            className="sa-button sa-button--primary"
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry dashboard
          </button>
        </section>
      ) : !overview ? (
        <p role="status">Loading your musical journey…</p>
      ) : overview.kind === "visitor" || overview.kind === "setup" ? (
        <section className="sa-hero">
          <div className="sa-hero-copy">
            <p className="sa-eyebrow">Discover · Develop · Create</p>
            <h2>Make your next musical discovery.</h2>
            <p>
              {overview.kind === "setup"
                ? "Finish your Player setup to personalize your practice."
                : "Explore focused guitar quests, meaningful practice and your own musical journal."}
            </p>
            <div className="sa-actions">
              <Link className="sa-button sa-button--primary" href="/onboarding">
                {overview.kind === "setup" ? "Continue setup" : "Start playing"}
              </Link>
              <Link className="sa-button sa-button--secondary" href="/profile">
                Access your Player
              </Link>
            </div>
          </div>
          <div className="sa-hero-art" aria-hidden="true">
            <AtlasCompass className="sa-hero-compass" />
          </div>
        </section>
      ) : (
        <>
          {overview.anonymous ? (
            <div className="sa-panel sa-home-guest">
              <p>
                You are practicing as a guest. Protect your progress to recover it on another
                device.
              </p>
              <Link className="sa-button sa-button--secondary" href="/profile">
                Protect your progress
              </Link>
            </div>
          ) : null}
          <section className="sa-hero">
            <div className="sa-hero-copy">
              <p className="sa-eyebrow">
                {overview.action.kind === "session"
                  ? "Resume practice"
                  : overview.action.kind === "quest"
                    ? "Your Quest"
                    : "Explore"}
              </p>
              <h2>{overview.action.title}</h2>
              <p>{overview.action.detail}</p>
              <div className="sa-actions">
                <Link className="sa-button sa-button--primary" href={overview.action.href}>
                  {overview.action.label}
                </Link>
                {overview.action.kind === "quest" ? (
                  <Link className="sa-button sa-button--secondary" href="/generate">
                    Quick Quest
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="sa-hero-art" aria-hidden="true">
              <AtlasCompass className="sa-hero-compass" />
            </div>
          </section>
          <div className="sa-component-grid">
            <section className="sa-panel" aria-labelledby="sa-home-training">
              <p className="sa-eyebrow">Next practice</p>
              <h2 id="sa-home-training">Today&apos;s training</h2>
              {overview.training?.uniqueTop ? (
                <>
                  <h3>{overview.training.uniqueTop.skill}</h3>
                  <p>{overview.training.uniqueTop.intentLabel}</p>
                  <p>{overview.training.uniqueTop.reasons[0]}</p>
                </>
              ) : overview.training?.isTopTie ? (
                <p>Several targets have equal priority. Choose a focus in Training.</p>
              ) : overview.training ? (
                <p>No supported recommendation is available yet.</p>
              ) : (
                <p>Training recommendations are unavailable.</p>
              )}
              <p>
                Based on stored evidence. Open Training to refresh readiness and select a target.
              </p>
              <Link className="sa-button sa-button--secondary" href="/training">
                Open Training
              </Link>
            </section>
            <section className="sa-panel" aria-labelledby="sa-home-development">
              <p className="sa-eyebrow">Recorded development</p>
              <h2 id="sa-home-development">Your progress</h2>
              {overview.progress ? (
                <>
                  <h3>Character Level {overview.progress.progress.level}</h3>
                  <p>{overview.progress.progress.practiceXp.toLocaleString()} practice XP</p>
                  <progress
                    className="sa-home-progress"
                    aria-label="Practice XP toward next Character Level"
                    max={100}
                    value={overview.progress.progress.progressPercent}
                  />
                  <p>
                    {overview.progress.progress.xpIntoLevel.toLocaleString()} /{" "}
                    {overview.progress.progress.xpForNextLevel.toLocaleString()} XP toward next
                    level.
                  </p>
                </>
              ) : (
                <p>Practice XP is unavailable.</p>
              )}
              {overview.training?.uniqueTop ? (
                <>
                  <p>Training focus: {overview.training.uniqueTop.skill}</p>
                  <AtlasStatus
                    kind={
                      overview.training.uniqueTop.source.candidate.skill.assessment_status ===
                      "ESTIMATED"
                        ? "estimated"
                        : overview.training.uniqueTop.source.candidate.skill.assessment_status ===
                            "ESTABLISHED"
                          ? "information"
                          : "unknown"
                    }
                  >
                    {overview.training.uniqueTop.source.candidate.skill.assessment_status}
                    {overview.training.uniqueTop.source.candidate.skill.visible_level
                      ? ` · Level ${overview.training.uniqueTop.source.candidate.skill.visible_level}`
                      : ""}
                  </AtlasStatus>
                </>
              ) : null}
              <p>Practice XP reflects effort, not overall musical ability.</p>
              <Link className="sa-button sa-button--secondary" href="/character">
                View development
              </Link>
            </section>
          </div>
          <section className="sa-panel" aria-labelledby="sa-home-workbooks">
            <h2 id="sa-home-workbooks">Recent Workbooks</h2>
            {overview.workbooks === null ? (
              <p>Workbook metadata is unavailable.</p>
            ) : overview.workbooks.length === 0 ? (
              <p>Your musical journal starts here. Capture an idea or save something you learn.</p>
            ) : (
              <ul className="sa-home-notebooks">
                {overview.workbooks.map((book) => (
                  <li key={book.id}>
                    <span className="sa-home-notebook-art" aria-hidden="true">
                      <AtlasCompass />
                    </span>
                    <strong>{book.title}</strong>
                    <span>{book.kind === "QUICK_NOTES" ? "Quick notes" : "Workbook"}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link className="sa-button sa-button--secondary" href="/workbooks">
              Open Workbooks
            </Link>
          </section>
        </>
      )}
      {overview?.kind === "visitor" || overview?.kind === "setup" ? (
        <section aria-labelledby="sa-visitor-features">
          <div className="sa-section-title">
            <h2 id="sa-visitor-features">Make every practice count</h2>
            <p>Find your own way through music.</p>
          </div>
          <div className="sa-home-module-grid">
            {visitorFeatures.map((feature) => (
              <article className="sa-panel sa-visitor-feature" data-domain={feature.domain} key={feature.title}>
                <span className="sa-domain-icon"><AtlasDomainIcon domain={feature.domain} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
          <div className="sa-actions sa-visitor-cta">
            <Link className="sa-button sa-button--primary" href="/onboarding">
              {overview.kind === "setup" ? "Finish Player setup" : "Create your Player"}
            </Link>
            <Link className="sa-button sa-button--secondary" href="/profile">Sign in or protect your progress</Link>
          </div>
        </section>
      ) : overview?.kind === "player" ? (
        <>
          <section className="sa-panel" aria-labelledby="sa-home-quests">
            <h2 id="sa-home-quests">Recent Quests</h2>
            {overview.recentQuests === null ? <p>Recent Quests are unavailable.</p> : overview.recentQuests.length === 0 ? <p>Your discoveries will appear here after you save or start a Quest.</p> : (
              <ul className="sa-home-notebooks sa-home-quests">
                {overview.recentQuests.map((quest) => (
                  <li key={quest.id}>
                    <Link className="sa-home-quest-card" href={`/quest/${quest.id}`}>
                      <span className="sa-home-notebook-art" aria-hidden="true"><AtlasCompass /></span>
                      <strong>{quest.title}</strong>
                      <span>{quest.skill}</span>
                      <small>{quest.status} · {quest.stage}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link className="sa-button sa-button--secondary" href="/quests">Open Quest library</Link>
          </section>
          <div className="sa-home-module-grid">
            <section className="sa-panel sa-boredom-buster" aria-labelledby="sa-boredom">
              <p className="sa-eyebrow">Daily challenge</p>
              <h2 id="sa-boredom">Boredom Buster</h2>
              <p>A fresh, focused one-Skill challenge. Around 10 minutes, with a different seeded selection each UTC day.</p>
              {overview.action.kind === "session" ? <p>Finish or resume your current Session first.</p> : (
                <Link className="sa-button sa-button--primary" href="/generate?daily=1">Explore today&apos;s challenge</Link>
              )}
            </section>
            <section className="sa-panel" aria-labelledby="sa-codex-discovery">
              <p className="sa-eyebrow">Codex discovery · {overview.codex.kind === "SKILL" ? "Skill" : "Concept"}</p>
              <h2 id="sa-codex-discovery">{overview.codex.name}</h2>
              <p>{overview.codex.definition}</p>
              <Link className="sa-button sa-button--secondary" href={overview.codex.href}>Read Codex entry</Link>
            </section>
            <section className="sa-panel" aria-labelledby="sa-practice-setup">
              <p className="sa-eyebrow">Make it yours</p>
              <h2 id="sa-practice-setup">Practice setup</h2>
              {overview.preferences ? (
                <dl className="sa-home-details">
                  <div><dt>Typical session</dt><dd>{overview.preferences.typicalSessionMinutes === null ? "Not set" : `${overview.preferences.typicalSessionMinutes} min`}</dd></div>
                  <div><dt>Challenge</dt><dd>{overview.preferences.challengePreference.replaceAll("_", " ").toLowerCase()}</dd></div>
                  <div><dt>Default tuning</dt><dd>{overview.preferences.tunings.find((tuning) => tuning.id === overview.preferences?.defaultTuningContextId)?.name ?? "Not set"}</dd></div>
                </dl>
              ) : <p>Practice preferences are unavailable.</p>}
              <p>Custom warm-up routines are planned.</p>
              <Link className="sa-button sa-button--secondary" href="/profile#profile-preferences-title">Edit practice preferences</Link>
            </section>
            <section className="sa-panel" aria-labelledby="sa-learning-path">
              <p className="sa-eyebrow">Your direction</p>
              <h2 id="sa-learning-path">Learning path</h2>
              {overview.preferences === null ? <p>Your goals are unavailable.</p> : overview.preferences.goals.length === 0 ? <p>Choose Skills or musical domains to shape your personal learning direction.</p> : (
                <ul className="sa-home-goals">
                  {overview.preferences.goals.slice(0, 4).map((goal, index) => (
                    <li key={goal.id ?? index}>{goal.kind === "OBJECTIVE" ? goal.objective : (goal.kind === "SKILL" ? overview.preferences?.skills : overview.preferences?.domains)?.find((entity) => entity.id === goal.targetId)?.name ?? "Goal reference unavailable"}</li>
                  ))}
                </ul>
              )}
              <p>{overview.training?.uniqueTop ? `Current training focus: ${overview.training.uniqueTop.skill}` : "Your Skill evidence is available in the Skills library."}</p>
              <div className="sa-actions">
                <Link className="sa-button sa-button--secondary" href="/skills">Explore your Skills</Link>
                <Link className="sa-button sa-button--quiet" href="/profile#profile-goals-title">Set goals</Link>
              </div>
            </section>
          </div>
        </>
      ) : null}
      <p className="sa-preview-note">
        F2 dashboard preview · actual Player records when available. Existing production routes
        remain unchanged.
      </p>
    </section>
  );
}
