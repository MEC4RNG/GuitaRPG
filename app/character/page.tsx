import type { Metadata } from "next";

import { FoundationPage } from "@/components/foundation-page";

export const metadata: Metadata = { title: "Character" };

export default function CharacterPage() {
  return (
    <FoundationPage
      eyebrow="DEVELOPMENT · CHARACTER"
      title="Character progression."
      description="Character Level, Practice XP, Attributes, and milestones will summarize development without pretending to be an overall guitar rating."
      milestone="Player persistence + progression views"
      contract="PLY-001 and PROG-001 remain authoritative: XP measures engagement; Attributes derive from skill development."
    />
  );
}
