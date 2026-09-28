import type { Metadata } from "next";

import { FoundationPage } from "@/components/foundation-page";

export const metadata: Metadata = { title: "Codex" };

export default function CodexPage() {
  return (
    <FoundationPage
      eyebrow="LEARN · CODEX"
      title="The musical reference layer."
      description="Skills, Concepts, Contexts, Constraints, and relationships will connect practice to concise learning material."
      milestone="Canonical taxonomy seed + Codex content model"
      contract="The Codex consumes the TAX-001 vocabulary; it does not invent a second classification system for educational content."
    />
  );
}
