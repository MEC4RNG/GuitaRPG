import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudioAtlasGallery } from "@/components/studio-atlas-gallery";
import { canAccessStudioAtlasPreview } from "@/lib/ux/studio-atlas-preview";

import "../../studio-atlas.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Studio Atlas Design System",
  robots: { index: false, follow: false },
};

export default function StudioAtlasPreviewPage() {
  if (!canAccessStudioAtlasPreview()) notFound();
  return <StudioAtlasGallery />;
}
