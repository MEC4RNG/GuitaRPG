import Link from "next/link";

import { MOBILE_NAVIGATION_ITEMS, isRouteActive } from "@/lib/navigation";

import { NavigationIcon } from "./navigation-icon";

type MobileNavProps = {
  pathname: string;
  atlasHome?: string;
};

export function MobileNav({ pathname, atlasHome }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {MOBILE_NAVIGATION_ITEMS.map((item) => {
        const href = item.href === "/" && atlasHome ? atlasHome : item.href;
        const active =
          isRouteActive(pathname, href) ||
          (Boolean(atlasHome) && item.href === "/" && pathname === "/prototype/studio-atlas/home") ||
          (item.href === "/codex" &&
            (pathname === "/prototype/codex-v2" || pathname.startsWith("/prototype/codex-v2/")));

        return (
          <Link
            className={[
              "mobile-nav__item",
              active ? "mobile-nav__item--active" : "",
              item.primaryAction ? "mobile-nav__item--primary" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={href}
            key={item.href}
            aria-current={active ? "page" : undefined}
          >
            <span className="mobile-nav__icon">
              <NavigationIcon icon={item.icon} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
