import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PUBLISHED_CODEX_V2_TERMS } from "@/lib/codex/v2/catalog";
import { canonicalCodexHref } from "@/lib/codex/v2/content";

type DictionaryProps = { params: Promise<{ slug: string }> };

export const metadata: Metadata = { title: "Music Dictionary" };

export function generateStaticParams() {
  return PUBLISHED_CODEX_V2_TERMS.map((term) => ({ slug: term.slug }));
}

export default async function DictionaryTermPage({ params }: DictionaryProps) {
  const { slug } = await params;
  const term = PUBLISHED_CODEX_V2_TERMS.find((item) => item.slug === slug);
  if (!term) notFound();
  return (
    <article className="cv2-dictionary-entry codex-article">
      <header>
        <span className="codex-kind">Music Dictionary</span>
        <h1>{term.term}</h1>
      </header>
      <p>{term.definition}</p>
      <p>{term.detail}</p>
      {term.related ? (
        <p><Link href={canonicalCodexHref(term.related.kind, term.related.slug)}>
          Read related Codex entry ↗
        </Link></p>
      ) : null}
      <Link href="/codex">← Back to the Codex</Link>
    </article>
  );
}
