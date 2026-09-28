import type { Metadata } from "next";
import Link from "next/link";

import { FoundationPage } from "@/components/foundation-page";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <FoundationPage
        eyebrow="SYSTEM · PROFILE"
        title="Player setup."
        description="Experience background, goals, preferred tunings, guitar setup, and practice preferences are Player-owned choices."
        milestone="Identity + Player profile persistence"
        contract="DATA-001 and PLY-001 define ownership and editable Player state. Self-declared experience will never directly grant proficiency."
      />
      <Link className="action-button action-button--secondary" href="/onboarding">
        Review Player setup
      </Link>
    </>
  );
}
