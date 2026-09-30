import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CODEX_ENTRIES, getCodexEntry } from "@/lib/codex/catalog-v1";
type DetailProps = { params: Promise<{ kind: string; slug: string }> };
export function generateStaticParams() {
  return CODEX_ENTRIES.map((entry) => ({ kind: entry.href.split("/")[2], slug: entry.slug }));
}
export async function generateMetadata({ params }: DetailProps): Promise<Metadata> {
  const { kind, slug } = await params;
  const entry = getCodexEntry(kind, slug);
  return entry
    ? { title: `${entry.name} · Codex`, description: entry.definition }
    : { title: "Codex entry not found" };
}
export default async function CodexDetailPage({ params }: DetailProps) {
  const { kind, slug } = await params;
  const entry = getCodexEntry(kind, slug);
  if (!entry) notFound();
  const tuning = entry.kind === "CONTEXT" && entry.metadata.context_family === "TUNING";
  return (
    <article className="codex-article">
      <header>
        <span className="codex-kind">{entry.kind}</span>
        <h1>{entry.name}</h1>
        <p>{entry.definition}</p>
      </header>
      <dl className="codex-metadata">
        {entry.domain ? (
          <div>
            <dt>Domain</dt>
            <dd>{entry.domain.name}</dd>
          </div>
        ) : null}
        {typeof entry.metadata.context_family === "string" ? (
          <div>
            <dt>Context family</dt>
            <dd>{entry.metadata.context_family}</dd>
          </div>
        ) : null}
        {tuning && typeof entry.metadata.string_count === "number" ? (
          <div>
            <dt>Strings</dt>
            <dd>{entry.metadata.string_count}</dd>
          </div>
        ) : null}
        {tuning && Array.isArray(entry.metadata.open_strings_low_to_high) ? (
          <div>
            <dt>Open strings, low to high</dt>
            <dd>{entry.metadata.open_strings_low_to_high.join(" · ")}</dd>
          </div>
        ) : null}
      </dl>
      {entry.aliases.length ? (
        <section>
          <h2>Alternate names</h2>
          <ul>
            {entry.aliases.map((alias) => (
              <li key={alias}>{alias}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {entry.legacySearchTerms.length ? (
        <section>
          <h2>Legacy search terms</h2>
          <p>Historical discovery labels; they are not separate canonical entities.</p>
          <ul>
            {entry.legacySearchTerms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {entry.relationships.length ? (
        <section>
          <h2>Canonical relationships</h2>
          <ul className="codex-relationships">
            {entry.relationships.map((relationship, index) => (
              <li
                key={`${relationship.direction}-${relationship.type}-${relationship.entity.id}-${index}`}
              >
                <strong>
                  {relationship.direction === "OUTGOING"
                    ? relationship.type
                    : `Referenced by · ${relationship.type}`}
                </strong>
                {relationship.entity.href ? (
                  <Link href={relationship.entity.href}>
                    {relationship.entity.name} <span>({relationship.entity.kind})</span>
                  </Link>
                ) : (
                  <span>
                    {relationship.entity.name} ({relationship.entity.kind})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Link className="codex-back" href="/codex">
        ← Back to Codex
      </Link>
    </article>
  );
}
