import type { Metadata } from "next";

import { OnboardingFlow } from "@/components/onboarding-flow";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <OnboardingFlow next={next} />;
}
