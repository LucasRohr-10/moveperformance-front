import path from "node:path";

import { expect, test, type APIRequestContext, type Locator, type Page, type TestInfo } from "@playwright/test";

import type { CheckoutResponseDto } from "@/lib/api/types";

import { CHECKOUT_REFS, E2E_PLAN_IDS } from "./support/checkout-fixtures";
import { planAction, selectPlan } from "./support/plan-selector";
import { SCENARIO_COOKIE } from "./support/scenarios";
import { simulateFromTest } from "./support/simulate";
import { useScenario } from "./support/use-scenario";

const ARTIFACTS_DIR = process.env.E2E_ARTIFACTS_DIR ?? "test-results";
const API = `http://localhost:${Number(process.env.E2E_API_PORT ?? 4300)}/api/v1`;
const MAX_DURATION_MS = 1000;
const HOVER_DURATION_MS = 200;
const HOVER_SETTLE_MS = 400;
const MAX_BLUR_PX = 20;
const LAYOUT_PROPERTIES = ["top", "left", "right", "bottom", "width", "height", "margin", "padding"];
const TRANSFORM_PROPERTIES = ["transform", "translate", "scale", "rotate"];
// Next keeps the previous route in the DOM, hidden, after a client navigation.
const VISIBLE = { visible: true } as const;
// The "Verificando sesión…" spinner of the authenticated shell; it only shows while the session check is slow.
const SESSION_SPINNER_CLASS = "h-6 w-6 animate-spin rounded-full border-2 border-line border-t-white";

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
  className: string;
  properties: string[];
  blurPx: number[];
}

async function shot(page: Page, testInfo: TestInfo, name: string, fullPage = true): Promise<void> {
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "screenshots", `${testInfo.project.name}-checkout-motion-${name}.png`),
    fullPage,
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
        const properties = new Set<string>();
        const blurPx: number[] = [];
        for (const keyframe of effect.getKeyframes()) {
          for (const [property, value] of Object.entries(keyframe)) {
            if (["offset", "easing", "composite", "computedOffset"].includes(property)) continue;
            properties.add(property);
            if (typeof value === "string") {
              for (const match of value.matchAll(/blur\(([\d.]+)px\)/g)) blurPx.push(parseFloat(match[1]));
            }
          }
        }
        const target = effect.target as Element;
        return {
          target: target.tagName.toLowerCase(),
          className: target.getAttribute("class") ?? "",
          properties: [...properties],
          blurPx,
        };
      }),
  );
}

function expectPaintOnly(animations: AnimationReport[]): void {
  for (const animation of animations) {
    const layout = animation.properties.filter((property) => LAYOUT_PROPERTIES.includes(property));
    expect(layout, `<${animation.target}> animates ${animation.properties.join(", ")}`).toEqual([]);
    for (const blur of animation.blurPx) expect(blur).toBeLessThanOrEqual(MAX_BLUR_PX);
  }
}

function transformAnimations(animations: AnimationReport[]): AnimationReport[] {
  return animations.filter((animation) =>
    animation.properties.some((property) => TRANSFORM_PROPERTIES.includes(property)),
  );
}

