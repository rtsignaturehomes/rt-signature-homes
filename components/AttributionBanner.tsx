"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "rt-attribution-choice";

export function AttributionBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(STORAGE_KEY)) setOpen(true);
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest("button");
      if (button?.textContent?.includes("Attribution choices")) {
        event.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function choose(value: "granted" | "declined") {
    window.localStorage.setItem(STORAGE_KEY, value);
    document.documentElement.dataset.attribution = value;
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="attribution-dialog" role="dialog" aria-labelledby="attribution-title">
      <h2 id="attribution-title">Campaign attribution choices</h2>
      <p>
        With your permission, we use campaign attribution to understand how visitors find RT Signature
        Homes. Consultation forms work whether you accept or decline. See our{" "}
        <a href="/privacy-policy/">Privacy Policy</a>.
      </p>
      <div className="attribution-actions">
        <button className="attribution-decline" type="button" onClick={() => choose("declined")}>
          Decline
        </button>
        <button className="attribution-allow" type="button" onClick={() => choose("granted")}>
          Allow attribution
        </button>
      </div>
    </div>
  );
}
