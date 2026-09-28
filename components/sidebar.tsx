import Link from "next/link";

import { NAVIGATION_GROUPS, isRouteActive } from "@/lib/navigation";

import { NavigationIcon } from "./navigation-icon";

type SidebarProps = {
  pathname: string;
};

export function Sidebar({ pathname }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar__brand">
        <Link className="brand-mark" href="/" aria-label="GuitaRPG home">
          <span className="brand-mark__glyph" aria-hidden="true">
            GR
          </span>
          <span>
            <strong>GuitaRPG</strong>
            <small>Practice OS</small>
          </span>
        </Link>
        <span className="phase-chip">PHASE 1</span>
      </div>

      <nav className="sidebar__nav">
        {NAVIGATION_GROUPS.map((group) => (
          <section className="nav-group" key={group.label} aria-label={group.label}>
            <h2>{group.label}</h2>
            <div className="nav-group__items">
              {group.items.map((item) => {
                const active = isRouteActive(pathname, item.href);

                return (
                  <Link
                    className={`nav-link${active ? " nav-link--active" : ""}`}
                    href={item.href}
                    key={item.href}
                    aria-current={active ? "page" : undefined}
                  >
                    <NavigationIcon icon={item.icon} />
                    <span>{item.label}</span>
                    {item.primaryAction ? <span className="nav-link__signal">+</span> : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="sidebar__footer">
        <span className="status-dot" aria-hidden="true" />
        <span>
          <strong>Foundation online</strong>
          <small>Phase 0 contracts locked</small>
        </span>
      </div>
    </aside>
  );
}
