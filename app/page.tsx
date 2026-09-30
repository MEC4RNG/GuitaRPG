import Link from "next/link";

import { Panel } from "@/components/panel";

export default function Home() {
  return (
    <div className="home-stack">
      <section className="hero">
        <div className="hero__copy">
          <span className="hero__kicker">PRACTICE · PROGRESS · ADAPT</span>
          <h1>TURN PRACTICE INTO A QUEST.</h1>
          <p>
            Generate focused guitar practice, record what happened, build evidence over time, and
            use that history to choose what matters next.
          </p>

          <div className="hero__actions">
            <Link className="action-button action-button--primary" href="/generate">
              Generate Quest
            </Link>
            <Link className="action-button action-button--secondary" href="/training">
              Recommended Training
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

      <section className="home-grid" aria-label="Practice tools">
        <Panel raised>
          <span className="panel__label">QUICK START</span>
          <h2>Build a focused Quest</h2>
          <p>
            Create a concrete practice objective with musical targets, constraints, and a challenge
            level you control.
          </p>
          <Link className="text-link" href="/generate">
            Go to Generate <span aria-hidden="true">→</span>
          </Link>
        </Panel>

        <Panel>
          <span className="panel__label">TRAINING</span>
          <h2>Practice what matters next</h2>
          <p>
            Use current Skill evidence, goals, readiness, and challenge preference to choose useful
            recommended work.
          </p>
          <Link className="text-link" href="/training">
            Open Training <span aria-hidden="true">→</span>
          </Link>
        </Panel>

        <Panel className="panel--wide">
          <span className="panel__label">DEVELOPMENT</span>
          <h2>Build evidence, not fake ratings</h2>
          <p>
            Skills begin UNRATED. Practice Results build evidence while proficiency, confidence, and
            readiness stay distinct. XP represents engagement, not guitar ability.
          </p>
          <Link className="text-link" href="/skills">
            Open Skills <span aria-hidden="true">→</span>
          </Link>
        </Panel>
      </section>
    </div>
  );
}
