"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { readHomeOverview, type HomeOverview } from "@/lib/ux/home-overview";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AtlasBrand, AtlasCompass, AtlasStatus } from "./studio-atlas-primitives";

export function StudioAtlasHome() {
  const [overview, setOverview] = useState<HomeOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const client = createBrowserSupabaseClient();
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
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
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
              <p>You are practicing as a guest. Protect your progress to recover it on another device.</p>
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
              <h2 id="sa-home-training">Today's training</h2>
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
              <p>Based on stored evidence. Open Training to refresh readiness and select a target.</p>
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
                    {overview.progress.progress.xpForNextLevel.toLocaleString()} XP toward next level.
                  </p>
                </>
              ) : (
                <p>Practice XP is unavailable.</p>
              )}
              {overview.training?.uniqueTop ? (
                <>
                  <p>Training focus: {overview.training.uniqueTop.skill}</p>
                  <AtlasStatus kind={overview.training.uniqueTop.source.candidate.skill.assessment_status === "ESTIMATED" ? "estimated" : "unknown"}>
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
      <nav className="sa-home-links" aria-label="Explore Sound Uncharted">
        {[
          ["/quests", "Quests"],
          ["/training", "Training"],
          ["/skills", "Skills"],
          ["/codex", "Codex"],
          ["/workbooks", "Workbooks"],
          ["/history", "History"],
        ].map(([href, label]) => (
          <Link className="sa-button sa-button--quiet" href={href} key={href}>
            {label}
          </Link>
        ))}
      </nav>
      <p className="sa-preview-note">F2 dashboard preview · actual Player records when available. Existing navigation and production routes remain unchanged.</p>
    </section>
  );
}
