import type { Metadata } from "next";

import { FoundationPage } from "@/components/foundation-page";

export const metadata: Metadata = { title: "Skills" };

export default function SkillsPage() {
  return (
    <FoundationPage
      eyebrow="DEVELOPMENT · SKILLS"
      title="Skill development."
      description="Proficiency, confidence, readiness, exposure, and evidence will remain distinct states."
      milestone="Canonical taxonomy + Player state persistence"
      contract="TAX-001 and PLY-001 require UNRATED to remain different from Level I and prevent tuning/context from duplicating skills."
    />
  );
}
