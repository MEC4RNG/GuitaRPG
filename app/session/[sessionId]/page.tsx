import { SessionPracticeSurface } from "@/components/session-practice-surface";

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <SessionPracticeSurface sessionId={sessionId} />;
}
