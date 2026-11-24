# JRN-R3 — Map / Explore / Codex Workbook UX revision

**Status:** Draft implementation, pending browser review and final-head CI.
**Parent:** R11 Arpeggio draft PR #22, itself stacked atop the existing Codex V2 / JRN-004 branches. Craft tab layout, including Quest Toolkit, is deliberately **unchanged**.

## Authorized revisions and disposition

1. **Map > How to explore:** Add three clear level disclosures (Beginner/Foundational, Intermediate, Advanced), each with a verified Codex reference where one exists and an explicit **Open this ingredient in Explore** action. The action switches Journey stage through the existing owner-scoped stage repository and expands the corresponding Skill module if it has one; it does **not** create a Workbook or claim a published level-specific Codex module. The current **New Workbook** remains a separate, optional creation action which seeds and links a context page then navigates to Explore, as before.
2. **Map future interactive content:** Concept retained as a future preview-only design opportunity. No unreviewed V2 interactive reference is exposed through public Quest Map routes, and no new scoring or instrument data capture is introduced.
3. **Explore:** Remove the redundant Target tempo box only from Explore's body; Quest data and objective targets remain intact elsewhere. Group New Page and Existing page actions together with additional label-to-select spacing, give disclosure and linked-page controls explicit pointer affordances, and place **Move Earlier / Move Later** within a labelled *Module order* control group visually belonging to the active ingredient. The existing permission/validation and order persistence logic is unchanged.
4. **Workbooks:** Relabel **Delete chord** to **Remove diagram** and the tucked-away Tab removal action to **Remove tablature block**, under the more explicit **Tablature block actions** disclosure. These are *whole-block removal actions*, distinct from Clear note and Remove position. Existing validated editor node deletion, undo and persistence are unchanged.
5. **Codex → Workbooks:** Restore the missing *Practice in Workbook* links under individual lessons and How to Explore activities from the separate draft R5 lesson-to-Workbook integration. Requests use only an existing, validated server-side Codex module ID. The user explicitly chooses whether to create an owner-scoped new Workbook or add a page to a selected Workbook. Generated pages include lesson explanation, outcomes, exercise steps and a source marker, remain editable, and record no Quest/Session/XP. This integration is limited to preview, and server routes reject unrecognized or forged IDs. Adapted curriculum coverage unit tests from 42 to **all 114 authored draft lessons**.
6. **Craft:** No retooling of Quest Toolkit, Creative Guidance, composition or right-side layout. The user's ideas (skill-by-skill accordions with linked tagged pages) remain a **design proposal only**.

## Validation and limits

- Final-head Prettier, lint, TypeScript, Vitest, Next build, Codex/Quest/Workbook Playwright, database/security/identity/Player-control suites must pass before acceptance.
- Verify 3 Map disclosure levels, separate optional workbook creation, stage transition without creation, no Explore tempo card, stable module order and grouped controls, editor block removal, and deep-link Codex module templates.
- Draft V2 published corpus remains empty, public V1 still has 197 entries, and the 114 draft lessons/178 terms/48 proposed links remain intact.
- No migration, player XP/proficiency/session/result, automatic data capture, production merge or Craft redesign. Keep the PR **draft/open/unmerged**, explicitly stacked above parent PR #22.
