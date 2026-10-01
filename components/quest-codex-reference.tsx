import Link from "next/link";

import type { QuestCodexReference } from "@/lib/quest/codex-references";

export function CodexReferenceLink({ reference }: { reference: QuestCodexReference }) {
  const name = reference.href ? (
    <Link className="quest-codex-link" href={reference.href}>
      {reference.name}
    </Link>
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
