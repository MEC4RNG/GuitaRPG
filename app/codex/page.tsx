import type { Metadata } from "next";
import Link from "next/link";

import { CodexSurface } from "@/components/codex-surface";
import { PageHeader } from "@/components/page-header";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";
import { canAccessCodexV2DraftPreview } from "@/lib/codex/v2/preview-access";

export const metadata: Metadata = { title: "Codex" };

export default function CodexPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="LEARN · CODEX"
        title="Musical reference"
        description="Browse the canonical Skills, Concepts, Contexts, and Constraints used by Sound Uncharted."
      />
      {canAccessCodexV2DraftPreview() ? (
        <section className="cv2-preview-gateway" aria-label="Instructional library preview">
          <div>
            <span className="cv2-eyebrow">Studio Atlas · Learning library</span>
            <h2>Explore interactive musical Skills</h2>
            <p>Browse lessons, musical examples and the Music Dictionary in the draft library.</p>
          </div>
          <Link className="codex-detail-link" href="/prototype/codex-v2">
            Preview Codex V2 — draft instructional library ↗
          </Link>
        </section>
      ) : null}
      <CodexSurface entries={CODEX_ENTRIES} />
    </div>
  );
}
