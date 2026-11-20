import draftExcerpts from "@/domain/codex/v2/preview-excerpts.json";
import { parseCodexV2 } from "./content";

/** Non-production preview only. Never import this module from a public Codex resolver. */
export function readCodexV2DraftPreview() {
  return parseCodexV2(draftExcerpts, true);
}
