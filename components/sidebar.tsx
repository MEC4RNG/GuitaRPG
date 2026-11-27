import Link from "next/link";

import { NAVIGATION_GROUPS, isRouteActive } from "@/lib/navigation";

import { NavigationIcon } from "./navigation-icon";
import { AtlasCompass } from "./studio-atlas-primitives";

type SidebarProps = {
  pathname: string;
  atlas?: boolean;
  atlasHome?: string;
  collapsed?: boolean;
  onToggle?: () => void;
};

export function Sidebar({ pathname, atlas = false, atlasHome = "/", collapsed = false, onToggle }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar__brand">
        <Link
          className="brand-mark"
          href={atlas ? atlasHome : "/"}
          aria-label="Sound Uncharted home, Practice operating system"
        >
          <span className="brand-mark__glyph" aria-hidden="true">
            {atlas ? <AtlasCompass /> : "SU"}
          </span>
          <span className="sidebar__brand-copy">
            <strong>Sound Uncharted</strong>
            <small aria-hidden="true">Practice OS</small>
          </span>
        </Link>
      </div>
      {atlas ? (
        <button className="atlas-rail-toggle" type="button" aria-expanded={!collapsed} aria-controls="primary-sidebar-links" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={onToggle}>
          <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
          <span className="atlas-rail-label">{collapsed ? "Expand" : "Collapse"}</span>
        </button>
      ) : null}

      <nav className="sidebar__nav" id="primary-sidebar-links">
        {NAVIGATION_GROUPS.map((group) => (
          <section
            className="nav-group"
            key={group.label}
            aria-labelledby={`nav-group-${group.label.toLowerCase()}`}
          >
            <h2 id={`nav-group-${group.label.toLowerCase()}`}>{group.label}</h2>
            <div className="nav-group__items">
              {group.items.map((item) => {
                const href = atlas && item.href === "/" ? atlasHome : item.href;
                const active = isRouteActive(pathname, href) || (atlas && ((item.href === "/quests" && pathname.startsWith("/quest/")) || (item.href === "/" && pathname === "/prototype/studio-atlas/home") || (item.href === "/codex" && pathname.startsWith("/prototype/codex-v2"))));

                return (
                  <Link
                    className={`nav-link${active ? " nav-link--active" : ""}`}
                    href={href}
                    aria-label={atlas ? item.label : undefined}
                    title={atlas && collapsed ? item.label : undefined}
                    key={item.href}
                    aria-current={active ? "page" : undefined}
                  >
                    <NavigationIcon icon={item.icon} />
                    <span className="atlas-rail-label">{item.label}</span>
                    {item.primaryAction ? <span className="nav-link__signal">+</span> : null}
                  </Link>
                );
              })}
              {atlas && group.label === "Learn" ? (
                <Link className={`nav-link${pathname === "/workbooks" ? " nav-link--active" : ""}`} href="/workbooks" aria-current={pathname === "/workbooks" ? "page" : undefined} aria-label="Workbooks" title={collapsed ? "Workbooks" : undefined}>
                  <NavigationIcon icon="quests" />
                  <span className="atlas-rail-label">Workbooks</span>
                </Link>
              ) : null}
            </div>
          </section>
        ))}
      </nav>

      <div className="sidebar__footer">
        <span>
          <strong>Practice · Progress · Adapt</strong>
          <small>Build your guitar journey</small>
        </span>
      </div>
    </aside>
  );
}