async function createPlanPurchase(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API}/checkout/plan`, {
    headers: { Cookie: `${SCENARIO_COOKIE}=none` },
    data: { planId: E2E_PLAN_IDS.mensual },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as CheckoutResponseDto).externalReference;
}

interface Control {
  name: string;
  url: string;
  locate: (page: Page) => Locator;
}

const CONTROLS: Control[] = [
  {
    name: "pay-button",
    url: "/checkout/plan/plan-trimestral",
    locate: (page) => page.getByRole("button", { name: "Pagar con Mercado Pago" }),
  },
  {
    name: "result-profile",
    url: `/checkout/resultado?ref=${CHECKOUT_REFS.approvedPlan}`,
    locate: (page) => page.getByRole("status").getByRole("link", { name: "Ir a mi perfil" }),
  },
  {
    name: "result-retry",
    url: `/checkout/resultado?ref=${CHECKOUT_REFS.rejectedBooking}`,
    locate: (page) => page.getByRole("status").getByRole("link", { name: "Intentar de nuevo" }),
  },
  {
    name: "result-another-slot",
    url: `/checkout/resultado?ref=${CHECKOUT_REFS.expiredBooking}`,
    locate: (page) => page.getByRole("status").getByRole("link", { name: "Elegir otro horario" }),
  },
  {
    name: "plan-card-action",
    url: "/plans",
    locate: (page) => planAction(page, "Contratar"),
  },
];

test.describe("Motion audit: transitions of the checkout controls", () => {
  for (const control of CONTROLS) {
    test.describe(control.name, () => {
      async function visit(page: Page): Promise<Locator> {
        await page.goto(control.url);
        const target = control.locate(page);
        await expect(target).toBeVisible();
        return target;
      }

      test.beforeEach(async ({ context, baseURL }) => {
        await useScenario(context, baseURL!, "none");
      });

      test("transition lasts at most 1 s and only touches paint properties", async ({ page }) => {
        const target = await visit(page);
        const style = await target.evaluate((element) => {
          const computed = getComputedStyle(element);
          return { duration: computed.transitionDuration, property: computed.transitionProperty };
        });

        const durations = parseDurationsMs(style.duration);
        expect(Math.max(...durations), `transition-duration: ${style.duration}`).toBeGreaterThan(0);
        expect(Math.max(...durations), `transition-duration: ${style.duration}`).toBeLessThanOrEqual(
          MAX_DURATION_MS,
        );
        const touched = style.property.split(",").map((property) => property.trim());
        expect(touched, `transition-property: ${style.property}`).not.toContain("all");
        const layout = touched.filter((property) =>
          LAYOUT_PROPERTIES.some((forbidden) => property === forbidden || property.startsWith(`${forbidden}-`)),
        );
        expect(layout, `transition-property: ${style.property}`).toEqual([]);
      });

      test("easing is ease, linear, ease-out or a guideline curve", async ({ page }) => {
        // F-02: buttonVariants' transition-colors uses Tailwind's default
        // cubic-bezier(0.4, 0, 0.2, 1), which is not in the guidelines.
        test.fail(true, "F-02: Tailwind default easing on buttonVariants");
        const target = await visit(page);
        const timing = await target.evaluate((element) => getComputedStyle(element).transitionTimingFunction);

        const unlisted = parseTimingFunctions(timing).filter(
          (easing) => !ALLOWED_KEYWORDS.includes(easing) && !ALLOWED_CURVES.includes(easing),
        );
        expect(unlisted, `transition-timing-function: ${timing}`).toEqual([]);
      });

      test("the hover transition is the guideline's ease 200 ms", async ({ page }) => {
        // F-02: Tailwind's default is 150 ms with its own curve.
        test.fail(true, "F-02: Tailwind default duration and easing on buttonVariants");
        const target = await visit(page);
        const style = await target.evaluate((element) => {
          const computed = getComputedStyle(element);
          return { duration: computed.transitionDuration, timing: computed.transitionTimingFunction };
        });

        expect(parseDurationsMs(style.duration), `transition-duration: ${style.duration}`).toEqual(
          parseDurationsMs(style.duration).map(() => HOVER_DURATION_MS),
        );
        expect(parseTimingFunctions(style.timing).every((easing) => easing === "ease"), style.timing).toBe(true);
      });

      test("hover changes the colors only on hover devices", async ({ page }, testInfo) => {
        const target = await visit(page);
        const isHoverDevice = await page.evaluate(
          () => matchMedia("(hover: hover) and (pointer: fine)").matches,
        );
        const colors = () =>
          target.evaluate((element) => {
            const computed = getComputedStyle(element);
            return `${computed.backgroundColor} ${computed.color} ${computed.borderColor}`;
          });

        const before = await colors();
        await target.hover();
        await page.waitForTimeout(HOVER_SETTLE_MS);
        const after = await colors();
        await shot(page, testInfo, `hover-${control.name}`, false);

        if (isHoverDevice) {
          expect(after, "hover must change the colors on a hover device").not.toBe(before);
          return;
        }
        expect(after, "hover must change nothing on a touch device").toBe(before);
      });

      test("the hover transition on a hover device runs within the limits", async ({ page }) => {
        const target = await visit(page);
        const isHoverDevice = await page.evaluate(
          () => matchMedia("(hover: hover) and (pointer: fine)").matches,
        );
        test.skip(!isHoverDevice, "hover transitions only exist on hover devices");

        await target.hover();
        const transitions = await target.evaluate((element) =>
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
          expect(transition.duration, `${transition.property} duration`).toBeLessThanOrEqual(MAX_DURATION_MS);
          expect(LAYOUT_PROPERTIES, `${transition.property} is a paint property`).not.toContain(
            transition.property,
          );
        }
      });
    });
  }
});

test.describe("Motion audit: animations of the plan flow", () => {
  async function walkPlanFlow(page: Page, testInfo: TestInfo, prefix: string): Promise<AnimationReport[]> {
    const seen: AnimationReport[] = [];
    await page.goto("/plans");
    seen.push(...(await pageAnimations(page)));
    await selectPlan(page, "Plan Trimestral");
    await planAction(page, "Contratar").click();
    await expect(page.getByRole("heading", { name: "Confirmá tu plan.", level: 1 })).toBeVisible();
    seen.push(...(await pageAnimations(page)));
    await shot(page, testInfo, `${prefix}-checkout`);

    await page.getByRole("button", { name: "Pagar con Mercado Pago" }).click();
    await expect(page.getByRole("heading", { name: "Simulador de pagos (desarrollo)" })).toBeVisible();
    seen.push(...(await pageAnimations(page)));

    await page.getByRole("button", { name: "Aprobar" }).click();
    await expect(page.getByRole("status").getByRole("heading", { name: "¡Listo! Tu pago fue aprobado." })).toBeVisible();
    seen.push(...(await pageAnimations(page)));
    await shot(page, testInfo, `${prefix}-result`);
    return seen;
  }

  test("no layout properties and no blur above 20 px along the plan flow", async ({
    context,
    page,
    baseURL,
  }, testInfo) => {
    await useScenario(context, baseURL!, "none");
    expectPaintOnly(await walkPlanFlow(page, testInfo, "flow"));
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("no transform animation runs along the plan flow", async ({ context, page, baseURL }, testInfo) => {
      await useScenario(context, baseURL!, "none");
      const animations = await walkPlanFlow(page, testInfo, "reduced");
      expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);

      // Positive control: the probe does see a transform animation when one runs, so an empty list is real.
      await page.evaluate(() => {
        const probe = document.createElement("div");
        document.body.append(probe);
        probe.animate([{ transform: "scale(1)" }, { transform: "scale(1.1)" }], { duration: 1000 });
      });
      expect(transformAnimations(await pageAnimations(page)).length, "probe animation detected").toBe(1);

      // The session spinner shows only when the session check is slow, so it is pinned by its own test (F-03).
      const checkoutAnimations = animations.filter((animation) => animation.className !== SESSION_SPINNER_CLASS);
      expect(transformAnimations(checkoutAnimations), "app animations with transform keyframes").toEqual([]);
    });

    test("the session spinner shown before every checkout screen stops rotating", async ({
      context,
      page,
      baseURL,
    }, testInfo) => {
      // F-03: animate-spin has no motion-safe: guard, so it rotates under reduced motion.
      test.fail(true, "F-03: the session spinner ignores prefers-reduced-motion");
      await useScenario(context, baseURL!, "none");
      await page.goto("/checkout/plan/plan-trimestral");
      await expect(page.getByRole("heading", { name: "Confirmá tu plan.", level: 1 })).toBeVisible();

      await page.evaluate((className) => {
        const spinner = document.createElement("span");
        spinner.className = className;
        document.body.prepend(spinner);
      }, SESSION_SPINNER_CLASS);
      await shot(page, testInfo, "reduced-session-spinner", false);
      const spinners = (await pageAnimations(page)).filter((animation) => animation.className === SESSION_SPINNER_CLASS);
      expect(transformAnimations(spinners), "session spinner animations with transform keyframes").toEqual([]);
    });
  });

  test("loading and pending: the h1 causes no layout shift, and approved replaces it", async ({
    context,
    page,
    baseURL,
    request,
  }, testInfo) => {
    await page.addInitScript(() => {
      const shifts: string[] = [];
      Object.assign(window, { __layoutShiftNodes: shifts });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const sources = (entry as PerformanceEntry & { sources?: Array<{ node: Node | null }> }).sources;
          for (const source of sources ?? []) shifts.push(source.node?.nodeName ?? "unknown");
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await useScenario(context, baseURL!, "none");
    const ref = await createPlanPurchase(request);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/api/v1/checkout/purchases/${ref}`, async (route) => {
      await held;
      await route.continue();
    });
    await page.goto(`/checkout/resultado?ref=${ref}`);

    const title = page.getByRole("heading", { name: "Tu pago.", level: 1 });
    await expect(page.getByText("Consultando tu pago…").filter(VISIBLE)).toBeVisible();
    const loadingBox = await title.boundingBox();
    // A full-page capture resizes the viewport on mobile and would reflow the
    // heading by itself, so frames are viewport-sized until shifts are read.
    await shot(page, testInfo, "sequence-1-loading", false);

    release();
    await expect(page.getByRole("status").getByRole("heading", { name: "Confirmando tu pago" })).toBeVisible();
    const pendingBox = await title.boundingBox();
    const shiftedNodes = await page.evaluate(
      () => (window as unknown as { __layoutShiftNodes: string[] }).__layoutShiftNodes,
    );
    await shot(page, testInfo, "sequence-2-pending", false);

    await simulateFromTest(request, ref, "approved");
    await expect(page.getByRole("status").getByRole("heading", { name: "¡Listo! Tu pago fue aprobado." })).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(300);
    await shot(page, testInfo, "sequence-3-approved", false);

    expect(pendingBox, "h1 from loading to pending").toEqual(loadingBox);
    await expect(title, "the approved screen replaces the page title").toBeHidden();
    expect(shiftedNodes, "elements reported by layout-shift entries").not.toContain("H1");
  });
});
