import draftExcerpts from "@/domain/codex/v2/preview-excerpts.json";
import expansionR6 from "@/domain/codex/v2/draft-expansion-r6.json";
import expansionR7 from "@/domain/codex/v2/draft-expansion-r7.json";
import { parseCodexV2 } from "./content";

/** Non-production preview only. Never import this module from a public Codex resolver. */
export function readCodexV2DraftPreview() {
  const expansions = [expansionR6, expansionR7];
  for (const expansion of expansions) {
    if (
      expansion.schema !== draftExcerpts.schema ||
      expansion.content_version !== draftExcerpts.content_version
    ) {
      throw new Error("Invalid CODEX_CONTENT_V2: draft expansion version mismatch");
    }
  }
  return parseCodexV2(
    {
      schema: draftExcerpts.schema,
      content_version: draftExcerpts.content_version,
      entries: [...draftExcerpts.entries, ...expansionR6.entries, ...expansionR7.entries],
      terms: [...draftExcerpts.terms, ...expansionR6.terms, ...expansionR7.terms],
    },
    true,
  );
}
