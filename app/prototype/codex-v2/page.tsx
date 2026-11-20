import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CodexV2Library } from "@/components/codex-v2-library";

export const metadata: Metadata = {
  title: "Codex V2 Design Preview",
  description: "Preview of the Sound Uncharted musical knowledge library.",
};

export default async function CodexV2PreviewPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  // Keep draft content out of the published Codex catalog and ordinary routes.
  const { readCodexV2DraftPreview } = await import("@/lib/codex/v2/preview");
  const catalog = readCodexV2DraftPreview();
  return <CodexV2Library entries={catalog.entries} terms={catalog.terms} />;
}
