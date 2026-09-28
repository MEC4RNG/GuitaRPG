import Link from "next/link";

import { MOBILE_NAVIGATION_ITEMS, isRouteActive } from "@/lib/navigation";

import { NavigationIcon } from "./navigation-icon";

type MobileNavProps = {
  pathname: string;
};

export function MobileNav({ pathname }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {MOBILE_NAVIGATION_ITEMS.map((item) => {
        const active = isRouteActive(pathname, item.href);

        return (
          <Link
            className={[
              "mobile-nav__item",
              active ? "mobile-nav__item--active" : "",
              item.primaryAction ? "mobile-nav__item--primary" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href={item.href}
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
