import { describe, expect, it } from "vitest";

import {
  ALL_NAVIGATION_ITEMS,
  MOBILE_NAVIGATION_ITEMS,
  NAVIGATION_GROUPS,
  getNavigationItem,
  getSurfaceForPath,
  isRouteActive,
} from "@/lib/navigation";

describe("UX-002 application navigation", () => {
  it("implements the approved desktop information architecture", () => {
    expect(NAVIGATION_GROUPS.map((group) => group.label)).toEqual([
      "Play",
      "Development",
      "Learn",
      "System",
    ]);

    expect(
      NAVIGATION_GROUPS.find((group) => group.label === "Play")?.items.map((item) => item.label),
    ).toEqual(["Home", "Generate", "Quests", "Training"]);
    expect(
      NAVIGATION_GROUPS.find((group) => group.label === "Development")?.items.map(
        (item) => item.label,
      ),
    ).toEqual(["Character", "Skills", "History"]);
    expect(
      NAVIGATION_GROUPS.find((group) => group.label === "Learn")?.items.map((item) => item.label),
    ).toEqual(["Codex"]);
    expect(
      NAVIGATION_GROUPS.find((group) => group.label === "System")?.items.map((item) => item.label),
    ).toEqual(["Profile"]);
    expect(NAVIGATION_GROUPS.flatMap((group) => group.items)).not.toContainEqual(
      expect.objectContaining({ label: "Settings" }),
    );
    expect(ALL_NAVIGATION_ITEMS).not.toContainEqual(expect.objectContaining({ href: "/settings" }));
  });

  it("implements the approved four-item mobile navigation", () => {
    expect(MOBILE_NAVIGATION_ITEMS.map((item) => item.label)).toEqual([
      "Home",
      "Generate",
      "Skills",
      "Profile",
    ]);
    expect(MOBILE_NAVIGATION_ITEMS).toHaveLength(4);
    expect(MOBILE_NAVIGATION_ITEMS.find((item) => item.label === "Generate")?.primaryAction).toBe(
      true,
    );
  });

  it("assigns the correct design surface to product routes", () => {
    expect(getSurfaceForPath("/")).toBe("hud");
    expect(getSurfaceForPath("/generate")).toBe("hud");
    expect(getSurfaceForPath("/training")).toBe("hud");
    expect(getSurfaceForPath("/quests")).toBe("hud");
    expect(getSurfaceForPath("/quest/0247")).toBe("hud");
    expect(getSurfaceForPath("/character")).toBe("lab");
    expect(getSurfaceForPath("/skills")).toBe("lab");
    expect(getSurfaceForPath("/history")).toBe("lab");
    expect(getSurfaceForPath("/history/attempt-1")).toBe("lab");
    expect(getSurfaceForPath("/codex")).toBe("codex");
    expect(getSurfaceForPath("/profile")).toBe("hud");
  });

  it("keeps nested routes active under their owning navigation item", () => {
    expect(isRouteActive("/skills/alternate-picking", "/skills")).toBe(true);
    expect(isRouteActive("/quest/0247", "/")).toBe(false);
    expect(getNavigationItem("/quest/0247").label).toBe("Quests");
    expect(getNavigationItem("/codex/dorian").label).toBe("Codex");
    expect(getNavigationItem("/history/attempt-1").label).toBe("History");
  });

  it("uses unique route destinations", () => {
    const hrefs = ALL_NAVIGATION_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
