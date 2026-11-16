import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const CHARTS_DIR = __dirname;
const GLOBALS = readFileSync(join(__dirname, "../../../../../app/globals.css"), "utf8");

const token = (name: string): string => {
  const match = GLOBALS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Token --${name} is not a hex color in globals.css`);
  return match[1];
};

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

describe("chart colors", () => {
  it("every gray series is at least 3:1 against the card it is drawn on (WCAG 1.4.11)", () => {
    const card = token("color-card");

    for (const name of ["color-chart-1", "color-chart-2", "color-chart-3", "color-chart-previous"]) {
      expect(contrast(token(name), card), name).toBeGreaterThanOrEqual(3);
    }
  });

  it("the charts take their colors from the tokens, not from hex or rgb values written in the component", () => {
    const sources = readdirSync(CHARTS_DIR).filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));

    for (const file of sources) {
      const code = readFileSync(join(CHARTS_DIR, file), "utf8");
      expect(code.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g), file).toBeNull();
    }
  });
});
