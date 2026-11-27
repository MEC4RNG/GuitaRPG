import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CodexV2Library } from "@/components/codex-v2-library";
import { parseCodexQuestContext } from "@/lib/workbook/context";
import { canAccessCodexV2DraftPreview } from "@/lib/codex/v2/preview-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Codex V2 Design Preview",
  description: "Preview of the Sound Uncharted musical knowledge library.",
};

export default async function CodexV2PreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!canAccessCodexV2DraftPreview()) notFound();

  // Keep draft content out of the published Codex catalog and ordinary routes.
  const { readCodexV2DraftPreview } = await import("@/lib/codex/v2/preview");
  const catalog = readCodexV2DraftPreview();
  const requested = parseCodexQuestContext(await searchParams);
  const questContext =
    requested && catalog.entries.some((entry) => entry.slug === requested.skillSlug)
      ? requested
      : null;
  return (
    <CodexV2Library entries={catalog.entries} terms={catalog.terms} questContext={questContext} />
  );
}
