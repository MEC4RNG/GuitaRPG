import type { Metadata } from "next";

import { FoundationPage } from "@/components/foundation-page";

export const metadata: Metadata = { title: "Training" };

export default function TrainingPage() {
  return (
    <FoundationPage
      eyebrow="PLAY · TRAINING"
      title="Practice what matters next."
      description="Training will combine goals, proficiency, confidence, readiness, exposure, and recent evidence."
      milestone="Adaptive recommendation foundation"
      contract="The Training surface will consume PLY-001, DIF-001, PROG-001, and later TRN implementation rather than using generic difficulty presets."
    />
  );
}
