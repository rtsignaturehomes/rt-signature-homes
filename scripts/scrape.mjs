import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://www.rtsignaturehomes.com";
const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const PUBLIC = path.join(ROOT, "public");
const EXTRA_PATHS = ["/privacy-policy/", "/terms/", "/thank-you/", "/blog/"];

fs.mkdirSync(CONTENT, { recursive: true });
fs.mkdirSync(PUBLIC, { recursive: true });

function pageFile(urlPath) {
  const clean = urlPath.replace(/\/$/, "") || "/";
  if (clean === "/") return path.join(CONTENT, "pages", "index.json");
  return path.join(CONTENT, "pages", `${clean.slice(1)}.json`);
}

function rewriteNextImages(html) {
  return html.replace(
    /\/_next\/image\/\?url=([^&"'>\s]+)(?:&amp;|&)?[^"'>\s]*/g,
    (_, encoded) => decodeURIComponent(encoded),
  );
}

function collectAssetPaths(html) {
  const found = new Set();
  const re = /(?:src|poster|href)="(\/(?:images|videos|fonts)\/[^"]+)"/g;
  let match;
  while ((match = re.exec(html))) found.add(match[1].split("?")[0]);
  const re2 = /url\((?:'|")?(\/(?:images|videos|fonts|_next\/static\/media)\/[^"')]+)/g;
  while ((match = re2.exec(html))) found.add(match[1].split("?")[0]);
  return [...found];
}

async function mapPool(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: limit }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(runners);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  viewport: { width: 1440, height: 1200 },
});

const sitemapPage = await context.newPage();
const sitemapResponse = await sitemapPage.goto(`${ORIGIN}/sitemap.xml`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
const sitemapBody = await sitemapResponse.text();
let paths = [...sitemapBody.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((match) => {
  const url = new URL(match[1].trim());
  const pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return pathname;
});
if (!paths.length) {
  throw new Error(`Sitemap was not XML. Status ${sitemapResponse.status()} start ${sitemapBody.slice(0, 120)}`);
}
for (const extra of EXTRA_PATHS) {
  if (!paths.includes(extra)) paths.push(extra);
}
paths = [...new Set(paths)];
fs.writeFileSync(path.join(CONTENT, "paths.json"), JSON.stringify(paths, null, 2));
console.log(`paths ${paths.length}`);

async function scrapePath(urlPath) {
  const file = pageFile(urlPath);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const page = await context.newPage();
  try {
    const target = `${ORIGIN}${urlPath}`;
    let response;
    for (let attempt = 1; attempt <= 5; attempt++) {
      response = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60000 });
      const deadline = Date.now() + 12000;
      let title = "";
      while (Date.now() < deadline) {
        title = await page.title().catch(() => "");
        if (/429|too many requests/i.test(title)) break;
        const ready = await page.locator("#main-content").count().catch(() => 0);
        if (ready > 0 && !/verifying your browser/i.test(title)) break;
        await page.waitForTimeout(400);
      }
      title = await page.title().catch(() => title);
      if ((await page.locator("#main-content").count()) > 0 && !/429|too many requests/i.test(title)) break;
      await page.waitForTimeout(8000 * attempt);
    }
    if ((await page.locator("#main-content").count()) === 0) {
      throw new Error(`no main content: ${await page.title()}`);
    }
    await page.waitForTimeout(600);
    const data = await page.evaluate(() => {
      const main = document.querySelector("#main-content");
      const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
        (node) => node.textContent,
      );
      main.querySelectorAll("script").forEach((node) => node.remove());
      const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute("content") || "";
      const prop = (name) =>
        document.querySelector(`meta[property="${name}"]`)?.getAttribute("content") || "";
      return {
        title: document.title,
        description: meta("description"),
        keywords: meta("keywords"),
        robots: meta("robots"),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "",
        ogTitle: prop("og:title"),
        ogDescription: prop("og:description"),
        ogImage: prop("og:image"),
        ogType: prop("og:type"),
        jsonLd,
        header: document.querySelector("header.site-header")?.outerHTML || "",
        footer: document.querySelector("footer.site-footer")?.outerHTML || "",
        html: main.innerHTML,
      };
    });
    data.path = urlPath;
    data.status = response?.status() || 0;
    data.html = rewriteNextImages(data.html);
    data.header = rewriteNextImages(data.header);
    data.footer = rewriteNextImages(data.footer);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
    process.stdout.write(`ok ${urlPath}\n`);
    return data;
  } finally {
    await page.close();
  }
}

