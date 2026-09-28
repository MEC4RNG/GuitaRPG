import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

type Surface = {
  palette: Record<string, string>;
};

type DesignContract = {
  design_system_version: string;
  surfaces: Record<string, Surface>;
  semantic_colors: Record<string, { color: string; non_color_cue: string }>;
  typography: {
    minimum_body_px: number;
    minimum_mobile_input_px: number;
  };
  spacing_px: Record<string, number>;
  radii_px: Record<string, number>;
  breakpoints_px: Record<string, number>;
  layout: {
    minimum_touch_target_px: number;
    desktop_sidebar_from_breakpoint: string;
    mobile_bottom_nav_below_breakpoint: string;
  };
  motion: {
    durations_ms: Record<string, number>;
    reduced_motion: {
      must_be_supported: boolean;
      suppress_nonessential_transform_animation: boolean;
    };
  };
  accessibility: {
    minimum_normal_text_contrast: number;
    visible_keyboard_focus_required: boolean;
    state_signal_requires_non_color_cue: boolean;
    icon_only_action_requires_accessible_name: boolean;
    progress_requires_text_or_accessible_value: boolean;
    reduced_motion_required: boolean;
    mobile_touch_target_min_px: number;
  };
  navigation: {
    desktop: Record<string, string[]>;
    mobile: {
      items: string[];
      universal_primary_action: string;
      maximum_persistent_items_excluding_primary_action: number;
    };
  };
  components: Array<{
    name: string;
    required_states: string[];
    surface_variants: string[];
  }>;
  interaction_rules: Record<string, boolean>;
  legacy_css_aliases: Record<string, string>;
};

const root = resolve(import.meta.dirname, "..");
const contract = JSON.parse(
  readFileSync(resolve(root, "domain/ux/design-system-contract.json"), "utf8"),
) as DesignContract;
const css = readFileSync(resolve(root, "app/design-tokens.css"), "utf8");

function luminance(hex: string) {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);

  if (!channels || channels.length !== 3) {
    throw new Error(`invalid color: ${hex}`);
  }

  const linear = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string) {
  const a = luminance(foreground);
  const b = luminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("UX-001 hybrid design-system contract", () => {
  it("defines the three approved product surfaces", () => {
    expect(Object.keys(contract.surfaces)).toEqual([
      "INSTRUMENT_HUD",
      "CODEX",
      "PRACTICE_LAB",
    ]);
  });

  it("keeps primary and muted text readable against each surface background", () => {
    for (const [name, surface] of Object.entries(contract.surfaces)) {
      expect(
        contrast(surface.palette.text, surface.palette.background),
        `${name} primary text`,
      ).toBeGreaterThanOrEqual(contract.accessibility.minimum_normal_text_contrast);

      expect(
        contrast(surface.palette.muted, surface.palette.background),
        `${name} muted text`,
      ).toBeGreaterThanOrEqual(contract.accessibility.minimum_normal_text_contrast);
    }
  });

  it("requires a non-color cue for every semantic color", () => {
    expect(contract.accessibility.state_signal_requires_non_color_cue).toBe(true);

    for (const [name, semantic] of Object.entries(contract.semantic_colors)) {
      expect(semantic.non_color_cue.length, name).toBeGreaterThan(0);
    }
  });

  it("defines the required core component inventory", () => {
    const required = [
      "AppShell",
      "Sidebar",
      "MobileNav",
      "Panel",
      "QuestCard",
      "SkillBadge",
      "DifficultyBadge",
      "ProgressBar",
      "AttributeDisplay",
      "StatusChip",
      "MetricCard",
      "ActionButton",
    ];

    expect(contract.components.map((component) => component.name)).toEqual(required);

    for (const component of contract.components) {
      expect(component.required_states.length, component.name).toBeGreaterThan(0);
      expect(component.surface_variants.length, component.name).toBeGreaterThan(0);
    }
  });

  it("keeps desktop and mobile navigation aligned with the approved information architecture", () => {
    expect(contract.navigation.desktop.PLAY).toEqual(["Home", "Generate", "Training"]);
    expect(contract.navigation.desktop.DEVELOPMENT).toEqual(["Character", "Skills", "History"]);
    expect(contract.navigation.desktop.LEARN).toEqual(["Codex"]);
    expect(contract.navigation.desktop.SYSTEM).toEqual(["Profile", "Settings"]);

    expect(contract.navigation.mobile.items).toEqual(["Home", "Generate", "Skills", "Profile"]);
    expect(contract.navigation.mobile.universal_primary_action).toBe("Generate");
    expect(contract.navigation.mobile.items.length).toBeLessThanOrEqual(
      contract.navigation.mobile.maximum_persistent_items_excluding_primary_action,
    );
  });

  it("enforces mobile-equal interaction requirements", () => {
    expect(contract.layout.minimum_touch_target_px).toBeGreaterThanOrEqual(44);
    expect(contract.accessibility.mobile_touch_target_min_px).toBeGreaterThanOrEqual(44);
    expect(contract.typography.minimum_body_px).toBeGreaterThanOrEqual(16);
    expect(contract.typography.minimum_mobile_input_px).toBeGreaterThanOrEqual(16);
    expect(contract.interaction_rules.mobile_core_loop_requires_no_hover).toBe(true);
    expect(contract.interaction_rules.hover_is_never_required_for_information).toBe(true);
  });

  it("requires visible focus and reduced-motion behavior", () => {
    expect(contract.accessibility.visible_keyboard_focus_required).toBe(true);
    expect(contract.accessibility.icon_only_action_requires_accessible_name).toBe(true);
    expect(contract.accessibility.progress_requires_text_or_accessible_value).toBe(true);
    expect(contract.accessibility.reduced_motion_required).toBe(true);
    expect(contract.motion.reduced_motion.must_be_supported).toBe(true);
    expect(contract.motion.reduced_motion.suppress_nonessential_transform_animation).toBe(true);
  });

  it("uses monotonic spacing and responsive breakpoint scales", () => {
    const spacing = Object.values(contract.spacing_px);
    const breakpoints = Object.values(contract.breakpoints_px);

    expect(spacing).toEqual([...spacing].sort((a, b) => a - b));
    expect(breakpoints).toEqual([...breakpoints].sort((a, b) => a - b));
    expect(contract.layout.desktop_sidebar_from_breakpoint).toBe("lg");
    expect(contract.layout.mobile_bottom_nav_below_breakpoint).toBe("lg");
  });

  it("implements canonical CSS tokens and preserves scaffold compatibility aliases", () => {
    const canonicalTokens = [
      "--hud-bg",
      "--hud-surface",
      "--hud-text",
      "--codex-bg",
      "--codex-surface",
      "--codex-text",
      "--lab-bg",
      "--lab-surface",
      "--lab-text",
      "--semantic-success",
      "--semantic-warning",
      "--semantic-danger",
      "--font-ui",
      "--font-data",
      "--touch-target-min",
    ];

    for (const token of canonicalTokens) {
      expect(css, token).toContain(token);
    }

    for (const [alias, target] of Object.entries(contract.legacy_css_aliases)) {
      expect(css, alias).toContain(`${alias}: var(${target})`);
    }

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps the color and interaction invariants explicit", () => {
    expect(contract.interaction_rules.color_is_never_only_state_signal).toBe(true);
    expect(contract.interaction_rules.disabled_controls_require_non_color_cue).toBe(true);
    expect(contract.interaction_rules.destructive_actions_require_explicit_label_or_confirmation_when_irreversible).toBe(
      true,
    );
  });
});
