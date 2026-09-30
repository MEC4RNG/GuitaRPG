import type { Metadata } from "next";

import { SkillsProgressionSurface } from "@/components/skills-progression-surface";

export const metadata: Metadata = { title: "Skills" };

export default function SkillsPage() {
  return <SkillsProgressionSurface />;
}
