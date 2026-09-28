import Link from "next/link";

import { Panel } from "@/components/panel";

export default function Home() {
  return (
    <div className="home-stack">
      <section className="hero">
        <div className="hero__copy">
          <span className="hero__kicker">PHASE 1 · PRODUCT FOUNDATION</span>
          <h1>TURN PRACTICE INTO A QUEST.</h1>
          <p>
            GuitaRPG is becoming a structured practice system: generate focused work, record what
            happened, build evidence, and use that history to choose the next useful challenge.
          </p>

          <div className="hero__actions">
            <Link className="action-button action-button--primary" href="/onboarding">
              Set up your Player
            </Link>
            <Link className="action-button action-button--secondary" href="/training">
              Training
            </Link>
          </div>
        </div>

        <div className="hero__signal" aria-label="Core loop">
          <span className="hero__signal-label">CORE LOOP</span>
          <ol>
            <li>
              <strong>01</strong>
              <span>Generate</span>
            </li>
            <li>
              <strong>02</strong>
              <span>Practice</span>
            </li>
            <li>
              <strong>03</strong>
              <span>Complete</span>
            </li>
            <li>
              <strong>04</strong>
              <span>Progress</span>
            </li>
            <li>
              <strong>05</strong>
              <span>Adapt</span>
            </li>
          </ol>
        </div>
      </section>

      <section className="home-grid" aria-label="Product foundation">
        <Panel raised>
          <span className="panel__label">QUICK START</span>
          <h2>Generate a practice objective</h2>
          <p>
            The generator route is live in the application shell. Quest construction arrives in the
            dedicated Quest Engine implementation phase.
          </p>
          <Link className="text-link" href="/generate">
            Go to Generate <span aria-hidden="true">→</span>
          </Link>
        </Panel>

        <Panel>
          <span className="panel__label">DEVELOPMENT</span>
          <h2>Track skills without fake ratings</h2>
          <p>
            Skills begin UNRATED. Player evidence, confidence, readiness, and proficiency will be
            persisted when the Player foundation tickets land.
          </p>
          <Link className="text-link" href="/skills">
            Open Skills <span aria-hidden="true">→</span>
          </Link>
        </Panel>

        <Panel className="panel--wide">
          <span className="panel__label">SYSTEM STATUS</span>
          <div className="system-status">
            <div>
              <strong>Phase 0</strong>
              <span>Architecture & contracts</span>
              <span className="status-chip status-chip--success">
                <span aria-hidden="true">✓</span> Complete
              </span>
            </div>
            <div>
              <strong>Phase 1</strong>
              <span>Product foundation</span>
              <span className="status-chip status-chip--info">
                <span aria-hidden="true">●</span> In progress
              </span>
            </div>
            <div>
              <strong>Production cutover</strong>
              <span>Legacy site preserved</span>
              <span className="status-chip">
                <span aria-hidden="true">—</span> Not authorized
              </span>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}
