# DESIGN-001-F4A-R1 — Workbook shelf and musical block selection

Base: F4A fc0ba77fdd10e6475b8db97a16891ef3bb4b7545 (PR #48); six workflows passed. User visual review requested a discoverable library above the editor and clear green selection for tablature and chord diagrams.

- Reuse the existing owner-scoped library as a responsive notebook shelf above the editor, not a duplicate store. Keep search, recent pages, archive, management and exact-page selection. Header exposes library visibility and current Workbook; Focus mode still hides the shelf.
- Neutral borders for inactive music blocks, distinct discovery green perimeter plus inset emphasis during focus or actual node selection; selected tab cell and chord string get a green outline while editing. Do not change selection or editing semantics.
- Add regression for shelf placement, toggle, musical block focus transfer and mobile overflow.

Full final-head CI and user visual review required. No production merge, persistence/schema change or new dependency.
