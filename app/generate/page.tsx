import type { Metadata } from "next";

import { FoundationPage } from "@/components/foundation-page";

export const metadata: Metadata = { title: "Generate" };

export default function GeneratePage() {
  return (
    <FoundationPage
      eyebrow="PLAY · GENERATE"
      title="Build the next quest."
      description="Quick, Custom, and Training generation will all resolve into the canonical Quest contract."
      milestone="Quest Engine implementation"
      contract="QST-001 defines the object this screen must produce. No placeholder randomizer is being substituted for that engine."
    />
  );
}
