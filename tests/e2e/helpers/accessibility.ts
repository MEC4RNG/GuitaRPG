import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectAccessible(page: Page, label: string) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(
    result.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target),
    })),
    `${label} has automated WCAG A/AA violations`,
  ).toEqual([]);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const geometry = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const width = document.documentElement.scrollWidth;
    return { viewport, width, offenders: width > viewport ? Array.from(document.querySelectorAll("main *")).filter((element) => { const bounds = element.getBoundingClientRect(); return bounds.width > 0 && bounds.right > viewport + 1 && getComputedStyle(element).position !== "fixed"; }).slice(0, 12).map((element) => ({ tag: element.tagName, className: element.getAttribute("class"), right: Math.round(element.getBoundingClientRect().right) })) : [] };
  });
  expect(geometry.width <= geometry.viewport, `Horizontal overflow at ${page.url()}: ${JSON.stringify(geometry)}`).toBe(true);
}
