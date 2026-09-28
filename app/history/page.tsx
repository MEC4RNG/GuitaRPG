import type { Metadata } from "next";

import { FoundationPage } from "@/components/foundation-page";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <FoundationPage
      eyebrow="DEVELOPMENT · HISTORY"
      title="Practice history."
      description="Quest attempts, evidence, outcomes, XP events, and progression changes will remain auditable rather than collapsing into one score."
      milestone="Session and evidence persistence"
      contract="EVD-001 and PROG-001 keep Results, verification, XP, and proficiency mutations as separate records."
    />
  );
}
