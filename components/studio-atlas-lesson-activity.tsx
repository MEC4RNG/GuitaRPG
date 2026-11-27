"use client";

import { CodexV2Reference } from "./codex-v2-reference";
import type { CodexV2ReferenceBlock } from "@/lib/codex/v2/content";
import type { CodexLessonWorkbookSource } from "@/lib/workbook/lesson-template";

export function AtlasLessonActivity({ lesson, blocks, disabled, onSave }: {
  lesson: CodexLessonWorkbookSource;
  blocks: CodexV2ReferenceBlock[];
  disabled: boolean;
  onSave: () => void;
}) {
  return (
    <section className="atlas-lesson" aria-labelledby="atlas-lesson-title">
      <header>
        <p className="eyebrow">Selected from Map · {lesson.applicationTitle} · {lesson.level}</p>
        <h2 id="atlas-lesson-title">{lesson.title}</h2>
        <p>{lesson.explanation}</p>
        <p className="atlas-lesson-note">{lesson.status === "DRAFT_REVIEW" ? "Draft Codex lesson · Preview only." : "Codex learning activity."} Explore at your own pace; this activity does not record evidence automatically.</p>
      </header>
      <div>
        <h3>What to discover</h3>
        <ul>{lesson.outcomes.map((outcome, index) => <li key={index}>{outcome}</li>)}</ul>
      </div>
      {lesson.exercises.map((exercise, index) => (
        <section className="atlas-lesson-exercise" key={index}>
          <h3>{exercise.title}</h3>
          <p>{exercise.setup}</p>
          <ol>{exercise.steps.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}</ol>
          <p><strong>Self-check:</strong> {exercise.selfCheck}</p>
          <p className="atlas-lesson-note">Suggested exploration · {exercise.suggestedMinutes} min</p>
        </section>
      ))}
      {blocks.length ? <details><summary>Open interactive Skill reference</summary><CodexV2Reference blocks={blocks} /></details> : null}
      <div className="atlas-lesson-save">
        <p>Keep the lesson and your discoveries in a private, editable Workbook. Nothing is created until you choose Save.</p>
        <button type="button" className="action-button action-button--primary" disabled={disabled} onClick={onSave}>Save lesson to Workbook</button>
      </div>
    </section>
  );
}
