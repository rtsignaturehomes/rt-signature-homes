"use client";

import { useEffect } from "react";

// Review Link Generator widget behavior. The widget markup + styles live in the
// homepage content (reviews section); this component runs its script. Because page
// HTML is injected via dangerouslySetInnerHTML (where inline <script> tags do not
// execute), the logic lives here and uses document-level event delegation so it
// works on first load and on client-side navigation, mirroring SiteBehavior.
export function ReviewWidget() {
  useEffect(() => {
    const rlgReviewLink =
      "https://search.google.com/local/writereview?placeid=ChIJ_Q1Bt8ptkFQR8mUyVjwRnvA";
    const rlgEmail = "info@rtsignaturehomes.com";
    const rlgBusinessName =
      "RT Signature Homes Design & Build - Kitchen & Bathroom Remodeling";
    const rlgPlatform = "google";
    const rlgMinRating = 4;
    const rlgFeedbackEndpoint =
      "https://reviewtool.gsmarketingroup.com/api/send-feedback";
    const rlgTrackEndpoint =
      "https://reviewtool.gsmarketingroup.com/api/track-event";
    const platformHash = "#review";
    let rlgLastRating = 0;

    const w = window as unknown as Record<string, unknown>;

    function resolveEndpoint(url: string) {
      if (!url) return "";
      try {
        return new URL(url, window.location.origin).toString();
      } catch {
        return url;
      }
    }
    const rlgFeedbackEndpointResolved = resolveEndpoint(rlgFeedbackEndpoint);
    const rlgTrackEndpointResolved = resolveEndpoint(rlgTrackEndpoint);

    function normalizeHash(hash: string) {
      if (!hash) return "";
      return hash.toLowerCase().split("?")[0];
    }

    function getWidgetUrl() {
      const hash = platformHash || normalizeHash(window.location.hash);
      if (!hash) return window.location.href;
      return window.location.origin + window.location.pathname + hash;
    }

    function trackEvent(eventType: string, extra?: Record<string, unknown>) {
      if (!rlgTrackEndpointResolved) return;
      const payload: Record<string, unknown> = {
        businessEmail: rlgEmail,
        businessName: rlgBusinessName,
        platform: rlgPlatform,
        eventType,
        timestamp: new Date().toISOString(),
        pageUrl: window.location.href,
        referrer: document.referrer || "",
        reviewLink: rlgReviewLink,
        widgetUrl: getWidgetUrl(),
      };
      if (extra) Object.assign(payload, extra);
      try {
        const body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            rlgTrackEndpointResolved,
            new Blob([body], { type: "application/json" })
          );
          return;
        }
        fetch(rlgTrackEndpointResolved, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      } catch {
        // ignore tracking errors
      }
    }

    function openPopup(source?: string) {
      const popup = document.getElementById("rlgPopup");
      if (!popup) return;
      popup.style.display = "block";
      document.body.style.overflow = "hidden";
      trackEvent("widget_open", { source: source || "button" });
    }
    function closePopup() {
      const popup = document.getElementById("rlgPopup");
      if (!popup) return;
      popup.style.display = "none";
      document.body.style.overflow = "auto";
    }

    w.rlgSubmitReview = function () {
      const rating = document.querySelector<HTMLInputElement>(
        '#rlgPopup input[name="rlgRating"]:checked'
      );
      if (!rating) {
        alert("Please select a rating before submitting.");
        return;
      }
      rlgLastRating = parseInt(rating.value, 10);
      if (rlgLastRating >= rlgMinRating) {
        trackEvent("review_redirect", { rating: rlgLastRating });
        window.location.href = rlgReviewLink;
      } else {
        const form = document.getElementById("rlgFeedbackForm");
        if (form) form.style.display = "block";
        const wrapper = document.querySelector<HTMLElement>(
          ".rlg-star-rating-wrapper"
        );
        if (wrapper) wrapper.style.display = "none";
        const positive = document.querySelector<HTMLElement>(
          ".rlg-positive-reviews"
        );
        if (positive) positive.style.display = "none";
      }
    };

    w.rlgSubmitFeedback = function () {
      const textarea = document.getElementById(
        "rlgFeedbackText"
      ) as HTMLTextAreaElement | null;
      const feedback = textarea ? textarea.value : "";
      if (feedback.trim() === "") {
        alert("Please enter your feedback before submitting.");
        return;
      }
      const payload = {
        businessName: rlgBusinessName,
        businessEmail: rlgEmail,
        customerRating: rlgLastRating || 0,
        customerFeedback: feedback,
        platform: rlgPlatform,
        timestamp: new Date().toISOString(),
      };
      if (!rlgFeedbackEndpointResolved) {
        alert("Feedback service is not configured. Please try again later.");
        return;
      }
      fetch(rlgFeedbackEndpointResolved, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to send feedback");
          return res.json().catch(() => ({}));
        })
        .then(() => {
          trackEvent("feedback_submit", { rating: rlgLastRating || 0 });
          const form = document.getElementById("rlgFeedbackForm");
          if (form) form.style.display = "none";
          const thanks = document.getElementById("rlgThankYou");
          if (thanks) thanks.style.display = "block";
        })
        .catch(() => {
          alert(
            "Sorry, there was a problem sending your feedback. Please try again."
          );
        });
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("#rlgOpenPopup")) {
        openPopup("button");
        return;
      }
      if (target.closest("#rlgClosePopup")) {
        closePopup();
        return;
      }
      if (target.id === "rlgPopup") {
        closePopup();
      }
    };

    const maybeOpenFromHash = () => {
      if (normalizeHash(window.location.hash) === platformHash) openPopup("hash");
    };

    document.addEventListener("click", onClick);
    window.addEventListener("hashchange", maybeOpenFromHash);
    maybeOpenFromHash();

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", maybeOpenFromHash);
      delete w.rlgSubmitReview;
      delete w.rlgSubmitFeedback;
    };
  }, []);

  return null;
}
