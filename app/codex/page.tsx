import type { Metadata } from "next";
import Link from "next/link";

import { CodexSurface } from "@/components/codex-surface";
import { PageHeader } from "@/components/page-header";
import { CODEX_ENTRIES } from "@/lib/codex/catalog-v1";

export const metadata: Metadata = { title: "Codex" };

export default function CodexPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="LEARN · CODEX"
        title="Musical reference"
        description="Browse the canonical Skills, Concepts, Contexts, and Constraints used by Sound Uncharted."
      />
      {process.env.VERCEL_ENV !== "production" ? (
        <p><Link className="codex-detail-link" href="/prototype/codex-v2">
          Preview Codex V2 — draft instructional library ↗
        </Link></p>
      ) : null}
      <CodexSurface entries={CODEX_ENTRIES} />
    </div>
  );
}
