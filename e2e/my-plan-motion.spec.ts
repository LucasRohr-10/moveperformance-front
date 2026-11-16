import path from "node:path";

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

import { useScenario } from "./support/use-scenario";

const ARTIFACTS_DIR = process.env.E2E_ARTIFACTS_DIR ?? "test-results";
const MAX_DURATION_MS = 1000;
const MAX_BLUR_PX = 20;
const LAYOUT_PROPERTIES = ["top", "left", "right", "bottom", "width", "height", "margin", "padding"];
const TRANSFORM_PROPERTIES = ["transform", "translate", "scale", "rotate"];

// Curves of the animation guidelines that are allowed: ease-out and ease-in-out
// families, plus the keywords the "Checks" table accepts.
const ALLOWED_KEYWORDS = ["ease", "linear", "ease-out"];
const ALLOWED_CURVES = [
  [0.25, 0.46, 0.45, 0.94],
  [0.215, 0.61, 0.355, 1],
  [0.165, 0.84, 0.44, 1],
  [0.23, 1, 0.32, 1],
  [0.19, 1, 0.22, 1],
  [0.075, 0.82, 0.165, 1],
  [0.455, 0.03, 0.515, 0.955],
  [0.645, 0.045, 0.355, 1],
  [0.77, 0, 0.175, 1],
  [0.86, 0, 0.07, 1],
  [1, 0, 0, 1],
  [0.785, 0.135, 0.15, 0.86],
].map((points) => `cubic-bezier(${points.join(", ")})`);

interface AnimationReport {
  target: string;
  properties: string[];
  blurPx: number[];
}

