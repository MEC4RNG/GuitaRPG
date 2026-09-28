"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { getNavigationItem, getSurfaceForPath } from "@/lib/navigation";

import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const surface = getSurfaceForPath(pathname);
  const current = getNavigationItem(pathname);

  return (
    <div className={`app-shell app-shell--${surface}`} data-surface={surface}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Sidebar pathname={pathname} />

      <div className="app-shell__workspace">
        <header className="topbar">
          <div>
            <span className="topbar__eyebrow">
              {surface === "lab"
                ? "PRACTICE LAB"
                : surface === "codex"
                  ? "CODEX"
                  : "INSTRUMENT HUD"}
            </span>
            <strong>{current.label}</strong>
          </div>
          <div className="topbar__status" aria-label="Application status">
            <span className="status-dot" aria-hidden="true" />
            <span>v1 foundation</span>
          </div>
        </header>

        <main className="app-content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <MobileNav pathname={pathname} />
    </div>
  );
}
