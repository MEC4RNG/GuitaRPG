export type AppSurface = "hud" | "codex" | "lab";

export type NavigationItem = {
  label: string;
  href: string;
  icon:
    | "home"
    | "generate"
    | "quests"
    | "training"
    | "character"
    | "skills"
    | "history"
    | "codex"
    | "profile";
  surface: AppSurface;
  mobile?: boolean;
  primaryAction?: boolean;
};

export type NavigationGroup = {
  label: "Play" | "Development" | "Learn" | "System";
  items: NavigationItem[];
};

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    label: "Play",
    items: [
      { label: "Home", href: "/", icon: "home", surface: "hud", mobile: true },
      {
        label: "Generate",
        href: "/generate",
        icon: "generate",
        surface: "hud",
        mobile: true,
        primaryAction: true,
      },
      { label: "Quests", href: "/quests", icon: "quests", surface: "hud" },
      { label: "Training", href: "/training", icon: "training", surface: "hud" },
    ],
  },
  {
    label: "Development",
    items: [
      { label: "Character", href: "/character", icon: "character", surface: "lab" },
      { label: "Skills", href: "/skills", icon: "skills", surface: "lab", mobile: true },
      { label: "History", href: "/history", icon: "history", surface: "lab" },
    ],
  },
  {
    label: "Learn",
    items: [{ label: "Codex", href: "/codex", icon: "codex", surface: "codex" }],
  },
  {
    label: "System",
    items: [{ label: "Profile", href: "/profile", icon: "profile", surface: "hud", mobile: true }],
  },
];

export const ALL_NAVIGATION_ITEMS = NAVIGATION_GROUPS.flatMap((group) => group.items);

export const MOBILE_NAVIGATION_ITEMS = ALL_NAVIGATION_ITEMS.filter((item) => item.mobile);

export function isRouteActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getNavigationItem(pathname: string) {
  if (pathname.startsWith("/quest/"))
    return ALL_NAVIGATION_ITEMS.find((item) => item.href === "/quests")!;
  return (
    ALL_NAVIGATION_ITEMS.find((item) => isRouteActive(pathname, item.href)) ??
    ALL_NAVIGATION_ITEMS[0]
  );
}

export function getSurfaceForPath(pathname: string): AppSurface {
  if (pathname === "/session" || pathname.startsWith("/session/")) return "hud";
  return getNavigationItem(pathname).surface;
}
