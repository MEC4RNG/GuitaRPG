import type { ComponentPropsWithRef, ReactNode } from "react";

export type AtlasDomain =
  | "technique"
  | "fretboard"
  | "harmony_theory"
  | "rhythm"
  | "ear_musicianship"
  | "creativity_expression";

const domainPaths: Record<AtlasDomain, ReactNode> = {
  technique: <path d="M12 3C5 3 3 8 5 12l5 8q2 3 4 0l5-8C21 8 19 3 12 3ZM9 8l6 4" />,
  fretboard: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="1" />
      <path d="M3 10h18M3 14h18M8 6v12M13 6v12M18 6v12" />
      <circle cx="10.5" cy="12" r="1" />
    </>
  ),
  harmony_theory: (
    <>
      <path d="m12 4 8 14H4Z" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="20" cy="18" r="2" />
      <circle cx="4" cy="18" r="2" />
    </>
  ),
  rhythm: <path d="M3 12h3l2-7 4 14 4-14 2 7h3M4 20h16" />,
  ear_musicianship: (
    <path d="M7 10a5 5 0 0 1 10 0c0 4-4 5-4 8a2 2 0 0 1-4 0v-2M9 10a3 3 0 0 1 6 0c0 2-2 2-3 4" />
  ),
  creativity_expression: (
    <path d="M4 17c5-1 6-10 10-10 3 0 3 5 6 5M4 20c5 0 8-3 10-6M16 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" />
  ),
};

export function AtlasCompass({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false" className={className}>
      <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeOpacity=".45" />
      <path d="M24 2v8M24 38v8M2 24h8M38 24h8" stroke="currentColor" strokeWidth="1.5" />
      <path d="m24 7 4.5 12.5L41 24l-12.5 4.5L24 41l-4.5-12.5L7 24l12.5-4.5Z" fill="currentColor" />
      <path d="m24 12 2 10 10 2-10 2-2 10-2-10-10-2 10-2Z" fill="#101518" />
      <circle cx="24" cy="24" r="2.3" fill="currentColor" />
    </svg>
  );
}

export function AtlasBrand() {
  return (
    <div className="sa-brand">
      <AtlasCompass className="sa-compass" />
      <div>
        <strong>Sound Uncharted</strong>
        <span>Discover · Develop · Create</span>
      </div>
    </div>
  );
}

export function AtlasDomainIcon({ domain }: { domain: AtlasDomain }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {domainPaths[domain]}
    </svg>
  );
}

export function AtlasButton({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button {...props} type={type} className={`sa-button sa-button--${variant} ${className}`} />
  );
}

export function AtlasPanel({
  children,
  title,
  eyebrow,
  className = "",
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <section className={`sa-panel ${className}`}>
      {eyebrow ? <p className="sa-eyebrow">{eyebrow}</p> : null}
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export type AtlasStatusKind =
  "success" | "warning" | "danger" | "information" | "estimated" | "unknown";

const cues: Record<AtlasStatusKind, string> = {
  success: "✓",
  warning: "!",
  danger: "×",
  information: "i",
  estimated: "≈",
  unknown: "—",
};

export function AtlasStatus({ kind, children }: { kind: AtlasStatusKind; children: ReactNode }) {
  return (
    <span className={`sa-status sa-status--${kind}`}>
      <span aria-hidden="true">{cues[kind]}</span>
      {children}
    </span>
  );
}

export function AtlasCover({
  domain,
  title,
  detail,
}: {
  domain: AtlasDomain;
  title: string;
  detail: string;
}) {
  return (
    <article className="sa-cover-item" data-domain={domain}>
      <div className="sa-cover-art" aria-hidden="true">
        <div className="sa-cover-inset">
          <AtlasDomainIcon domain={domain} />
        </div>
      </div>
      <h3>{title}</h3>
      <p>{detail}</p>
    </article>
  );
}
