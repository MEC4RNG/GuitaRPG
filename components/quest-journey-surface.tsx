"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CodexReferenceLink, CodexReferenceList } from "@/components/quest-codex-reference";
import { CodexV2Reference } from "@/components/codex-v2-reference";
import type { CodexV2ReferenceBlock, LearningLevel } from "@/lib/codex/v2/content";
import { WorkbookPersistenceSurface } from "@/components/workbook-persistence-surface";
import { questCodexReferences } from "@/lib/quest/codex-references";
import { questJourneyTopics, topicWorkbookDocument } from "@/lib/quest/journey-topics";
import {
  ensureQuestJourney,
  setQuestJourneyStage,
  transitionQuestJourney,
  type JourneyRpcClient,
} from "@/lib/quest/journey-repository";
import {
  journeyStageContent,
  journeyStatusLabel,
  questConstraintText,
} from "@/lib/quest/journey-presentation";
import type { QuestJourneyAction, QuestJourneyStage } from "@/lib/quest/journey-runtime";
import { readQuestJourneyDetail, type QuestLibraryClient } from "@/lib/quest/library-repository";
import {
  sessionAction,
  type QuestSessionSummary,
  type SavedQuestSummary,
} from "@/lib/quest/library-runtime";
import {
  startJourneyPractice,
  type JourneyPracticeClient,
} from "@/lib/quest/start-journey-practice";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { workbookContextHref } from "@/lib/workbook/context";
import {
  assignExploreModulePage,
  attachExploreModulePage,
  attachWorkbookContext,
  createWorkbook,
  createQuickNote,
  readExploreModuleOrder,
  readQuestWorkbookLinks,
  readWorkbookSnapshot,
  saveExploreModuleOrder,
  type WorkbookClient,
  type WorkbookContextLinkRow,
  type WorkbookPageRow,
  type WorkbookRow,
} from "@/lib/workbook/repository";

type Detail = SavedQuestSummary & { recentSessions: QuestSessionSummary[] };
type JourneyClient = QuestLibraryClient & JourneyRpcClient & JourneyPracticeClient & WorkbookClient;
const client = () => createBrowserSupabaseClient() as unknown as JourneyClient;
const stages = ["MAP", "EXPLORE", "CRAFT"] as const;
const learningLevels: Array<{ id: LearningLevel; label: string }> = [
  { id: "foundational", label: "Beginner" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];
export type MapCodexLearning = {
  blocks: CodexV2ReferenceBlock[];
  modules: Array<{ id: string; title: string; level: LearningLevel; application: string }>;
};
const dateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );

