"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CodexReferenceLink, CodexReferenceList } from "@/components/quest-codex-reference";
import { generateQuickQuest, type GeneratedQuest } from "@/lib/quest/generator";
import { toQuestPersistenceInput } from "@/lib/quest/runtime";
import { questCodexReferences } from "@/lib/quest/codex-references";
import { saveGeneratedQuestJourney, type JourneyRpcClient } from "@/lib/quest/journey-repository";
import { clearQuestDraft, readQuestDraft, saveQuestDraft } from "@/lib/quest/draft-v1";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type GenerateClient = JourneyRpcClient;

export function GenerateQuestSurface() {
  const router = useRouter();
  const [identityReady, setIdentityReady] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQuest | null>(null);
  const [durableQuestId, setDurableQuestId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [pending, setPending] = useState<"GENERATING" | "SAVING" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      const id = data.user?.id ?? null;
      if (!id) {
        if (authError && authError.name !== "AuthSessionMissingError") {
          setError("We couldn’t prepare your Player session. Please try again.");
          setIdentityReady(true);
          return;
        }
        router.replace("/onboarding?next=/generate");
        return;
      }
      setOwnerId(id);
      const draft = readQuestDraft(window.sessionStorage, id);
      if (draft)
        setGenerated({ quest: draft.quest, persistence: toQuestPersistenceInput(draft.quest) });
      setIdentityReady(true);
    });
  }, [router]);

  async function generate() {
    if (pending) return;
    if (generated && !durableQuestId && !window.confirm("Replace your unsaved Quest draft?"))
      return;
    setPending("GENERATING");
    setError(null);
    try {
      const identity = ownerId ? null : await createBrowserSupabaseClient().auth.getUser();
      if (identity?.error && identity.error.name !== "AuthSessionMissingError") {
        setError("We couldn’t prepare your Player session. Please try again.");
        return;
      }
      const resolvedOwnerId = ownerId ?? identity?.data.user?.id ?? null;
      if (!resolvedOwnerId) {
        router.replace("/onboarding?next=/generate");
        return;
      }
      setOwnerId(resolvedOwnerId);
      const next = generateQuickQuest();
      setGenerated(next);
      setDurableQuestId(null);
      saveQuestDraft(window.sessionStorage, resolvedOwnerId, next.quest);
    } catch {
      setError("A Quest could not be generated. Please retry.");
    } finally {
      setPending(null);
    }
  }

  async function persist(mode: "SAVED" | "START") {
    if (!generated || pending) return;
    setPending("SAVING");
    setError(null);
    try {
      const journey = await saveGeneratedQuestJourney(
        createBrowserSupabaseClient() as unknown as GenerateClient,
        generated.quest,
        mode,
      );
      setDurableQuestId(journey.questId);
      clearQuestDraft(window.sessionStorage);
      if (mode === "START") router.push(`/quest/${journey.questId}`);
    } catch {
      setError("Your Quest could not be saved. Your draft is still available; please retry.");
    } finally {
      setPending(null);
    }
  }

  const quest = generated?.quest;
  const references = quest ? questCodexReferences(quest) : null;
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
          onClick={() => void generate()}
          disabled={!identityReady || pending !== null}
        >
          {!identityReady
            ? "Preparing Player…"
            : pending === "GENERATING"
              ? "Generating…"
              : quest
                ? "Generate Another"
                : "Generate Quest"}
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
              <dd>
                <CodexReferenceLink reference={references!.primarySkill} />
              </dd>
            </div>
            <div>
              <dt>Suggested Session</dt>
              <dd>{quest.execution.estimated_minutes} minutes</dd>
            </div>
            <div>
              <dt>Secondary Skills</dt>
              <dd>
                <CodexReferenceList references={references!.secondarySkills} />
              </dd>
            </div>
            <div>
              <dt>Required Techniques</dt>
              <dd>
                <CodexReferenceList references={references!.requiredTechniques} />
              </dd>
            </div>
            <div>
              <dt>Concepts</dt>
              <dd>
                <CodexReferenceList references={references!.concepts} />
              </dd>
            </div>
            <div>
              <dt>Constraints</dt>
              <dd>
                <CodexReferenceList references={references!.constraints} />
              </dd>
            </div>
            <div>
              <dt>Tuning</dt>
              <dd>
                <CodexReferenceList
                  references={references!.contexts.filter((item) => item.role === "tuning")}
                  empty={tuning?.name ?? "Any tuning"}
                />
              </dd>
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

          <p className="generate-session-note">This Quest can span multiple practice Sessions.</p>
          <div className="generate-actions generate-actions--quest">
            <button
              className="action-button action-button--primary"
              type="button"
              onClick={() => void persist("SAVED")}
              disabled={pending !== null || durableQuestId !== null}
            >
              {durableQuestId ? "Quest saved" : pending === "SAVING" ? "Saving…" : "Save Quest"}
            </button>
            <button
              className="action-button action-button--secondary"
              type="button"
              onClick={() => void persist("START")}
              disabled={pending !== null}
            >
              Start Quest
            </button>
            {durableQuestId ? (
              <Link className="text-link" href="/quests">
                View Saved Quests
              </Link>
            ) : null}
          </div>
        </article>
      )}
    </section>
  );
}
