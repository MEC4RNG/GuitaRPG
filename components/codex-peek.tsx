"use client";

import Link from "next/link";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { CodexKind } from "@/lib/codex/catalog-v1";
import { codexQuestRelevance, findCodexPeekEntry } from "@/lib/codex/peek-v1";
import type { QuestCodexReference } from "@/lib/quest/codex-references";

type PeekContextValue = {
  openPeek: (reference: QuestCodexReference, trigger: HTMLElement) => void;
};

const PeekContext = createContext<PeekContextValue | null>(null);

const kindLabel: Record<CodexKind, string> = {
  SKILL: "Skill",
  CONCEPT: "Concept",
  CONTEXT: "Context",
  CONSTRAINT: "Constraint",
};

export function CodexPeekProvider({ children }: { children: ReactNode }) {
  const [reference, setReference] = useState<QuestCodexReference | null>(null);
  const [mobile, setMobile] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setReference(null);
    const trigger = triggerRef.current;
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus();
      else document.getElementById("main-content")?.focus();
    });
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 47.99rem)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!reference) return;
    closeRef.current?.focus();
    if (!mobile) return;
    const background = document.querySelector<HTMLElement>(".app-shell__frame");
    background?.setAttribute("inert", "");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      background?.removeAttribute("inert");
      document.body.style.overflow = previousOverflow;
    };
  }, [mobile, reference]);

  function openPeek(next: QuestCodexReference, trigger: HTMLElement) {
    triggerRef.current = trigger;
    setReference(next);
  }

  function trapMobileFocus(event: KeyboardEvent<HTMLElement>) {
    if (!mobile || event.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const entry = reference ? findCodexPeekEntry(reference) : null;

  return (
    <PeekContext.Provider value={{ openPeek }}>
      {children}
      {reference && entry ? (
        <div className="codex-peek-layer" data-mobile={mobile || undefined}>
          <button
            className="codex-peek-backdrop"
            type="button"
            aria-label="Close Codex Peek"
            tabIndex={mobile ? 0 : -1}
            onClick={close}
          />
          <aside
            ref={panelRef}
            className="codex-peek"
            role="dialog"
            aria-modal={mobile || undefined}
            aria-labelledby="codex-peek-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
              else trapMobileFocus(event);
            }}
          >
            <header className="codex-peek__header">
              <div>
                <span className="codex-kind">{kindLabel[entry.kind]}</span>
                <h2 id="codex-peek-title">{reference.name}</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="codex-peek__close"
                aria-label="Close Codex Peek"
                onClick={close}
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className="codex-peek__content">
              {entry.domain ? (
                <p className="codex-peek__classification">Domain · {entry.domain.name}</p>
              ) : null}
              {typeof entry.metadata.context_family === "string" ? (
                <p className="codex-peek__classification">
                  Context family · {entry.metadata.context_family}
                </p>
              ) : null}
              <section>
                <h3>Definition</h3>
                <p>{entry.definition}</p>
              </section>
              <section>
                <h3>In this Quest</h3>
                <p>{codexQuestRelevance(reference.role)}</p>
                {reference.parameter ? (
                  <dl className="codex-peek__parameter">
                    <dt>Quest parameter</dt>
                    <dd>{reference.parameter}</dd>
                  </dl>
                ) : null}
              </section>
              {entry.relationships.length ? (
                <section>
                  <h3>Related information</h3>
                  <ul>
                    {entry.relationships.slice(0, 5).map((relationship) => (
                      <li
                        key={`${relationship.direction}-${relationship.type}-${relationship.entity.id}`}
                      >
                        {relationship.entity.name} ·{" "}
                        {relationship.type.replaceAll("_", " ").toLocaleLowerCase()}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
            <footer className="codex-peek__footer">
              <Link
                href={entry.href}
                target="_blank"
                rel="noopener noreferrer"
                className="action-button action-button--primary"
              >
                Open Full Codex Entry
              </Link>
            </footer>
          </aside>
        </div>
      ) : null}
    </PeekContext.Provider>
  );
}

export function useCodexPeek() {
  const value = useContext(PeekContext);
  if (!value) throw new Error("useCodexPeek must be used within CodexPeekProvider");
  return value;
}
