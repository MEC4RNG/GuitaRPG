import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudioAtlasHome } from "@/components/studio-atlas-home";
import { canAccessStudioAtlasPreview } from "@/lib/ux/studio-atlas-preview";

import "../../../studio-atlas.css";
import "../../../studio-atlas-home.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Atlas Home Preview",
  robots: { index: false, follow: false },
};

export default function StudioAtlasHomePreviewPage() {
  if (!canAccessStudioAtlasPreview()) notFound();
  return <StudioAtlasHome />;
}
