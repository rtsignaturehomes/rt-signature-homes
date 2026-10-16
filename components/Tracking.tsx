"use client";

import { useEffect } from "react";
import { SITE_HOSTS } from "../lib/site";

function addScript(src: string, attributes: Record<string, string> = {}) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  for (const [key, value] of Object.entries(attributes)) script.setAttribute(key, value);
  document.head.appendChild(script);
}

export function Tracking() {
  useEffect(() => {
    if (!SITE_HOSTS.includes(window.location.hostname)) return;

    // Defer third-party tags off the critical load path (improves LCP/TBT) while
    // still firing reliably: whichever comes first — a user interaction or the
    // browser going idle (with a timeout fallback). All tags are unchanged.
    const interactionEvents = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    let started = false;
    let idleHandle: number | undefined;
    const removeTriggers = () => {
      interactionEvents.forEach((ev) => window.removeEventListener(ev, start));
      if (idleHandle !== undefined) {
        const w = window as unknown as { cancelIdleCallback?: (id: number) => void };
        if (w.cancelIdleCallback) w.cancelIdleCallback(idleHandle);
        else window.clearTimeout(idleHandle);
      }
    };

    let detachTags = () => {};
    function start() {
      if (started) return;
      started = true;
      removeTriggers();
      detachTags = initTags();
    }

    interactionEvents.forEach((ev) => window.addEventListener(ev, start, { once: true, passive: true }));
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    idleHandle = ric ? ric(start, { timeout: 3000 }) : window.setTimeout(start, 3000);

    return () => {
      removeTriggers();
      detachTags();
    };
  }, []);

  return null;
}

function initTags() {
  {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    addScript("https://www.googletagmanager.com/gtm.js?id=GTM-KKSBR3BT");
    addScript("https://www.googletagmanager.com/gtag/js?id=G-GD6M7XB47D");
    window.gtag("js", new Date());
    window.gtag("config", "G-GD6M7XB47D");
    window.gtag("config", "AW-18353970548");

    addScript("https://connect.facebook.net/en_US/fbevents.js");
    window.fbq = window.fbq || function fbq(...args: unknown[]) {
      const queue = (window.fbq!.queue = window.fbq!.queue || []);
      queue.push(args);
    };
    window.fbq("init", "1581225980680904");
    window.fbq("track", "PageView");

    addScript("https://bat.bing.com/bat.js");
    window.uetq = window.uetq || [];
    window.uetq.push("config", "ti", "97263329");
    addScript("https://312384.tctm.co/t.js");

    const loadAttribution = () => {
      if (window.localStorage.getItem("rt-attribution-choice") !== "granted") return;
      addScript("https://app.insiderclicks.com/api/attribution/v1/script", {
        "data-site": "ats_f7219945c0244312a2297537e66f87cb",
      });
    };
    loadAttribution();
    window.addEventListener("storage", loadAttribution);
    const observer = new MutationObserver(loadAttribution);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-attribution"] });
    return () => {
      window.removeEventListener("storage", loadAttribution);
      observer.disconnect();
    };
  }
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[][] };
    uetq?: unknown[];
  }
}
