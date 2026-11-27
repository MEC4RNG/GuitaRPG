"use client";

import { useRef, useState } from "react";
import contract from "@/domain/ux/studio-atlas-candidate.json";
import {
  AtlasBrand,
  AtlasButton,
  AtlasCompass,
  AtlasCover,
  AtlasDomainIcon,
  AtlasPanel,
  AtlasStatus,
  type AtlasDomain,
} from "./studio-atlas-primitives";

export function StudioAtlasGallery() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [paper, setPaper] = useState(true);

  return (
    <section className="studio-atlas" aria-labelledby="sa-title">
      <header className="sa-header">
        <AtlasBrand />
        <span className="sa-edition">Design review · F1</span>
      </header>
      <section className="sa-hero" aria-labelledby="sa-title">
        <div className="sa-hero-copy">
          <p className="sa-eyebrow">The visual foundation</p>
          <h1 id="sa-title">A world of musical discovery.</h1>
          <p>
            Studio Atlas combines the precision of a studio, the spirit of an explorer and the
            clarity of a personal journal.
          </p>
          <div className="sa-actions">
            <AtlasButton ref={trigger} onClick={() => dialog.current?.showModal()}>
              Preview contextual panel
            </AtlasButton>
            <a className="sa-button sa-button--secondary" href="#sa-components">
              View components
            </a>
          </div>
        </div>
        <div className="sa-hero-art" aria-hidden="true">
          <AtlasCompass className="sa-hero-compass" />
        </div>
      </section>
      <p className="sa-preview-note">
        Design-system preview only. Illustrative content; no Player data or changes to the active
        application theme.
      </p>
      <section aria-labelledby="sa-colors">
        <h2 id="sa-colors">The palette</h2>
        <div className="sa-swatches">
          {(["canvas", "panel", "raised", "brand", "discovery", "paper"] as const).map((key) => (
            <div className="sa-swatch" key={key}>
              <div className={`sa-swatch-color sa-swatch-color--${key}`} aria-hidden="true" />
              <strong>{key}</strong>
              <code>{contract.colors[key]}</code>
            </div>
          ))}
        </div>
      </section>
      <section aria-labelledby="sa-domains">
        <div className="sa-section-title">
          <h2 id="sa-domains">Six musical domains</h2>
          <p>Distinct identities, not ratings or unlock states.</p>
        </div>
        <div className="sa-domain-grid">
          {contract.domains.map((domain) => (
            <article className="sa-domain" data-domain={domain.slug} key={domain.slug}>
              <span className="sa-domain-icon">
                <AtlasDomainIcon domain={domain.slug as AtlasDomain} />
              </span>
              <h3>{domain.name}</h3>
            </article>
          ))}
        </div>
      </section>
      <section aria-labelledby="sa-components">
        <h2 id="sa-components">Reusable components</h2>
        <div className="sa-component-grid">
          <AtlasPanel eyebrow="Quest card" title="Melodic Navigation" className="sa-quest-sample">
            <p>Scale-Degree Recognition · Explore</p>
            <div className="sa-actions">
              <AtlasStatus kind="information">Target challenge · example</AtlasStatus>
              <AtlasStatus kind="estimated">Estimated II</AtlasStatus>
            </div>
            <p>Use the relationship between a melody and its tonal center to guide your playing.</p>
            <AtlasButton onClick={() => dialog.current?.showModal()}>Preview activity</AtlasButton>
          </AtlasPanel>
          <AtlasPanel eyebrow="Interface states" title="Clear feedback">
            <div className="sa-status-list">
              <AtlasStatus kind="success">Saved</AtlasStatus>
              <AtlasStatus kind="warning">Pending save</AtlasStatus>
              <AtlasStatus kind="danger">Revision conflict</AtlasStatus>
              <AtlasStatus kind="information">Reference</AtlasStatus>
              <AtlasStatus kind="estimated">Estimated proficiency</AtlasStatus>
              <AtlasStatus kind="unknown">Unrated</AtlasStatus>
            </div>
            <div className="sa-actions">
              <AtlasButton variant="secondary" onClick={() => dialog.current?.showModal()}>
                Secondary action
              </AtlasButton>
              <AtlasButton disabled>Unavailable</AtlasButton>
            </div>
          </AtlasPanel>
        </div>
      </section>
      <section aria-labelledby="sa-journal">
        <div className="sa-section-title">
          <h2 id="sa-journal">The musical journal</h2>
          <p>Recognizable covers and quiet, readable document surfaces.</p>
        </div>
        <div className="sa-journal-grid">
          <div className="sa-covers">
            <AtlasCover domain="fretboard" title="Melodic Study" detail="Study · sample cover" />
            <AtlasCover
              domain="harmony_theory"
              title="Harmony Notes"
              detail="Reference · sample cover"
            />
            <AtlasCover
              domain="creativity_expression"
              title="Original Ideas"
              detail="Composition · sample cover"
            />
          </div>
          <div className={`sa-reading${paper ? " sa-reading--paper" : ""}`}>
            <p className="sa-eyebrow">Workbook / Melodic Study</p>
            <h3>Hear the tonal home</h3>
            <p>
              Listen to a tonic reference. Try to anticipate the destination of a short phrase
              before playing it.
            </p>
            <p className="sa-music-example">C · E · G · C</p>
            <p>Example note names, not a score or assessment.</p>
            <button
              className="sa-reading-toggle"
              type="button"
              aria-pressed={!paper}
              onClick={() => setPaper((value) => !value)}
            >
              Dark reading surface
            </button>
          </div>
        </div>
      </section>
      <dialog
        ref={dialog}
        className="sa-dialog"
        aria-labelledby="sa-dialog-title"
        onClose={() => {
          // Native dialog restores the invoking control; preserve that behavior.
          if (document.activeElement === document.body) trigger.current?.focus();
        }}
      >
        <p className="sa-eyebrow">Contextual reference · sample</p>
        <h2 id="sa-dialog-title">Scale-Degree Recognition</h2>
        <p>
          Recognize a pitch by its relationship to the tonic. A reference panel should support your
          activity without taking you away from it.
        </p>
        <form method="dialog">
          <AtlasButton type="submit">Return to preview</AtlasButton>
        </form>
      </dialog>
    </section>
  );
}
