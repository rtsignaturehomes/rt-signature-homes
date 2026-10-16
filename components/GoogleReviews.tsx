"use client";

import { useEffect } from "react";

// Progressive enhancement for the reviews display. The page ships with approved
// fallback review cards (real 5-star Google reviews) already server-rendered, so
// there is no layout shift and the hero/LCP are unaffected. After hydration (and
// only when the reviews area nears the viewport, or on idle) this component asks
// the same-origin /api/reviews endpoint for live Google reviews and, when they are
// available, swaps the fallback cards for live ones using the exact same markup.
//
// Behavior matrix (matches the Google Reviews SOP):
//  - ok + reviews : replace cards with live 4+ star reviews (capped to each grid's size)
//  - empty        : hide the entire reviews section (API ok, nothing qualifies)
//  - error/unconfigured/network failure : keep the existing approved fallback cards

const STAR =
  '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>';

type LiveReview = {
  author: string;
  rating: number;
  text: string;
  time: string;
  authorUrl: string;
};

export function GoogleReviews() {
  useEffect(() => {
    const grids = Array.from(document.querySelectorAll<HTMLElement>(".review-grid"));
    if (!grids.length) return;

    let loaded = false;

    const escapeHtml = (s: string) => {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    };

    const hideSections = () =>
      grids.forEach((g) => {
        const section = g.closest("section");
        if (section) (section as HTMLElement).style.display = "none";
      });

    const buildCard = (template: HTMLElement, r: LiveReview) => {
      const card = template.cloneNode(true) as HTMLElement;
      const stars = card.querySelector(".review-stars");
      if (stars) {
        const n = Math.max(1, Math.min(5, r.rating));
        stars.setAttribute("aria-label", `${r.rating} out of 5 stars`);
        stars.innerHTML = STAR.repeat(n);
      }
      const bq = card.querySelector("blockquote");
      if (bq) {
        bq.innerHTML =
          '<span aria-hidden="true">“</span>' + escapeHtml(r.text) + '<span aria-hidden="true">”</span>';
      }
      const authorLink = card.querySelector<HTMLAnchorElement>(".review-author a");
      if (authorLink) {
        authorLink.textContent = r.author;
        if (r.authorUrl) authorLink.href = r.authorUrl;
      }
      const timeEl = card.querySelector<HTMLElement>(".review-author span");
      if (timeEl) timeEl.textContent = r.time;
      const sourceLink = card.querySelector<HTMLAnchorElement>(".review-source-link");
      if (sourceLink && r.authorUrl) sourceLink.href = r.authorUrl;
      return card;
    };

    const render = (reviews: LiveReview[]) => {
      grids.forEach((grid) => {
        const existing = Array.from(grid.querySelectorAll<HTMLElement>(".review-card"));
        if (!existing.length) return;
        const template = existing[0];
        const chosen = reviews.slice(0, existing.length); // preserve each grid's original density
        if (!chosen.length) return;
        const frag = document.createDocumentFragment();
        chosen.forEach((r) => frag.appendChild(buildCard(template, r)));
        grid.replaceChildren(frag);
      });
    };

    const load = async () => {
      if (loaded) return;
      loaded = true;
      let data: { status?: string; reviews?: LiveReview[] } | null = null;
      try {
        const res = await fetch("/api/reviews/", { headers: { accept: "application/json" } });
        data = await res.json();
      } catch {
        return; // network failure -> keep approved fallback cards
      }
      if (!data) return;
      if (data.status === "error" || data.status === "unconfigured") return; // keep fallback

      const live = Array.isArray(data.reviews) ? data.reviews.filter((r) => r && r.rating >= 4 && r.text) : [];
      if (data.status === "empty" || !live.length) {
        hideSections();
        return;
      }
      render(live);
    };

    // Defer so the fetch never competes with the hero / LCP.
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io?.disconnect();
            void load();
          }
        },
        { rootMargin: "400px" },
      );
      io.observe(grids[0]);
    }
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    const idleId = ric ? ric(() => void load(), { timeout: 5000 }) : window.setTimeout(() => void load(), 3000);

    return () => {
      io?.disconnect();
      const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (cic && ric) cic(idleId as number);
      else window.clearTimeout(idleId as number);
    };
  }, []);

  return null;
}
