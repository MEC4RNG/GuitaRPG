import { ResultCompletionSurface } from "@/components/result-completion-surface";

export default async function CompleteSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ResultCompletionSurface sessionId={sessionId} />;
}
