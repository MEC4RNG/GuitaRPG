"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getNavigationItem, getSurfaceForPath, NAVIGATION_GROUPS } from "@/lib/navigation";

import { MobileNav } from "./mobile-nav";
import { MobileNavigationMenu } from "./mobile-navigation-menu";
import { Sidebar } from "./sidebar";
import { CodexPeekProvider } from "./codex-peek";

type AppShellProps = {
  children: ReactNode;
  atlasAvailable?: boolean;
  atlasDefault?: boolean;
};

export function AppShell({ children, atlasAvailable = false, atlasDefault = false }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const atlas = atlasAvailable && (atlasDefault || pathname.startsWith("/prototype/studio-atlas/home"));
  const atlasHome = atlasDefault ? "/" : "/prototype/studio-atlas/home";
  const surface = getSurfaceForPath(pathname);
  const current = getNavigationItem(pathname);
  const workbookWorkspace = pathname === "/workbooks";
  const prototypeClass =
    pathname === "/prototype/workbook" || pathname === "/workbooks"
      ? " app-shell--workbook-prototype"
      : "";

  return (
    <div
      className={`app-shell app-shell--${surface}${prototypeClass}${workbookWorkspace ? " app-shell--workbook-workspace" : ""}${atlas ? " app-shell--atlas" : ""}${atlas && collapsed ? " app-shell--atlas-compact" : ""}`}
      data-surface={surface}
    >
      <CodexPeekProvider>
        <div className="app-shell__frame">
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>

          <Sidebar pathname={pathname} atlas={atlas} atlasHome={atlasHome} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />

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
                <strong>{workbookWorkspace ? "Sound Uncharted · Workbooks" : current.label}</strong>
              </div>
              {workbookWorkspace ? (
                <nav className="workbook-app-navigation" aria-label="Application navigation">
                  {NAVIGATION_GROUPS.flatMap((group) => group.items).map((item) => (
                    <Link key={item.href} href={item.href}>
                      {item.label}
                    </Link>
                  ))}
                  <Link href="/workbooks" aria-current="page">
                    Workbooks
                  </Link>
                </nav>
              ) : null}
              <MobileNavigationMenu key={pathname} pathname={pathname} atlas={atlas} atlasHome={atlasHome} />
            </header>

            <main className="app-content" id="main-content" tabIndex={-1}>
              {children}
            </main>
          </div>

          <MobileNav pathname={pathname} atlasHome={atlas ? atlasHome : undefined} />
        </div>
      </CodexPeekProvider>
    </div>
  );
}
