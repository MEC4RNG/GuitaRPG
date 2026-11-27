import Link from "next/link";
import { AtlasCompass, AtlasDomainIcon, type AtlasDomain } from "./studio-atlas-primitives";
import { questDomainIdentity } from "@/lib/ux/quest-discovery";
import type { Quest } from "@/lib/quest/runtime";

export function AtlasQuestIdentity({ quest }: { quest: Quest }) {
  const domain = questDomainIdentity(quest);
  return (
    <div className="atlas-quest-identity" data-domain={domain?.slug}>
      <span className="sa-domain-icon" aria-hidden="true">
        {domain ? <AtlasDomainIcon domain={domain.slug as AtlasDomain} /> : <AtlasCompass />}
      </span>
      <div>
        <span className="sa-eyebrow">Musical domain</span>
        <strong>{domain?.name ?? "Domain unavailable"}</strong>
      </div>
    </div>
  );
}

export function AtlasQuestDiscovery({ daily }: { daily: boolean }) {
  return (
    <section className="atlas-discovery" aria-labelledby="atlas-discovery-title">
      <div className="sa-section-title">
        <h2 id="atlas-discovery-title">Choose your direction</h2>
        <p>Three ways to begin a musical adventure.</p>
      </div>
      <div className="atlas-discovery-grid">
        <article className="sa-panel atlas-discovery-option" data-current={!daily || undefined}>
          <span className="sa-eyebrow">{daily ? "Explore freely" : "Selected mode"}</span>
          <h3>Quick Quest</h3>
          <p>Discover a focused musical challenge in one click. Inspect it before choosing to save or begin.</p>
          {daily ? <Link className="sa-button sa-button--secondary" href="/generate">Open Quick Quest</Link> : <span className="atlas-mode-label">Generate using the action above</span>}
        </article>
        <article className="sa-panel atlas-discovery-option">
          <span className="sa-eyebrow">Develop deliberately</span>
          <h3>Recommended Training</h3>
          <p>Choose a practice target using your current Skill evidence, goals and challenge preferences.</p>
          <Link className="sa-button sa-button--secondary" href="/training">Explore Training</Link>
        </article>
        <article className="sa-panel atlas-discovery-option" data-current={daily || undefined}>
          <span className="sa-eyebrow">{daily ? "Selected mode" : "Daily discovery"}</span>
          <h3>{daily ? "Daily challenge" : "Boredom Buster"}</h3>
          <p>Try a short one-Skill challenge with a daily seed. No streaks or special rewards required.</p>
          {daily ? <span className="atlas-mode-label">Generate using the action above</span> : <Link className="sa-button sa-button--secondary" href="/generate?daily=1">Open daily challenge</Link>}
        </article>
      </div>
      <Link className="sa-button sa-button--quiet" href="/quests">Browse your Quest library</Link>
    </section>
  );
}
