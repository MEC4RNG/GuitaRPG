"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MOBILE_NAVIGATION_ITEMS, NAVIGATION_GROUPS, isRouteActive } from "@/lib/navigation";

import { NavigationIcon } from "./navigation-icon";

type MobileNavProps = {
  pathname: string;
};

export function MobileNav({ pathname }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const firstLink = dialog?.querySelector<HTMLAnchorElement>("a[href]");
    firstLink?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]'),
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={menuButtonRef}
        className="mobile-menu-button"
        type="button"
        aria-controls="mobile-navigation-menu"
        aria-expanded={open}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
        Menu
      </button>

      {open ? (
        <div className="mobile-menu-layer">
          <button
            className="mobile-menu-backdrop"
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMenu}
          />
          <div
            ref={dialogRef}
            className="mobile-menu-panel"
            id="mobile-navigation-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="mobile-menu-panel__header">
              <strong>Navigate</strong>
              <button type="button" onClick={closeMenu} aria-label="Close navigation menu">
                ×
              </button>
            </div>
            <nav aria-label="All navigation">
              {NAVIGATION_GROUPS.map((group) => (
                <section className="mobile-menu-group" key={group.label}>
                  <h2>{group.label}</h2>
                  <div>
                    {group.items.map((item) => {
                      const active = isRouteActive(pathname, item.href);

                      return (
                        <Link
                          className={`mobile-menu-link${active ? " mobile-menu-link--active" : ""}`}
                          href={item.href}
                          key={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setOpen(false)}
                        >
                          <NavigationIcon icon={item.icon} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>
          </div>
        </div>
      ) : null}

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
    </>
  );
}
