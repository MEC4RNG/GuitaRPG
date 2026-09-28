export type AppSurface = "hud" | "codex" | "lab";

export type NavigationItem = {
  label: string;
  href: string;
  icon:
    | "home"
    | "generate"
    | "training"
    | "character"
    | "skills"
    | "history"
    | "codex"
    | "profile"
    | "settings";
  surface: AppSurface;
  mobile?: boolean;
  primaryAction?: boolean;
};

export type NavigationGroup = {
  label: "PLAY" | "DEVELOPMENT" | "LEARN" | "SYSTEM";
  items: NavigationItem[];
};

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    label: "PLAY",
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
      { label: "Training", href: "/training", icon: "training", surface: "hud" },
    ],
  },
  {
    label: "DEVELOPMENT",
    items: [
      { label: "Character", href: "/character", icon: "character", surface: "lab" },
      { label: "Skills", href: "/skills", icon: "skills", surface: "lab", mobile: true },
      { label: "History", href: "/history", icon: "history", surface: "lab" },
    ],
  },
  {
    label: "LEARN",
    items: [{ label: "Codex", href: "/codex", icon: "codex", surface: "codex" }],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Profile", href: "/profile", icon: "profile", surface: "hud", mobile: true },
      { label: "Settings", href: "/settings", icon: "settings", surface: "hud" },
    ],
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
  return (
    ALL_NAVIGATION_ITEMS.find((item) => isRouteActive(pathname, item.href)) ??
    ALL_NAVIGATION_ITEMS[0]
  );
}

export function getSurfaceForPath(pathname: string): AppSurface {
  return getNavigationItem(pathname).surface;
}
