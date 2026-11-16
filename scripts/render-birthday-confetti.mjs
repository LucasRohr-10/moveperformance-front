// Renders public/email/birthday-confetti.png, the background of the birthday email's header.
// Fixed seed, so running it again gives the same image. Run: node scripts/render-birthday-confetti.mjs
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";

const WIDTH = 880;
const HEIGHT = 400;
const PARTICLES = 150;
const COLORS = ["#ffffff", "#e5e5e5", "#9a9a9a", "#6b6b6b"];
const OUTPUT = fileURLToPath(new URL("../public/email/birthday-confetti.png", import.meta.url));

// Same pieces as the approved mail mockup, at twice its size (the header is 440×200 in the mail).
const html = `<!doctype html>
<html><body style="margin:0;background:#000">
<div id="box" style="position:relative;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:#000"></div>
<script>
  const colors = ${JSON.stringify(COLORS)};
  let seed = ${PARTICLES} * 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const box = document.getElementById("box");
  for (let i = 0; i < ${PARTICLES}; i++) {
    const piece = document.createElement("i");
    const size = 2 * (5 + rnd() * 6);
    const round = rnd() < 0.3;
    Object.assign(piece.style, {
      position: "absolute",
      left: rnd() * 100 + "%",
      top: rnd() * 100 + "%",
      width: size + "px",
      height: (round ? size * 0.7 : size / 2.2) + "px",
      borderRadius: round ? "50%" : "0",
      background: colors[Math.floor(rnd() * colors.length)],
      transform: "rotate(" + Math.floor(rnd() * 360) + "deg)",
      opacity: 0.55 + rnd() * 0.45,
    });
    box.appendChild(piece);
  }
</script>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.locator("#box").screenshot({ path: OUTPUT });
} finally {
  await browser.close();
}
console.log(`Wrote ${OUTPUT}`);
