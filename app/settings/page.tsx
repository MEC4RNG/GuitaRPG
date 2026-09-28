import type { Metadata } from "next";

import { FoundationPage } from "@/components/foundation-page";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <FoundationPage
      eyebrow="SYSTEM · SETTINGS"
      title="Practice environment."
      description="Application, accessibility, session, audio, and account preferences will be implemented here as their owning systems arrive."
      milestone="Persistent application preferences"
      contract="Settings will honor UX-001 accessibility rules and DATA-001 ownership/security boundaries."
    />
  );
}
