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
      "PLAY",
      "DEVELOPMENT",
      "LEARN",
      "SYSTEM",
    ]);

    expect(NAVIGATION_GROUPS.find((group) => group.label === "PLAY")?.items.map((item) => item.label)).toEqual([
      "Home",
      "Generate",
      "Training",
    ]);
    expect(
      NAVIGATION_GROUPS.find((group) => group.label === "DEVELOPMENT")?.items.map(
        (item) => item.label,
      ),
    ).toEqual(["Character", "Skills", "History"]);
    expect(NAVIGATION_GROUPS.find((group) => group.label === "LEARN")?.items.map((item) => item.label)).toEqual([
      "Codex",
    ]);
    expect(
      NAVIGATION_GROUPS.find((group) => group.label === "SYSTEM")?.items.map(
        (item) => item.label,
      ),
    ).toEqual(["Profile", "Settings"]);
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
    expect(getSurfaceForPath("/character")).toBe("lab");
    expect(getSurfaceForPath("/skills")).toBe("lab");
    expect(getSurfaceForPath("/history")).toBe("lab");
    expect(getSurfaceForPath("/codex")).toBe("codex");
    expect(getSurfaceForPath("/profile")).toBe("hud");
    expect(getSurfaceForPath("/settings")).toBe("hud");
  });

  it("keeps nested routes active under their owning navigation item", () => {
    expect(isRouteActive("/skills/alternate-picking", "/skills")).toBe(true);
    expect(isRouteActive("/quest/0247", "/")).toBe(false);
    expect(getNavigationItem("/codex/dorian").label).toBe("Codex");
  });

  it("uses unique route destinations", () => {
    const hrefs = ALL_NAVIGATION_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
