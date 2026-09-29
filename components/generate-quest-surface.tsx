"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { generateQuickQuest, type GeneratedQuest } from "@/lib/quest/generator";
import {
  GeneratedQuestStartError,
  startGeneratedQuestPractice,
} from "@/lib/quest/start-generated-quest";
import type { QuestPersistenceRpcClient } from "@/lib/quest/repository";
import type { SessionRpcClient } from "@/lib/session/repository";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type GenerateClient = QuestPersistenceRpcClient & SessionRpcClient;

const joinNames = (items: Array<{ name: string }>) => items.map((item) => item.name).join(", ");

export function GenerateQuestSurface() {
  const router = useRouter();
  const [generated, setGenerated] = useState<GeneratedQuest | null>(null);
  const [durableQuestId, setDurableQuestId] = useState<string | null>(null);
  const [pending, setPending] = useState<"GENERATING" | "STARTING" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    if (pending) return;
    setPending("GENERATING");
    setError(null);
    try {
      setGenerated(generateQuickQuest());
      setDurableQuestId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Quest generation failed");
    } finally {
      setPending(null);
    }
  }

  async function startPractice() {
    if (!generated || pending) return;
    setPending("STARTING");
    setError(null);
    try {
      const client = createBrowserSupabaseClient() as unknown as GenerateClient;
      const started = await startGeneratedQuestPractice(client, generated.quest, durableQuestId);
      setDurableQuestId(started.questId);
      router.push(`/session/${started.session.id}`);
    } catch (caught) {
      if (caught instanceof GeneratedQuestStartError) {
        setDurableQuestId(caught.durableQuestId);
        setError(
          caught.stage === "SESSION_START"
            ? `${caught.message} Your Quest is saved; retry Start Practice to enter it.`
            : caught.message,
        );
      } else {
        setError(caught instanceof Error ? caught.message : "Practice could not be started");
      }
    } finally {
      setPending(null);
    }
  }

  const quest = generated?.quest;
  const targetTempo = quest?.constraints.find((item) => item.slug === "target_tempo")?.parameters
    .bpm;
  const tuning = (quest?.musical_context as { tuning?: { name?: string } | null } | undefined)
    ?.tuning;

  return (
    <section className="generate-stack" aria-labelledby="generate-title">
      <header className="page-header">
        <div>
          <p className="eyebrow">PLAY · GENERATE</p>
          <h1 id="generate-title">Build the next quest.</h1>
          <p>One useful practice plan, generated from the canonical Quest system.</p>
        </div>
        <button
          className="action-button"
          type="button"
          onClick={generate}
          disabled={pending !== null}
        >
          {pending === "GENERATING" ? "Generating…" : quest ? "Generate Another" : "Generate Quest"}
        </button>
      </header>

      {error ? (
        <p className="panel generate-error" role="alert">
          {error}
        </p>
      ) : null}

      {!quest ? (
        <article className="panel generate-empty">
          <p className="eyebrow">QUICK QUEST</p>
          <h2>Ready when you are.</h2>
          <p>No setup is required. Generate a coherent challenge and inspect it before practice.</p>
        </article>
      ) : (
        <article className="panel generate-preview" aria-labelledby="generated-quest-title">
          <div className="generate-preview__heading">
            <div>
              <p className="eyebrow">{quest.identity.type} QUEST</p>
              <h2 id="generated-quest-title">{quest.identity.title}</h2>
            </div>
            <span className="status-chip">
              Demand {quest.difficulty_profile.declared_overall_demand}
            </span>
          </div>

          <dl className="generate-details">
            <div>
              <dt>Primary Skill</dt>
              <dd>{quest.execution.primary_skill.name}</dd>
            </div>
            <div>
              <dt>Estimated Time</dt>
              <dd>{quest.execution.estimated_minutes} minutes</dd>
            </div>
            <div>
              <dt>Secondary Skills</dt>
              <dd>{joinNames(quest.execution.secondary_skills) || "None"}</dd>
            </div>
            <div>
              <dt>Required Techniques</dt>
              <dd>{joinNames(quest.execution.required_techniques) || "None"}</dd>
            </div>
            <div>
              <dt>Concepts</dt>
              <dd>{joinNames(quest.concepts)}</dd>
            </div>
            <div>
              <dt>Constraints</dt>
              <dd>{joinNames(quest.constraints)}</dd>
            </div>
            <div>
              <dt>Tuning</dt>
              <dd>{tuning?.name ?? "Any tuning"}</dd>
            </div>
            <div>
              <dt>Target Tempo</dt>
              <dd>{typeof targetTempo === "number" ? `${targetTempo} BPM` : "Not required"}</dd>
            </div>
            <div className="generate-details__wide">
              <dt>Objective</dt>
              <dd>{quest.objective.summary}</dd>
            </div>
            <div className="generate-details__wide">
              <dt>Verification</dt>
              <dd>{quest.verification_profile.recommended_mode.replaceAll("_", " ")}</dd>
            </div>
          </dl>

          <button
            className="action-button"
            type="button"
            onClick={startPractice}
            disabled={pending !== null}
          >
            {pending === "STARTING"
              ? "Starting Practice…"
              : durableQuestId
                ? "Retry Start Practice"
                : "Start Practice"}
          </button>
        </article>
      )}
    </section>
  );
}
