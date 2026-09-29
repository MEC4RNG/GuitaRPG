import type { Metadata } from "next";

import { GenerateQuestSurface } from "@/components/generate-quest-surface";

export const metadata: Metadata = { title: "Generate" };

export default function GeneratePage() {
  return <GenerateQuestSurface />;
}
