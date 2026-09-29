import type { Metadata } from "next";

import { HistoryDetailSurface } from "@/components/history-surface";

export const metadata: Metadata = { title: "Practice attempt" };

export default async function HistoryAttemptPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <HistoryDetailSurface sessionId={sessionId} />;
}
