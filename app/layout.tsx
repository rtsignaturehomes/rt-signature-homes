import { AttributionBanner } from "../components/AttributionBanner";
import { SiteBehavior } from "../components/SiteBehavior";
import { Tracking } from "../components/Tracking";
import { innerHtml, loadChrome } from "../lib/content";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "../styles/site.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.rtsignaturehomes.com"),
  applicationName: "RT Signature Homes Design & Build",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  other: {
    "facebook-domain-verification": "17zetg87mrci7xtyqq3dakuzmn0ftx",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const chrome = loadChrome();
  return (
    <html lang="en" className="inter_7b064e0d-module__MOT0tq__variable poppins_ac842dd0-module__LNowYa__variable">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header
          className="site-header"
          dangerouslySetInnerHTML={{ __html: innerHtml(chrome.header, "header") }}
        />
        {children}
        <footer
          className="site-footer"
          dangerouslySetInnerHTML={{ __html: innerHtml(chrome.footer, "footer") }}
        />
        <div className="mobile-action-bar" aria-label="Quick contact actions">
          <a href="tel:+12064076291">
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
            </svg>
            Call
          </a>
          <a href="/contact/">Request consultation</a>
        </div>
        <AttributionBanner />
        <SiteBehavior mobileNav={chrome.mobileNav} />
        <Tracking />
      </body>
    </html>
  );
}
