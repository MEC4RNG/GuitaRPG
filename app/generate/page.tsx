import type { Metadata } from "next";

import { GenerateQuestSurface } from "@/components/generate-quest-surface";
import { canAccessStudioAtlasPreview } from "@/lib/ux/studio-atlas-preview";

export const metadata: Metadata = { title: "Generate" };

// Resolve the preview gate at request time, including local production-mode E2E.
export const dynamic = "force-dynamic";

export default async function GeneratePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const atlas = canAccessStudioAtlasPreview();
  const daily = atlas && params.daily === "1";
  return <GenerateQuestSurface daily={daily} atlas={atlas} />;
}
