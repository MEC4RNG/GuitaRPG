import type { Metadata } from "next";

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
        description="Browse the canonical Skills, Concepts, Contexts, and Constraints used by GuitaRPG."
      />
      <CodexSurface entries={CODEX_ENTRIES} />
    </div>
  );
}
