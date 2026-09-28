import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
  raised?: boolean;
};

export function Panel({ children, className = "", raised = false }: PanelProps) {
  return (
    <section
      className={["panel", raised ? "panel--raised" : "", className].filter(Boolean).join(" ")}
    >
      {children}
    </section>
  );
}
