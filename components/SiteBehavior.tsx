"use client";

import { useEffect } from "react";

function queryValue(name: string) {
  return new URLSearchParams(window.location.search).get(name) || "";
}

function contextFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "services" && parts[1]) return { serviceContext: parts[1], metroContext: "" };
  if (parts[0] === "service-areas" && parts[1] && parts[2]) {
    return { serviceContext: parts[2], metroContext: parts[1] };
  }
  if (parts[0] === "service-areas" && parts[1]) return { serviceContext: "", metroContext: parts[1] };
  return { serviceContext: "", metroContext: "" };
}

function showStatus(form: HTMLFormElement, message: string) {
  let status = form.querySelector<HTMLElement>(".form-status");
  if (!status) {
    status = document.createElement("p");
    status.className = "form-status";
    status.setAttribute("role", "alert");
    form.appendChild(status);
  }
  status.textContent = message;
}

async function submitConsultation(form: HTMLFormElement) {
  const data = new FormData(form);
  const startedAt = Number(form.dataset.startedAt || Date.now());
  const context = contextFromPath(window.location.pathname);
  const firstName = String(data.get("first_name") || "");
  const lastName = String(data.get("last_name") || "");
  const payload = {
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    email: String(data.get("email") || ""),
    phone: String(data.get("phone") || ""),
    zip: String(data.get("zip") || ""),
    propertyAddress: String(data.get("propertyAddress") || ""),
    projectType: String(data.get("service") || ""),
    budget: String(data.get("budget") || ""),
    timing: String(data.get("timing") || ""),
    preferredContact: String(data.get("preferredContact") || ""),
    message: String(data.get("message") || ""),
    smsConsent: data.get("smsConsent") === "on",
    website: String(data.get("website") || ""),
    formStartedAt: startedAt,
    landingPage: window.location.pathname,
    conversionPage: window.location.href,
    referrer: document.referrer,
    campaign: queryValue("utm_campaign"),
    source: queryValue("utm_source"),
    medium: queryValue("utm_medium"),
    term: queryValue("utm_term"),
    content: queryValue("utm_content"),
    gclid: queryValue("gclid"),
    gbraid: queryValue("gbraid"),
    wbraid: queryValue("wbraid"),
    fbclid: queryValue("fbclid"),
    deviceCategory: window.matchMedia("(max-width: 800px)").matches ? "mobile" : "desktop",
    serviceContext: context.serviceContext,
    metroContext: context.metroContext,
    landingVariant: "general",
    attribution_token: String(data.get("attribution_token") || "") || undefined,
  };

  const response = await fetch("/api/consultation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as { leadId?: string; message?: string };
  if (!response.ok || !result.leadId) {
    showStatus(form, result.message || "We could not send your request. Please call us or try again shortly.");
    return;
  }
  window.location.assign(`/thank-you/?ref=${encodeURIComponent(result.leadId)}`);
}

export function SiteBehavior({ mobileNav }: { mobileNav: string }) {
  useEffect(() => {
    const startedAt = Date.now();
    document.querySelectorAll<HTMLFormElement>(".consultation-form").forEach((form) => {
      form.dataset.startedAt = String(startedAt);
      form.removeAttribute("action");
    });

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("#mobile-navigation a")) {
        document.querySelector("#mobile-navigation")?.remove();
        document.querySelector(".mobile-menu-button")?.setAttribute("aria-expanded", "false");
        document.querySelector(".mobile-menu-button")?.setAttribute("aria-label", "Open navigation");
        document.body.classList.remove("nav-open");
      }
      const button = target.closest<HTMLButtonElement>(".mobile-menu-button");
      if (!button) return;
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      document.querySelector("#mobile-navigation")?.remove();
      if (open && mobileNav) {
        document.querySelector(".site-header")?.insertAdjacentHTML("afterend", mobileNav);
      }
      document.body.classList.toggle("nav-open", open);
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.classList.contains("consultation-form")) return;
      event.preventDefault();
      if (!form.reportValidity()) return;
      void submitConsultation(form);
    };

    const onChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || target.name !== "preferredContact") return;
      const form = target.closest("form");
      if (!form) return;
      let email = form.querySelector<HTMLInputElement>('input[name="email"]');
      if (target.value === "email") {
        if (!email) {
          const phone = form.querySelector('input[name="phone"]');
          const field = document.createElement("label");
          field.innerHTML = 'Email address<input name="email" type="email" autocomplete="email" required>';
          phone?.parentElement?.insertAdjacentElement("afterend", field);
          email = field.querySelector("input");
        }
        email!.required = true;
      } else if (email) {
        email.required = false;
      }
    };

    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
      document.removeEventListener("change", onChange);
    };
  }, [mobileNav]);

  return null;
}
