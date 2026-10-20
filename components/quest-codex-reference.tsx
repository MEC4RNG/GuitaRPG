import { useCodexPeek } from "@/components/codex-peek";
import type { QuestCodexReference } from "@/lib/quest/codex-references";

export function CodexReferenceLink({ reference }: { reference: QuestCodexReference }) {
  const { openPeek } = useCodexPeek();
  const name = reference.href ? (
    <button
      className="quest-codex-link"
      type="button"
      aria-label={`Open Codex Peek for ${reference.name}`}
      onClick={(event) => openPeek(reference, event.currentTarget)}
    >
      {reference.name}
    </button>
  ) : (
    reference.name
  );
  return (
    <>
      {name}
      {reference.parameter ? <span> · {reference.parameter}</span> : null}
    </>
  );
}

export function CodexReferenceList({
  references,
  empty = "None",
}: {
  references: QuestCodexReference[];
  empty?: string;
}) {
  if (!references.length) return empty;
  return references.map((reference, index) => (
    <span key={`${reference.role}-${reference.slug}`}>
      {index ? ", " : null}
      <CodexReferenceLink reference={reference} />
    </span>
  ));
}
