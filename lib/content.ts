import fs from "node:fs";
import path from "node:path";
import { SITE_URL } from "./site";

const SCRAPED_ORIGIN = /https:\/\/www\.rtsignaturehomes\.com/g;

export type ScrapedPage = {
  path: string;
  title: string;
  description: string;
  keywords: string;
  robots: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageLocal?: string;
  ogType: string;
  jsonLd: string[];
  header: string;
  footer: string;
  html: string;
  status: number;
};

const root = process.cwd();

export function pageFile(urlPath: string) {
  const clean = urlPath.replace(/\/$/, "") || "/";
  if (clean === "/") return path.join(root, "content", "pages", "index.json");
  return path.join(root, "content", "pages", `${clean.slice(1)}.json`);
}

export function listPaths() {
  const file = path.join(root, "content", "paths.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as string[];
}

export function loadPage(urlPath: string) {
  const raw = fs.readFileSync(pageFile(urlPath), "utf8");
  return JSON.parse(raw.replace(SCRAPED_ORIGIN, SITE_URL)) as ScrapedPage;
}

export function loadChrome() {
  const file = path.join(root, "content", "chrome.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as {
    header: string;
    footer: string;
    mobileNav: string;
  };
}

export function innerHtml(html: string, tag: "header" | "footer") {
  return html
    .replace(new RegExp(`^<${tag}[^>]*>`), "")
    .replace(new RegExp(`</${tag}>$`), "");
}
