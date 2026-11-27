"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { NAVIGATION_GROUPS, isRouteActive } from "@/lib/navigation";

import { NavigationIcon } from "./navigation-icon";

export function MobileNavigationMenu({ pathname }: { pathname: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => {
      if (desktop.matches && dialogRef.current?.open) dialogRef.current.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  function closeMenu() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="mobile-menu-button"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-navigation-menu"
        aria-label="Open navigation menu"
        onClick={() => {
          dialogRef.current?.showModal();
          setOpen(true);
          dialogRef.current?.querySelector<HTMLAnchorElement>("a[href]")?.focus();
        }}
      >
        <span aria-hidden="true">☰</span> Menu
      </button>
      <dialog
        ref={dialogRef}
        id="mobile-navigation-menu"
        className="mobile-menu-panel"
        aria-label="Navigation menu"
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu();
        }}
      >
        <div className="mobile-menu-content">
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
                    const active =
                      isRouteActive(pathname, item.href) ||
                      (item.href === "/codex" &&
                        (pathname === "/prototype/codex-v2" ||
                          pathname.startsWith("/prototype/codex-v2/")));
                    return (
                      <Link
                        className={`mobile-menu-link${active ? " mobile-menu-link--active" : ""}`}
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={closeMenu}
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
      </dialog>
    </>
  );
}
