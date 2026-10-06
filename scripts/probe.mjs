import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("scrape-probe");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
});
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const url = process.argv[2] || "https://www.rtsignaturehomes.com/";
const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);
const title = await page.title();
const status = response?.status();
const html = await page.content();
fs.writeFileSync(path.join(outDir, "page.html"), html);
const info = await page.evaluate(() => {
  const main = document.querySelector("main");
  function outline(el, depth = 0) {
    if (!el || depth > 4) return null;
    const kids = [...el.children].slice(0, 12).map((c) => outline(c, depth + 1));
    return {
      tag: el.tagName.toLowerCase(),
      class: el.className?.toString?.().slice(0, 120) || "",
      id: el.id || "",
      kids: kids.filter(Boolean),
    };
  }
  const cssHrefs = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href);
  return {
    title: document.title,
    cssHrefs,
    mainClass: main?.className || null,
    outline: main ? outline(main) : outline(document.body),
    bodyTextStart: document.body.innerText.slice(0, 400),
  };
});
fs.writeFileSync(path.join(outDir, "info.json"), JSON.stringify({ status, title, info }, null, 2));
console.log(JSON.stringify({ status, title, css: info.cssHrefs, mainClass: info.mainClass }, null, 2));
await browser.close();