async function shot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-${name}.png`),
    fullPage: true,
  });
}

function parseDurationsMs(value: string): number[] {
  return value.split(",").map((part) => {
    const text = part.trim();
    return text.endsWith("ms") ? parseFloat(text) : parseFloat(text) * 1000;
  });
}

function parseTimingFunctions(value: string): string[] {
  return value.match(/cubic-bezier\([^)]*\)|steps\([^)]*\)|[a-z-]+/g) ?? [];
}

// Animations of the page itself: those living in a shadow root (the Next dev
// overlay) are not the app's and are left out.
async function pageAnimations(page: Page): Promise<AnimationReport[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => {
        const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
        return target !== null && !(target.getRootNode() instanceof ShadowRoot);
      })
      .map((animation) => {
        const effect = animation.effect as KeyframeEffect;
        const keyframes = effect.getKeyframes();
        const properties = new Set<string>();
        const blurPx: number[] = [];
        for (const keyframe of keyframes) {
          for (const [property, value] of Object.entries(keyframe)) {
            if (["offset", "easing", "composite", "computedOffset"].includes(property)) continue;
            properties.add(property);
            if (typeof value === "string") {
              for (const match of value.matchAll(/blur\(([\d.]+)px\)/g)) blurPx.push(parseFloat(match[1]));
            }
          }
        }
        const target = effect.target as Element;
        return { target: target.tagName.toLowerCase(), properties: [...properties], blurPx };
      }),
  );
}

const BUTTONS = [
  { scenario: "none", name: "Ver planes", finding: "F-03" },
  { scenario: "error", name: "Reintentar", finding: "F-03" },
] as const;

test.describe("Motion audit: link transitions", () => {
  for (const button of BUTTONS) {
    test.describe(`"${button.name}"`, () => {
      async function visit(page: Page): Promise<Locator> {
        await page.goto("/dashboard");
        const link = page.getByRole("link", { name: button.name });
        await expect(link).toBeVisible();
        return link;
      }

      test("transition lasts at most 1 s and only touches paint properties", async ({
        context,
        page,
        baseURL,
      }) => {
        await useScenario(context, baseURL!, button.scenario);
        const link = await visit(page);
        const style = await link.evaluate((element) => {
          const computed = getComputedStyle(element);
          return {
            duration: computed.transitionDuration,
            property: computed.transitionProperty,
          };
        });

        const durations = parseDurationsMs(style.duration);
        expect(Math.max(...durations), `transition-duration: ${style.duration}`).toBeGreaterThan(0);
        expect(Math.max(...durations), `transition-duration: ${style.duration}`).toBeLessThanOrEqual(
          MAX_DURATION_MS,
        );
        const touched = style.property.split(",").map((property) => property.trim());
        const layout = touched.filter((property) =>
          LAYOUT_PROPERTIES.some((forbidden) => property === forbidden || property.startsWith(`${forbidden}-`)),
        );
        expect(layout, `transition-property: ${style.property}`).toEqual([]);
      });

      test("easing is ease, linear, ease-out or a guideline curve", async ({
        context,
        page,
        baseURL,
      }) => {
        // F-03: Tailwind's transition-colors uses cubic-bezier(0.4, 0, 0.2, 1),
        // which is not in the guidelines.
        test.fail();

        await useScenario(context, baseURL!, button.scenario);
        const link = await visit(page);
        const timing = await link.evaluate((element) => getComputedStyle(element).transitionTimingFunction);

        const unlisted = parseTimingFunctions(timing).filter(
          (easing) => !ALLOWED_KEYWORDS.includes(easing) && !ALLOWED_CURVES.includes(easing),
        );
        expect(unlisted, `transition-timing-function: ${timing}`).toEqual([]);
      });

      test("hover changes the colors only on hover devices", async ({
        context,
        page,
        baseURL,
      }, testInfo) => {
        await useScenario(context, baseURL!, button.scenario);
        const link = await visit(page);
        const isHoverDevice = await page.evaluate(
          () => matchMedia("(hover: hover) and (pointer: fine)").matches,
        );
        const background = () => link.evaluate((element) => getComputedStyle(element).backgroundColor);

        const before = await background();
        await link.hover();
        await page.waitForTimeout(400);
        const after = await background();
        await shot(page, testInfo, `motion-hover-${button.name.toLowerCase().replace(/\s/g, "-")}`);

        if (isHoverDevice) {
          expect(after, "hover must change the background on a hover device").not.toBe(before);
          return;
        }
        expect(after, "hover must change nothing on a touch device").toBe(before);
      });

      test("the hover transition on a hover device runs within the limits", async ({
        context,
        page,
        baseURL,
      }) => {
        await useScenario(context, baseURL!, button.scenario);
        const link = await visit(page);
        const isHoverDevice = await page.evaluate(
          () => matchMedia("(hover: hover) and (pointer: fine)").matches,
        );
        test.skip(!isHoverDevice, "hover transitions only exist on hover devices");

        await link.hover();
        const transitions = await link.evaluate((element) =>
          element.getAnimations().map((animation) => {
            const timing = (animation.effect as KeyframeEffect).getComputedTiming();
            return {
              property: (animation as CSSTransition).transitionProperty,
              duration: Number(timing.duration),
            };
          }),
        );

        expect(transitions.length, "hover starts at least one transition").toBeGreaterThan(0);
        for (const transition of transitions) {
          expect(transition.duration, `${transition.property} duration`).toBeLessThanOrEqual(
            MAX_DURATION_MS,
          );
        }
      });
    });
  }
});

test.describe("Motion audit: animations of the page", () => {
  test("no layout properties and no blur above 20 px while the section loads", async ({
    context,
    page,
    baseURL,
  }) => {
    await useScenario(context, baseURL!, "slow");
    await page.goto("/dashboard", { waitUntil: "commit" });
    await expect(page.getByText("Cargando tu plan…")).toBeVisible();
    const loading = await pageAnimations(page);

    await expect(page.getByRole("heading", { level: 2, name: /^Plan / })).toBeVisible();
    const loaded = await pageAnimations(page);

    for (const animation of [...loading, ...loaded]) {
      const layout = animation.properties.filter((property) => LAYOUT_PROPERTIES.includes(property));
      expect(layout, `<${animation.target}> animates ${animation.properties.join(", ")}`).toEqual([]);
      for (const blur of animation.blurPx) expect(blur).toBeLessThanOrEqual(MAX_BLUR_PX);
    }
  });

  test("the heading causes no layout shift while the section loads", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await page.addInitScript(() => {
      const shifts: string[] = [];
      Object.assign(window, { __layoutShiftNodes: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const sources = (entry as PerformanceEntry & { sources?: Array<{ node: Node | null }> })
            .sources;
          for (const source of sources ?? []) shifts.push(source.node?.nodeName ?? "unknown");
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await useScenario(context, baseURL!, "slow");
    await page.goto("/dashboard", { waitUntil: "commit" });

    await expect(page.getByText("Cargando tu plan…")).toBeVisible();
    // A full-page capture resizes the viewport on mobile and would reflow the
    // heading by itself, so frames are viewport-sized until shifts are read.
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-motion-sequence-1-loading.png`),
    });
    await expect(page.getByRole("heading", { level: 2, name: /^Plan / })).toBeVisible();
    await page.waitForTimeout(300);
    const shiftedNodes = await page.evaluate(
      () => (window as unknown as { __layoutShiftNodes: string[] }).__layoutShiftNodes,
    );
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-motion-sequence-2-loaded.png`),
    });

    expect(shiftedNodes, "elements reported by layout-shift entries").not.toContain("H1");
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("no transform animation runs while the full dashboard renders", async ({
      context,
      page,
      baseURL,
    }, testInfo) => {
      await useScenario(context, baseURL!, "full");
      await page.goto("/dashboard");
      await expect(page.getByText("Recovery · Tus paquetes", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
        true,
      );

      const animations = await pageAnimations(page);
      await shot(page, testInfo, "motion-reduced-full");

      const transforms = animations.filter((animation) =>
        animation.properties.some((property) => TRANSFORM_PROPERTIES.includes(property)),
      );
      expect(transforms, "animations with transform keyframes").toEqual([]);
    });
  });
});
