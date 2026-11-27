import type { Metadata } from "next";

import { GenerateQuestSurface } from "@/components/generate-quest-surface";
import { canAccessStudioAtlasPreview } from "@/lib/ux/studio-atlas-preview";

export const metadata: Metadata = { title: "Generate" };

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const daily = canAccessStudioAtlasPreview() && (await searchParams).daily === "1";
  return <GenerateQuestSurface daily={daily} />;
}