export function QuestJourneySurface({
  questId,
  mapCodexLearning = {},
}: {
  questId: string;
  mapCodexLearning?: Record<string, MapCodexLearning>;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopicKey, setSelectedTopicKey] = useState<string | null>(null);
  const [mapLevel, setMapLevel] = useState<LearningLevel>("foundational");
  const [learningFocus, setLearningFocus] = useState<{
    title: string;
    level: LearningLevel;
    moduleKey: string | null;
  } | null>(null);
  const [workbookLinks, setWorkbookLinks] = useState<WorkbookContextLinkRow[]>([]);
  const [workbookPages, setWorkbookPages] = useState<WorkbookPageRow[]>([]);
  const [workbooks, setWorkbooks] = useState<WorkbookRow[]>([]);
  const [moduleOrder, setModuleOrder] = useState<string[] | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [moduleMessage, setModuleMessage] = useState("");
  const [openExplorePage, setOpenExplorePage] = useState<{
    pageId: string;
    moduleKey: string | null;
  } | null>(null);
  const mapCreateRequest = useRef<{ topicKey: string; requestId: string } | null>(null);

  useEffect(() => {
    const api = client();
    void ensureQuestJourney(api, questId)
      .then(async () => {
        const [next, links, snapshot, savedOrder] = await Promise.all([
          readQuestJourneyDetail(api, questId),
          readQuestWorkbookLinks(api, questId),
          readWorkbookSnapshot(api),
          readExploreModuleOrder(api, questId),
        ]);
        setWorkbookLinks(links);
        setWorkbookPages(snapshot.pages);
        setWorkbooks(snapshot.workbooks);
        setModuleOrder(savedOrder);
        return next;
      })
      .then((next) => {
        if (!next) throw new Error("Quest unavailable");
        setDetail(next);
      })
      .catch(() => setError("This Quest is unavailable. Return to Saved Quests and try again."));
  }, [questId]);

  async function chooseStage(stage: QuestJourneyStage) {
    if (pending || !detail || detail.journey.lifecycleStatus === "ARCHIVED") return;
    setPending(true);
    setError(null);
    try {
      setDetail({
        ...detail,
        journey: await setQuestJourneyStage(client(), detail.questId, stage),
      });
    } catch {
      setError("The Journey stage could not be updated. Your previous stage is unchanged.");
    } finally {
      setPending(false);
    }
  }

  async function lifecycle(action: QuestJourneyAction) {
    if (pending || !detail) return;
    setPending(true);
    setError(null);
    try {
      setDetail({
        ...detail,
        journey: await transitionQuestJourney(client(), detail.questId, action),
      });
    } catch {
      setError("The Journey could not be updated. Please retry.");
    } finally {
      setPending(false);
    }
  }

  async function practice() {
    if (pending || !detail || detail.journey.lifecycleStatus === "ARCHIVED") return;
    setPending(true);
    setError(null);
    try {
      const started = await startJourneyPractice(client(), detail.journey);
      router.push(`/session/${started.session.id}`);
    } catch {
      setError("Your Quest is saved, but Practice could not start. Please retry.");
      setPending(false);
    }
  }

  if (!detail)
    return (
      <p className="session-notice" role={error ? "alert" : "status"}>
        {error ?? "Loading Quest…"}
      </p>
    );
  const { quest, journey } = detail;
  const references = questCodexReferences(quest);
  const constraints = questConstraintText(quest);
  const archived = journey.lifecycleStatus === "ARCHIVED";
  const practiceLabel = detail.sessionCount ? "Practice Again" : "Start Practice";
  const topics = questJourneyTopics(quest);
  const selectedTopic = topics.find((topic) => topic.key === selectedTopicKey) ?? topics[0];
  const selectedMapCodex =
    selectedTopic?.kind === "SKILL" ? mapCodexLearning[selectedTopic.slug] : undefined;
  const mapLevelLessons =
    selectedMapCodex?.modules.filter((item) => item.level === mapLevel) ?? [];
  const stageLinks = workbookLinks.filter((link) => link.stage === journey.currentStage);
  const suggestedModules = [
    { ...quest.execution.primary_skill, roles: ["Primary"] },
    ...quest.execution.secondary_skills.map((item) => ({ ...item, roles: ["Supporting"] })),
    ...quest.execution.required_techniques.map((item) => ({
      ...item,
      roles: ["Required Technique"],
    })),
  ].reduce<Array<typeof quest.execution.primary_skill & { roles: string[] }>>((items, item) => {
    const existing = items.find((candidate) => candidate.slug === item.slug);
    if (existing) existing.roles = [...new Set([...existing.roles, ...item.roles])];
    else items.push(item);
    return items;
  }, []);
  const moduleByKey = new Map(suggestedModules.map((item) => [item.slug, item]));
  const orderedModuleKeys = [
    ...(moduleOrder ?? []).filter((key) => moduleByKey.has(key)),
    ...suggestedModules
      .map((item) => item.slug)
      .filter((key) => !(moduleOrder ?? []).includes(key)),
  ];
  const exploreModules = orderedModuleKeys.map((key) => moduleByKey.get(key)!);

  async function persistModuleOrder(next: string[]) {
    setModuleMessage("");
    try {
      setModuleOrder(await saveExploreModuleOrder(client(), questId, next));
    } catch {
      setModuleMessage("The Explore module order could not be saved. Your Quest is unchanged.");
    }
  }

  async function newModulePage(moduleKey: string) {
    setModuleMessage("");
    try {
      const created = await createQuickNote(client());
      setWorkbookPages((current) => [...current, created.page]);
      try {
        const link = await attachExploreModulePage(client(), created.page.id, questId, moduleKey);
        setWorkbookLinks((current) => [...current, link]);
      } catch {
        setModuleMessage(
          "The page is safe in Quick Notes, but its module link was not accepted. Link it later from Explore.",
        );
      }
      router.push(
        workbookContextHref(questId, "EXPLORE", "APPLIES_TO", { pageId: created.page.id }),
      );
    } catch {
      setModuleMessage("The module page could not be created. No Quest or progress data changed.");
    }
  }

  async function linkModulePage(moduleKey: string, pageId: string) {
    if (!pageId) return;
    setModuleMessage("");
    try {
      const link = await attachExploreModulePage(client(), pageId, questId, moduleKey);
      setWorkbookLinks((current) => [...current.filter((item) => item.id !== link.id), link]);
      setExpandedModules((current) => new Set(current).add(moduleKey));
      setOpenExplorePage({ pageId, moduleKey });
      setModuleMessage("Existing Workbook page linked and opened in Explore.");
    } catch {
      setModuleMessage("That page could not be linked to this Explore module.");
    }
  }

  async function createTopicWorkbook() {
    if (!selectedTopic || pending || archived) return;
    setPending(true);
    setError(null);
    const receipt =
      mapCreateRequest.current?.topicKey === selectedTopic.key
        ? mapCreateRequest.current
        : { topicKey: selectedTopic.key, requestId: crypto.randomUUID() };
    mapCreateRequest.current = receipt;
    try {
      const created = await createWorkbook(
        client(),
        `${selectedTopic.name} — ${quest.identity.title}`,
        {
          document: topicWorkbookDocument(selectedTopic, quest.identity.title),
          requestId: receipt.requestId,
        },
      );
      setWorkbooks((current) => [
        created.workbook,
        ...current.filter((item) => item.id !== created.workbook.id),
      ]);
      setWorkbookPages((current) => [
        ...current.filter((item) => item.id !== created.page.id),
        created.page,
      ]);
      const mapLink = await attachWorkbookContext(client(), {
        pageId: created.page.id,
        questId,
        stage: "MAP",
        relationship: "REFERENCE",
      });
      const exploreLink = selectedTopic.moduleKey
        ? await attachExploreModulePage(client(), created.page.id, questId, selectedTopic.moduleKey)
        : await attachWorkbookContext(client(), {
            pageId: created.page.id,
            questId,
            stage: "EXPLORE",
            relationship: "APPLIES_TO",
          });
      setWorkbookLinks((current) => [
        ...current.filter((item) => item.id !== mapLink.id && item.id !== exploreLink.id),
        mapLink,
        exploreLink,
      ]);
      mapCreateRequest.current = null;
      if (selectedTopic.moduleKey)
        setExpandedModules((current) => new Set(current).add(selectedTopic.moduleKey!));
      setOpenExplorePage({ pageId: created.page.id, moduleKey: selectedTopic.moduleKey });
      const nextJourney = await setQuestJourneyStage(client(), questId, "EXPLORE");
      setDetail((current) => (current ? { ...current, journey: nextJourney } : current));
      setModuleMessage("Workbook created, linked, and opened in Explore.");
    } catch {
      setError(
        "Your Workbook may already be safe. Retry to resume the same creation and linking operation.",
      );
    } finally {
      setPending(false);
    }
  }

  async function selectTopicAndMap(topicKey: string) {
    setSelectedTopicKey(topicKey);
    setMapLevel("foundational");
    if (journey.currentStage !== "MAP") await chooseStage("MAP");
  }

  async function exploreSelectedTopic(focusTitle?: string) {
    if (!selectedTopic || archived || pending) return;
    if (selectedTopic.moduleKey) {
      setExpandedModules((current) => new Set(current).add(selectedTopic.moduleKey!));
    }
    setLearningFocus(
      focusTitle
        ? { title: focusTitle, level: mapLevel, moduleKey: selectedTopic.moduleKey }
        : null,
    );
    // Opening Explore is navigation only: no Workbook, Page, Session or XP write.
    await chooseStage("EXPLORE");
  }

  return (
    <section className="generate-stack journey-shell" aria-labelledby="quest-journey-title">
      <Link className="text-link journey-back" href="/quests">
        ← Saved Quests
      </Link>
      <header className="journey-header">
        <dl className="journey-header__status-strip" aria-label="Quest overview">
          <div
            className="journey-header__stat journey-header__stat--status"
            data-lifecycle={journey.lifecycleStatus}
          >
            <dt>Status</dt>
            <dd>{journeyStatusLabel[journey.lifecycleStatus]}</dd>
          </div>
          <div className="journey-header__stat journey-header__stat--stage">
            <dt>Working stage</dt>
            <dd>{journeyStageContent[journey.currentStage].label}</dd>
          </div>
          <div className="journey-header__stat journey-header__stat--demand">
            <dt>Demand</dt>
            <dd>Level {quest.difficulty_profile.declared_overall_demand}</dd>
          </div>
          <div className="journey-header__stat journey-header__stat--skill">
            <dt>Primary Skill</dt>
            <dd>{quest.execution.primary_skill.name}</dd>
          </div>
          <div className="journey-header__stat journey-header__stat--duration">
            <dt>Suggested Session</dt>
            <dd>{quest.execution.estimated_minutes} min</dd>
          </div>
        </dl>
        <div className="journey-header__intro">
          <h1 id="quest-journey-title">{quest.identity.title}</h1>
          <p>{quest.objective.summary}</p>
        </div>
        <div className="journey-header__topics" aria-label="Quest challenge items">
          {topics.map((topic) => (
            <button
              key={topic.key}
              type="button"
              aria-pressed={selectedTopic?.key === topic.key}
              disabled={pending || archived}
              onClick={() => void selectTopicAndMap(topic.key)}
            >
              <span>{topic.name}</span>
              <small>{topic.roles.join(" · ")}</small>
            </button>
          ))}
        </div>
        <div className="journey-header__actions">
          {archived ? (
            <button
              className="action-button action-button--primary"
              disabled={pending}
              onClick={() => void lifecycle("UNARCHIVE")}
            >
              Restore Quest
            </button>
          ) : (
            <>
              {journey.lifecycleStatus === "SAVED" ? (
                <button
                  className="action-button action-button--secondary"
                  disabled={pending}
                  onClick={() => void lifecycle("START")}
                >
                  Start Quest
                </button>
              ) : null}
              <button
                className="action-button action-button--primary"
                disabled={pending}
                onClick={() => void practice()}
              >
                {pending ? "Working…" : practiceLabel}
              </button>
              {journey.lifecycleStatus === "CONCLUDED" ||
              journey.lifecycleStatus === "ABANDONED" ? (
                <button
                  className="action-button action-button--secondary"
                  disabled={pending}
                  onClick={() => void lifecycle("REOPEN")}
                >
                  Reopen Quest
                </button>
              ) : null}
            </>
          )}
          <small>This Quest can span multiple practice Sessions.</small>
        </div>
      </header>
      {error ? (
        <p className="session-notice" role="alert">
          {error}
        </p>
      ) : null}

      <nav className="mec-navigator" aria-label="Quest Journey stages">
        {stages.map((stage) => {
          const copy = journeyStageContent[stage];
          const current = journey.currentStage === stage;
          return (
            <button
              key={stage}
              type="button"
              aria-pressed={current}
              className={current ? "mec-stage is-current" : "mec-stage"}
              disabled={pending || archived}
              onClick={() => void chooseStage(stage)}
            >
              <span>{copy.label}</span>
              <small>{copy.verb}</small>
              {current ? <em>Current stage</em> : null}
            </button>
          );
        })}
      </nav>

      <div className="journey-layout">
        <main className="panel journey-canvas" aria-live="polite">
          {journey.currentStage === "MAP" ? (
            selectedTopic ? (
              <section className="map-topic" aria-labelledby="map-topic-title">
                <header>
                  <p className="eyebrow">{selectedTopic.roles.join(" · ")}</p>
                  <h2 id="map-topic-title">{selectedTopic.name}</h2>
                </header>
                <section>
                  <h3>What it is</h3>
                  {selectedTopic.codex ? (
                    <>
                      <p>{selectedTopic.codex.definition}</p>
                      <CodexReferenceLink
                        reference={{
                          kind: selectedTopic.codex.kind,
                          slug: selectedTopic.codex.slug,
                          name: selectedTopic.codex.name,
                          role: selectedTopic.roles[0] ?? "Quest item",
                          href: selectedTopic.codex.href,
                        }}
                      />
                    </>
                  ) : (
                    <p>No verified Codex definition is available for this snapshot item.</p>
                  )}
                </section>
                <section>
                  <h3>Within this Quest</h3>
                  <ul className="journey-list">
                    {selectedTopic.questDetails.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <section className="map-topic__learn" aria-labelledby="map-how-to-explore">
                  <h3 id="map-how-to-explore">How to explore</h3>
                  <p>
                    Choose a learning level and open this ingredient in Explore. Opening a lesson
                    does not automatically create a Workbook or record practice progress.
                  </p>
                  <div className="map-topic__level-tabs" role="tablist" aria-label="Learning level">
                    {learningLevels.map((item) => (
                      <button
                        key={item.id}
                        id={`map-level-tab-${item.id}`}
                        type="button"
                        role="tab"
                        aria-selected={mapLevel === item.id}
                        aria-controls="map-level-content"
                        onClick={() => setMapLevel(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div
                    className="map-topic__level-content"
                    id="map-level-content"
                    role="tabpanel"
                    aria-labelledby={`map-level-tab-${mapLevel}`}
                  >
                    {mapLevelLessons.length ? (
                      <ul className="map-topic__lesson-list">
                        {mapLevelLessons.map((lesson) => (
                          <li key={lesson.id}>
                            <div>
                              <strong>{lesson.title}</strong>
                              <small>{lesson.application} · Codex preview lesson</small>
                            </div>
                            <button
                              type="button"
                              disabled={pending || archived}
                              onClick={() => void exploreSelectedTopic(lesson.title)}
                            >
                              Explore this lesson →
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        {selectedTopic.codex
                          ? "No level-specific draft lesson is available here. You can still explore this Quest ingredient or read its canonical Codex reference."
                          : "This Quest item has no separate Codex lesson. Explore it using the Quest objective as a starting point."}
                      </p>
                    )}
                    <div className="map-topic__level-actions">
                      <button
                        className="action-button action-button--primary"
                        type="button"
                        disabled={pending || archived}
                        onClick={() => void exploreSelectedTopic()}
                      >
                        Open {selectedTopic.name} in Explore →
                      </button>
                      {selectedTopic.codex ? (
                        <Link href={selectedTopic.codex.href} className="text-link">
                          Read in Codex ↗
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </section>
                {selectedMapCodex?.blocks.length ? (
                  <details className="map-topic__interactive">
                    <summary>Try this Skill's interactive Codex reference</summary>
                    <CodexV2Reference blocks={selectedMapCodex.blocks} />
                  </details>
                ) : null}
                <section className="map-topic__action">
                  <h3>Optional: Start a Workbook</h3>
                  <p>
                    Create a private Workbook seeded with this Quest context, or simply open
                    Explore above and connect an existing Page there. Creating a Workbook is an
                    explicit separate action.
                  </p>
                  <button
                    className="action-button action-button--secondary"
                    type="button"
                    disabled={pending || archived}
                    onClick={() => void createTopicWorkbook()}
                  >
                    {pending ? "Preparing Workbook…" : "Create Workbook and open Explore"}
                  </button>
                </section>
              </section>
            ) : (
              <p>No selectable Quest items are available.</p>
            )
          ) : null}
          {journey.currentStage === "EXPLORE" ? (
            <>
              <section className="explore-workspaces" aria-labelledby="explore-workspaces-title">
                {learningFocus ? (
                  <div className="explore-learning-focus" role="status">
                    <span className="eyebrow">Selected from Map · {learningLevels.find((item) => item.id === learningFocus.level)?.label}</span>
                    <strong>{learningFocus.title}</strong>
                    <p>Work with this ingredient here or link an existing Page. Entering Explore does not create a Workbook.</p>
                    {learningFocus.moduleKey && mapCodexLearning[learningFocus.moduleKey] ? (
                      <Link
                        className="text-link"
                        href={`/prototype/codex-v2?skill=${encodeURIComponent(learningFocus.moduleKey)}`}
                      >
                        Open this Skill in the Codex preview ↗
                      </Link>
                    ) : null}
                  </div>
                ) : null}
                <div className="journey-section-heading">
                  <div>
                    <p className="eyebrow">MODULAR PRACTICE WORKSPACES</p>
                    <h2 id="explore-workspaces-title">Explore the Quest ingredients</h2>
                  </div>
                  <button
                    type="button"
                    disabled={orderedModuleKeys.every(
                      (key, index) => key === suggestedModules[index]?.slug,
                    )}
                    onClick={() =>
                      void persistModuleOrder(suggestedModules.map((item) => item.slug))
                    }
                  >
                    Reset to Suggested Order
                  </button>
                </div>
                <p role="status">{moduleMessage}</p>
                {exploreModules.map((module, index) => {
                  const expanded = expandedModules.has(module.slug);
                  const links = workbookLinks.filter(
                    (link) => link.stage === "EXPLORE" && link.module_key === module.slug,
                  );
                  const reference = [
                    references.primarySkill,
                    ...references.secondarySkills,
                    ...references.requiredTechniques,
                  ].find((item) => item.slug === module.slug);
                  return (
                    <section
                      className="explore-module"
                      key={module.slug}
                      aria-labelledby={`module-${module.slug}`}
                    >
                      <div className="explore-module__heading">
                      <button
                        id={`module-${module.slug}`}
                        type="button"
                        className="explore-module__disclosure"
                        aria-expanded={expanded}
                        aria-controls={`module-panel-${module.slug}`}
                        onClick={() =>
                          setExpandedModules((current) => {
                            const next = new Set(current);
                            if (next.has(module.slug)) next.delete(module.slug);
                            else next.add(module.slug);
                            return next;
                          })
                        }
                      >
                        <span>
                          <strong>{module.name}</strong>
                          <small>{module.roles.join(" · ")}</small>
                        </span>
                        <span>
                          {links.length} linked {links.length === 1 ? "page" : "pages"}
                        </span>
                      </button>
                      <div className="explore-module__reorder" role="group" aria-label={`Reorder ${module.name}`}>
                        <button
                          type="button"
                          aria-label={`Move ${module.name} earlier`}
                          title="Move this ingredient earlier"
                          disabled={pending || index === 0}
                          onClick={() => {
                            const next = [...orderedModuleKeys];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            void persistModuleOrder(next);
                          }}
                        >
                          ↑ Earlier
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${module.name} later`}
                          title="Move this ingredient later"
                          disabled={pending || index === exploreModules.length - 1}
                          onClick={() => {
                            const next = [...orderedModuleKeys];
                            [next[index + 1], next[index]] = [next[index], next[index + 1]];
                            void persistModuleOrder(next);
                          }}
                        >
                          ↓ Later
                        </button>
                      </div>
                      </div>
                      <div
                        id={`module-panel-${module.slug}`}
                        hidden={!expanded}
                        className="explore-module__panel"
                      >
                        {module.roles.includes("Primary") ? (
                          <p>{quest.objective.summary}</p>
                        ) : (
                          <p>
                            This canonical Quest ingredient supports the shared objective; no
                            separate target is inferred.
                          </p>
                        )}
                        {reference ? (
                          <p>
                            Codex: <CodexReferenceLink reference={reference} />
                          </p>
                        ) : null}
                        {links.length ? (
                          <ul>
                            {links.map((link) => {
                              const page = workbookPages.find((item) => item.id === link.page_id);
                              return page ? (
                                <li key={link.id}>
                                  <button
                                    type="button"
                                    className="text-link"
                                    onClick={() =>
                                      setOpenExplorePage({
                                        pageId: page.id,
                                        moduleKey: module.slug,
                                      })
                                    }
                                  >
                                    {page.title}
                                  </button>
                                </li>
                              ) : null;
                            })}
                          </ul>
                        ) : (
                          <p>No module-assigned pages yet.</p>
                        )}
                        <div className="explore-module__actions">
                          <button
                            type="button"
                            disabled={pending || archived}
                            onClick={() => void newModulePage(module.slug)}
                          >
                            New Page
                          </button>
                          <label className="explore-module__existing-page">
                            <span>Link an existing Workbook page</span>
                            <select
                              aria-label={`Choose existing page for ${module.name}`}
                              defaultValue=""
                              disabled={pending || archived}
                              onChange={(event) =>
                                void linkModulePage(module.slug, event.target.value)
                              }
                            >
                              <option value="">Choose a page…</option>
                              {workbookPages.map((page) => (
                                <option key={page.id} value={page.id}>
                                  {page.title}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    </section>
                  );
                })}
                {workbookLinks.some((link) => link.stage === "EXPLORE" && !link.module_key) ? (
                  <details className="explore-unassigned">
                    <summary>General Explore Pages / Unassigned</summary>
                    <ul>
                      {workbookLinks
                        .filter((link) => link.stage === "EXPLORE" && !link.module_key)
                        .map((link) => {
                          const page = workbookPages.find((item) => item.id === link.page_id);
                          return page ? (
                            <li key={link.id}>
                              <button
                                type="button"
                                className="text-link"
                                onClick={() =>
                                  setOpenExplorePage({ pageId: page.id, moduleKey: null })
                                }
                              >
                                {page.title}
                              </button>
                              <label>
                                Assign to
                                <select
                                  defaultValue=""
                                  onChange={async (event) => {
                                    if (!event.target.value) return;
                                    try {
                                      const updated = await assignExploreModulePage(
                                        client(),
                                        link.id,
                                        event.target.value,
                                      );
                                      setWorkbookLinks((current) =>
                                        current.map((item) =>
                                          item.id === updated.id ? updated : item,
                                        ),
                                      );
                                    } catch {
                                      setModuleMessage("That legacy page could not be assigned.");
                                    }
                                  }}
                                >
                                  <option value="">Choose module</option>
                                  {exploreModules.map((item) => (
                                    <option key={item.slug} value={item.slug}>
                                      {item.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </li>
                          ) : null;
                        })}
                    </ul>
                  </details>
                ) : null}
              </section>
              {openExplorePage ? (
                <WorkbookPersistenceSurface
                  context={{
                    questId,
                    stage: "EXPLORE",
                    relationship: "APPLIES_TO",
                    pageId: openExplorePage.pageId,
                  }}
                  embeddedExplore={openExplorePage}
                />
              ) : null}
            </>
          ) : null}
          {journey.currentStage === "CRAFT" ? (
            <WorkbookPersistenceSurface
              context={{ questId, stage: "CRAFT", relationship: "CREATED_DURING" }}
              embeddedCraft
            />
          ) : null}
        </main>

        <aside className="panel journey-practice" aria-labelledby="journey-practice-title">
          <p className="eyebrow">
            {journey.currentStage === "CRAFT"
              ? "QUEST TOOLKIT"
              : journey.currentStage === "MAP"
                ? "QUEST WORKBOOKS"
                : "EXPLORE"}
          </p>
          <h2 id="journey-practice-title">
            {journey.currentStage === "CRAFT"
              ? "Quest ingredients"
              : journey.currentStage === "MAP"
                ? "Linked pages"
                : "Practice workspaces"}
          </h2>
          {journey.currentStage === "MAP" ? (
            <>
              {stageLinks.length ? (
                <ul className="journey-list">
                  {stageLinks.map((link) => {
                    const page = workbookPages.find((item) => item.id === link.page_id);
                    const owner = page
                      ? workbooks.find((item) => item.id === page.workbook_id)
                      : null;
                    return page ? (
                      <li key={link.id}>
                        <Link
                          href={workbookContextHref(questId, "MAP", link.relationship, {
                            pageId: page.id,
                          })}
                        >
                          {owner?.title ?? "Workbook"} · {page.title}
                        </Link>
                      </li>
                    ) : null;
                  })}
                </ul>
              ) : (
                <p>No Map-linked pages yet.</p>
              )}
              <Link
                className="action-button action-button--secondary"
                href={workbookContextHref(questId, "MAP", "REFERENCE")}
              >
                Open or link a Workbook
              </Link>
            </>
          ) : null}
          {journey.currentStage === "EXPLORE" ? (
            <p>
              Select a module page to edit it here. Select any challenge item above to return to its
              Map detail.
            </p>
          ) : null}
          {journey.currentStage === "CRAFT" ? (
            <details className="quest-toolkit" open>
              <summary>Creative guidance</summary>
              <dl className="journey-detail-list">
                <div>
                  <dt>Primary</dt>
                  <dd>
                    <CodexReferenceLink reference={references.primarySkill} />
                  </dd>
                </div>
                {references.secondarySkills.length ? (
                  <div>
                    <dt>Supporting</dt>
                    <dd>
                      <CodexReferenceList references={references.secondarySkills} />
                    </dd>
                  </div>
                ) : null}
                {references.requiredTechniques.length ? (
                  <div>
                    <dt>Techniques</dt>
                    <dd>
                      <CodexReferenceList references={references.requiredTechniques} />
                    </dd>
                  </div>
                ) : null}
              </dl>
              {constraints.length ? (
                <ul className="journey-list">
                  {constraints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              <div className="craft-prompts" aria-label="Creative prompt ideas">
                {["Riff", "Progression", "Melody", "Groove", "Étude", "Freeform idea"].map(
                  (label) => (
                    <span key={label}>{label}</span>
                  ),
                )}
              </div>
            </details>
          ) : null}
          {journey.currentStage === "CRAFT" ? (
            <div className="quest-toolkit__practice">
              <strong className="journey-duration">
                {quest.execution.estimated_minutes} minutes
              </strong>
              <p>Start Practice from the shared Quest header.</p>
            </div>
          ) : null}
        </aside>
      </div>

      {constraints.length ? (
        <details className="panel journey-requirements">
          <summary>Quest requirements</summary>
          <ul className="journey-list">
            {constraints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            Codex references: <CodexReferenceList references={references.constraints} />
          </p>
        </details>
      ) : null}

      <section className="panel journey-sessions" aria-labelledby="quest-sessions-title">
        <div className="journey-section-heading">
          <div>
            <p className="eyebrow">PRACTICE ACTIVITY</p>
            <h2 id="quest-sessions-title">Recent Sessions</h2>
          </div>
          <strong>{detail.sessionCount} total</strong>
        </div>
        {!detail.recentSessions.length ? (
          <p>No Sessions yet. This is activity history, not a measure of ability.</p>
        ) : (
          <ul className="quest-session-list">
            {detail.recentSessions.map((session) => {
              const action = sessionAction(session);
              return (
                <li key={session.id}>
                  <div>
                    <strong>
                      {session.status === "ENDED"
                        ? "Ended"
                        : session.status === "ACTIVE"
                          ? "In progress"
                          : "Paused"}
                    </strong>
                    <span>
                      {dateTime(session.startedAt)}
                      {session.resultOutcome
                        ? ` · Session result: ${session.resultOutcome[0] + session.resultOutcome.slice(1).toLowerCase()}`
                        : ""}
                    </span>
                  </div>
                  <Link className="text-link" href={action.href}>
                    {action.label}
                  </Link>
                  <Link
                    className="text-link"
                    href={workbookContextHref(questId, journey.currentStage, "APPLIES_TO", {
                      sessionId: session.id,
                    })}
                  >
                    Session Workbook
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <details className="panel journey-options">
        <summary>Journey options</summary>
        <div>
          {journey.lifecycleStatus === "ACTIVE" ? (
            <>
              <button
                className="action-button action-button--secondary"
                disabled={pending}
                onClick={() => void lifecycle("CONCLUDE")}
              >
                Conclude Quest
              </button>
              <button
                className="text-button"
                disabled={pending}
                onClick={() => void lifecycle("ABANDON")}
              >
                Stop Quest
              </button>
            </>
          ) : null}
          {journey.lifecycleStatus === "SAVED" ? (
            <button
              className="text-button"
              disabled={pending}
              onClick={() => void lifecycle("ABANDON")}
            >
              Stop Quest
            </button>
          ) : null}
          {!archived ? (
            <button
              className="text-button"
              disabled={pending}
              onClick={() => void lifecycle("ARCHIVE")}
            >
              Archive Quest
            </button>
          ) : null}
        </div>
        {journey.lifecycleStatus === "ACTIVE" ? (
          <p>
            Conclude when this Journey has reached a useful stopping point. It does not claim
            mastery.
          </p>
        ) : null}
      </details>
    </section>
  );
}
