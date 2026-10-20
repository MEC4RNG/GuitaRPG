# JRN-000 — Workbook Editor Architecture Specification

**Status:** ACCEPTED DESIGN / PROTOTYPE REQUIRED

## Editor boundary

The editor is an adapter over a GuitaRPG-owned document schema. An editor library may provide
selection, history, keyboard behavior, rich-text commands, and custom node hosting, but it does not
own the persistence format. Every load and save passes through the versioned parser.

```text
UI commands and accessible block controls
            ↓
Editor adapter (candidate: Tiptap/ProseMirror)
            ↓
GUITARPG_WORKBOOK_DOCUMENT_V1 parser/normalizer
            ↓
optimistic-concurrency save operation
```

## Candidate technology decision

JRN-001 must prototype **Tiptap on ProseMirror** first. Tiptap exposes schema-backed custom nodes
and React node views, while ProseMirror provides a mature structured document model and custom node
views. This is a good fit for embedding accessible React/SVG tablature, chord, and future fretboard
blocks alongside rich text.

Alternatives to measure in the prototype:

- **Direct ProseMirror:** maximum control and fewer abstraction assumptions, but higher command,
  integration, and maintenance cost.
- **Lexical:** capable custom/decorator nodes and JSON serialization; retain as fallback if Tiptap's
  nested custom-block selection or accessibility behavior is unsuitable.
- **Custom editor from scratch:** rejected for rich text. Custom React/SVG remains appropriate inside
  musical block node views.

Do not adopt paid collaboration/version-history services for the first implementation. The accepted
Supabase revision model remains authoritative. No editor dependency is installed by JRN-000.

## Document envelope

```ts
type WorkbookDocumentV1 = {
  type: "GUITARPG_WORKBOOK_DOCUMENT_V1";
  schema_version: 1;
  blocks: WorkbookBlockV1[];
};

type BlockBase = {
  id: string; // UUID
  version: 1;
};
```

Initial block union:

- `paragraph`, `heading`, `bullet_list`, `ordered_list`, `blockquote`, `code_or_preformatted`
- `guitar_tab`
- `chord_diagram`
- `callout` or `divider` only if the prototype proves a clear need

Reserved future blocks:

- `fretboard`
- `rhythm_grid`
- `image`
- `media_reference`

Unknown blocks must fail closed for editing while remaining recoverable in stored/exported JSON.
Migration functions transform document versions explicitly and never mutate historical revisions in
place.

## Guitar tablature block

Tab is structured musical data, not text art or an image.

Minimum model:

```ts
type GuitarTabBlockV1 = BlockBase & {
  type: "guitar_tab";
  title?: string;
  tuning: {
    context_id?: string; // canonical tuning when available
    slug?: string;
    display_name: string;
    strings_low_to_high: Array<{ string_number: number; open_pitch: string }>;
  };
  measures: Array<{
    id: string;
    ordinal: number;
    time_signature?: { numerator: number; denominator: number };
    events: Array<{
      id: string;
      ordinal: number;
      position?: { beat: number; subdivision: number };
      duration?: string;
      notes: Array<{
        string_number: number;
        fret: number;
        technique?: string[];
      }>;
      annotation?: string;
    }>;
  }>;
};
```

Requirements:

- String numbering and visual order are explicit; storage uses `strings_low_to_high` and rendering
  labels the chosen visual orientation.
- Fret values are non-negative integers within an accepted bound; muted/ghost/dead notes use typed
  fields rather than magic fret numbers.
- Simultaneous notes share an event. Events and measures have stable IDs and ordinals.
- Tuning is snapshotted and may reference a canonical Context; a later taxonomy rename cannot alter
  historical pitch interpretation.
- V1 may omit rhythm during early prototyping, but the schema reserves typed position/duration so
  rhythm can be added without replacing the block identity.
- Keyboard entry, string/fret labels, screen-reader summaries, undo/redo, copy/duplicate, and a
  non-pointer editing path are acceptance requirements.

## Chord diagram block

The source model includes tuning snapshot, fret window, per-string state (`FRETTED`, `OPEN`,
`MUTED`), fret, finger when supplied, barre spans, root/interval annotations when supplied, title,
and optional canonical Concept/Context references. SVG is a renderer, never the saved authority.
The accessible name and text alternative are derived from the structured model.

## Future fretboard and rhythm blocks

FRET-001 owns interactive Quest-aware fretboard behavior and system/Player marker semantics. Its
saved structures must either conform to a future `fretboard` block or link to a page block by stable
ID. It must not introduce a second rich-document engine.

A future rhythm-grid block must model pulse/subdivision/event semantics rather than a bitmap. Both
new block types require document-version compatibility tests before write support.

## Images and media

An image/media block initially supports only an explicit typed reference, alt text, caption, media
type, dimensions/duration where known, and ownership/source metadata. Upload is deferred until
Storage authorization, quotas, malware/content handling, export, retention, and deletion are
accepted. Data URLs and arbitrary executable embeds are rejected.

## Interaction and accessibility

- Toolbar and block insertion work by keyboard and touch with visible focus and 44px targets.
- Custom musical blocks expose a concise block summary plus labelled editing controls; visual SVG
  alone is insufficient.
- Arrow-key behavior must not trap the user. Escape returns from a block editor to document flow.
- Selection, deletion, duplication, undo/redo, error, saving, saved, offline, and conflict states are
  announced truthfully.
- Desktop and 320px mobile reflow without page-level horizontal overflow; a musical grid may scroll
  inside its labelled region.
- Pasting HTML is sanitized and normalized to supported nodes. Unsupported styling/scripts are
  discarded without executing.

## Prototype acceptance gate

JRN-001 must prove rich text plus one tab block and one chord block, JSON round-trip stability,
keyboard/touch editing, screen-reader names, undo/redo, copy/paste boundaries, mobile reflow, and a
bundle/licensing assessment. It remains local/in-memory and creates no database migration.

## Technology references reviewed

- [Tiptap custom extensions and persisted node names](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/extension)
- [ProseMirror schemas and node views](https://prosemirror.net/docs/guide/)
- [Lexical document model](https://lexical.dev/docs/concepts/document-model)
- [Lexical serialization guidance](https://lexical.dev/docs/serialization/legacy)

Tiptap's paid collaboration/version-history features were reviewed but are not an accepted
dependency; the GuitaRPG-owned revision and conflict contract remains portable and authoritative.