const pages = [];
let failures = 0;
await mapPool(paths, 1, async (urlPath) => {
  try {
    pages.push(await scrapePath(urlPath));
  } catch (error) {
    failures += 1;
    process.stdout.write(`FAIL ${urlPath} ${error.message}\n`);
  }
});

const home = JSON.parse(fs.readFileSync(pageFile("/"), "utf8"));
const headerHashes = new Set(pages.map((page) => page.header));
const footerHashes = new Set(pages.map((page) => page.footer));

const chromePage = await context.newPage();
await chromePage.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await chromePage.waitForSelector(".mobile-menu-button");
await chromePage.click(".mobile-menu-button");
await chromePage.waitForTimeout(300);
const mobileNav = await chromePage.evaluate(() => {
  const nav = document.querySelector("#mobile-navigation");
  return nav ? nav.outerHTML : "";
});
await chromePage.close();

fs.writeFileSync(
  path.join(CONTENT, "chrome.json"),
  JSON.stringify(
    {
      header: home.header,
      footer: home.footer,
      mobileNav: rewriteNextImages(mobileNav),
      headerVariants: headerHashes.size,
      footerVariants: footerHashes.size,
    },
    null,
    2,
  ),
);

const cssPage = await context.newPage();
await cssPage.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
const cssHref = await cssPage.evaluate(
  () => document.querySelector('link[rel="stylesheet"]')?.href || "",
);
const cssResponse = await context.request.get(cssHref);
let css = await cssResponse.text();
const fontUrls = [...css.matchAll(/url\((?:'|")?([^"')]+)\)/g)].map((match) => match[1]);
const fontMap = new Map();
for (const fontUrl of fontUrls) {
  const absolute = new URL(fontUrl, cssHref).href;
  const filename = path.basename(absolute.split("?")[0]);
  const local = `/fonts/${filename}`;
  fontMap.set(fontUrl, local);
  const dest = path.join(PUBLIC, "fonts", filename);
  if (!fs.existsSync(dest)) {
    const fontResponse = await context.request.get(absolute);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await fontResponse.body()));
    console.log(`font ${filename}`);
  }
}
for (const [from, to] of fontMap) css = css.split(from).join(to);
fs.mkdirSync(path.join(ROOT, "styles"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "styles", "site.css"), css);
await cssPage.close();

const assetPaths = new Set();
for (const page of pages) {
  for (const asset of collectAssetPaths(`${page.html}\n${page.header}\n${page.footer}`)) {
    assetPaths.add(asset);
  }
}
for (const asset of collectAssetPaths(rewriteNextImages(mobileNav))) assetPaths.add(asset);

let downloaded = 0;
for (const asset of assetPaths) {
  const dest = path.join(PUBLIC, decodeURIComponent(asset));
  if (fs.existsSync(dest)) continue;
  const response = await context.request.get(`${ORIGIN}${asset}`);
  if (!response.ok()) {
    console.log(`asset miss ${response.status()} ${asset}`);
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await response.body()));
  downloaded += 1;
  console.log(`asset ${asset}`);
}

const ogImages = [...new Set(pages.map((page) => page.ogImage).filter(Boolean))];
fs.mkdirSync(path.join(PUBLIC, "og"), { recursive: true });
for (const ogImage of ogImages) {
  const fileName = `${Buffer.from(ogImage).toString("base64url").slice(0, 24)}.png`;
  const dest = path.join(PUBLIC, "og", fileName);
  if (!fs.existsSync(dest)) {
    const response = await context.request.get(ogImage);
    if (response.ok()) fs.writeFileSync(dest, Buffer.from(await response.body()));
  }
  const page = pages.find((item) => item.ogImage === ogImage);
  if (page) page.ogImageLocal = `/og/${fileName}`;
}
for (const page of pages) {
  if (page.ogImageLocal) {
    fs.writeFileSync(pageFile(page.path), JSON.stringify(page));
  }
}

fs.writeFileSync(
  path.join(CONTENT, "manifest.json"),
  JSON.stringify(
    {
      count: pages.length,
      failures,
      assets: assetPaths.size,
      downloaded,
      headerVariants: headerHashes.size,
      footerVariants: footerHashes.size,
      ogImages: ogImages.length,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ pages: pages.length, failures, assets: assetPaths.size, downloaded }));
setTimeout(() => process.exit(0), 500);
