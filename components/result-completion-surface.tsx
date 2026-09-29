"use client";

import { useCallback, useEffect, useState } from "react";

import {
  finalizeQuestResult,
  type FinalizedResult,
  type SelfCriterionInput,
} from "@/lib/evidence/repository";
import type { CriterionState, ReflectionValue } from "@/lib/evidence/runtime";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type CriterionRow = {
  ordinal: number;
  metric: string;
  operator: "EQ" | "GTE" | "LTE";
  criterion_value: string | number | boolean;
  unit: string;
};
type ResultCriterionRow = {
  quest_criterion_ordinal: number;
  metric: string;
  criterion_state: CriterionState;
};
type EvidenceRow = {
  criterion_metric: string;
  verification_mode: string;
  evidence_confidence: string;
  rationale: string | null;
};
type SessionRow = { status: "ACTIVE" | "PAUSED" | "ENDED"; quest_id: string };
type QuestRow = { title: string };
type QueryResponse<T> = { data: T | null; error: { message: string } | null };
type Query<T> = PromiseLike<QueryResponse<T[]>> & {
  eq(column: string, value: string): Query<T>;
  order(column: string): Query<T>;
  single(): PromiseLike<QueryResponse<T>>;
  maybeSingle(): PromiseLike<QueryResponse<T>>;
};
type ResultReadClient = {
  from(table: string): { select(columns: string): Query<never> };
  rpc(
    functionName: string,
    parameters: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

type CompletionSnapshot = {
  session: SessionRow;
  quest: QuestRow;
  activeSeconds: number;
  criteria: CriterionRow[];
  result: FinalizedResult | null;
  resultCriteria: ResultCriterionRow[];
  evidence: EvidenceRow[];
};

const stateLabel: Record<CriterionState, string> = {
  MET: "Met",
  NOT_MET: "Not met",
  UNKNOWN: "Unknown",
  NOT_EVALUATED: "Not evaluated",
};

const humanize = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());

export function ResultCompletionSurface({ sessionId }: { sessionId: string }) {
  const [client] = useState(() => createBrowserSupabaseClient() as unknown as ResultReadClient);
  const [snapshot, setSnapshot] = useState<CompletionSnapshot | null>(null);
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const [reflection, setReflection] = useState<ReflectionValue | "">("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const session = await (
      client.from("practice_sessions").select("status,quest_id") as unknown as Query<SessionRow>
    )
      .eq("id", sessionId)
      .single();
    if (session.error || !session.data)
      throw new Error(session.error?.message ?? "Session not found");
    const [quest, criteria, active, result] = await Promise.all([
      (client.from("quests").select("title") as unknown as Query<QuestRow>)
        .eq("id", session.data.quest_id)
        .single(),
      (
        client
          .from("quest_objective_criteria")
          .select("ordinal,metric,operator,criterion_value,unit") as unknown as Query<CriterionRow>
      )
        .eq("quest_id", session.data.quest_id)
        .order("ordinal"),
      client.rpc("practice_session_active_seconds", { p_session_id: sessionId }),
      (client.from("quest_results").select("*") as unknown as Query<FinalizedResult>)
        .eq("session_id", sessionId)
        .maybeSingle(),
    ]);
    if (quest.error || !quest.data) throw new Error(quest.error?.message ?? "Quest not found");
    if (criteria.error) throw new Error(criteria.error.message);
    if (active.error) throw new Error(active.error.message);
    if (result.error) throw new Error(result.error.message);
    let resultCriteria: ResultCriterionRow[] = [];
    let evidence: EvidenceRow[] = [];
    if (result.data) {
      const [criterionResponse, evidenceResponse] = await Promise.all([
        (
          client
            .from("quest_result_criteria")
            .select(
              "quest_criterion_ordinal,metric,criterion_state",
            ) as unknown as Query<ResultCriterionRow>
        )
          .eq("result_id", result.data.id)
          .order("quest_criterion_ordinal"),
        (
          client
            .from("quest_result_evidence")
            .select(
              "criterion_metric,verification_mode,evidence_confidence,rationale",
            ) as unknown as Query<EvidenceRow>
        ).eq("result_id", result.data.id),
      ]);
      if (criterionResponse.error || evidenceResponse.error)
        throw new Error(
          criterionResponse.error?.message ??
            evidenceResponse.error?.message ??
            "Result details unavailable",
        );
      resultCriteria = criterionResponse.data ?? [];
      evidence = evidenceResponse.data ?? [];
    }
    setSnapshot({
      session: session.data,
      quest: quest.data,
      activeSeconds: Number(active.data),
      criteria: criteria.data ?? [],
      result: result.data,
      resultCriteria,
      evidence,
    });
  }, [client, sessionId]);

  useEffect(() => {
    const load = window.setTimeout(() => {
      void refresh().catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Unable to load completion workflow"),
      );
    }, 0);
    return () => window.clearTimeout(load);
  }, [refresh]);

  const submit = async () => {
    if (!snapshot) return;
    setPending(true);
    setError(null);
    const selfCriteria: SelfCriterionInput[] = snapshot.criteria.map((criterion) => {
      const raw = inputs[criterion.ordinal];
      if (!raw) return { ordinal: criterion.ordinal, unknown: true };
      const targetType = typeof criterion.criterion_value;
      const observedValue =
        targetType === "number" ? Number(raw) : targetType === "boolean" ? raw === "true" : raw;
      return { ordinal: criterion.ordinal, observed_value: observedValue };
    });
    try {
      await finalizeQuestResult(client, {
        sessionId,
        selfCriteria,
        reflection: reflection || null,
        notes: notes || null,
      });
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Result could not be recorded");
    } finally {
      setPending(false);
    }
  };

  if (!snapshot)
    return (
      <p className="session-notice" role={error ? "alert" : undefined}>
        {error ?? "Loading completion workflow…"}
      </p>
    );
  const resultEvidence = (metric: string) =>
    snapshot.evidence.find((item) => item.criterion_metric === metric);

  return (
    <div className="session-practice result-completion">
      <header className="session-practice__header">
        <span className="page-header__eyebrow">INSTRUMENT HUD · RESULT</span>
        <h1>{snapshot.quest.title}</h1>
        <p>
          {snapshot.activeSeconds} recorded active seconds. Completion describes what happened;
          verification describes how the claim is supported.
        </p>
      </header>
      {error ? (
        <p className="session-notice" role="alert">
          {error}
        </p>
      ) : null}
      {snapshot.session.status !== "ENDED" ? (
        <p className="session-notice">End this Practice Session before recording a Result.</p>
      ) : null}
      {snapshot.result ? (
        <>
          <section className="result-banner" aria-label="Final Result">
            <span>FINAL RESULT</span>
            <strong>{snapshot.result.outcome}</strong>
            <p>Evidence confidence: {snapshot.result.confidence_summary}</p>
          </section>
          <section className="session-control-grid" aria-label="Result criteria">
            {snapshot.resultCriteria.map((criterion) => {
              const evidence = resultEvidence(criterion.metric);
              return (
                <article className="panel" key={criterion.quest_criterion_ordinal}>
                  <span className="panel__label">
                    {evidence ? humanize(evidence.verification_mode) : "No observation"}
                  </span>
                  <h2>{humanize(criterion.metric)}</h2>
                  <p className="result-state">{stateLabel[criterion.criterion_state]}</p>
                  {evidence ? <p>{humanize(evidence.evidence_confidence)} confidence</p> : null}
                </article>
              );
            })}
          </section>
          {snapshot.result.reflection ? (
            <p className="session-notice">Reflection: {humanize(snapshot.result.reflection)}</p>
          ) : null}
        </>
      ) : (
        <>
          <section className="session-control-grid" aria-label="Objective criteria">
            {snapshot.criteria.map((criterion) => (
              <article className="panel" key={criterion.ordinal}>
                <span className="panel__label">YOUR ASSESSMENT</span>
                <h2>{humanize(criterion.metric)}</h2>
                <p>
                  Target: {criterion.operator} {String(criterion.criterion_value)} {criterion.unit}
                </p>
                <label htmlFor={`criterion-${criterion.ordinal}`}>Self-reported observation</label>
                {typeof criterion.criterion_value === "boolean" ? (
                  <select
                    id={`criterion-${criterion.ordinal}`}
                    value={inputs[criterion.ordinal] ?? ""}
                    onChange={(event) =>
                      setInputs((current) => ({
                        ...current,
                        [criterion.ordinal]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Not sure / cannot evaluate</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    id={`criterion-${criterion.ordinal}`}
                    type={typeof criterion.criterion_value === "number" ? "number" : "text"}
                    value={inputs[criterion.ordinal] ?? ""}
                    placeholder="Leave blank if unknown"
                    onChange={(event) =>
                      setInputs((current) => ({
                        ...current,
                        [criterion.ordinal]: event.target.value,
                      }))
                    }
                  />
                )}
              </article>
            ))}
          </section>
          <section className="panel result-reflection">
            <span className="panel__label">OPTIONAL REFLECTION</span>
            <label htmlFor="result-reflection">Challenge fit</label>
            <select
              id="result-reflection"
              value={reflection}
              onChange={(event) => setReflection(event.target.value as ReflectionValue | "")}
            >
              <option value="">No reflection</option>
              <option value="TOO_EASY">Too easy</option>
              <option value="GOOD_CHALLENGE">Good challenge</option>
              <option value="TOO_HARD">Too hard</option>
            </select>
            <label htmlFor="result-notes">Notes</label>
            <textarea
              id="result-notes"
              maxLength={4000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <button
              className="action-button action-button--primary"
              disabled={pending || snapshot.session.status !== "ENDED"}
              onClick={() => void submit()}
            >
              {pending ? "Recording…" : "Record Result"}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
