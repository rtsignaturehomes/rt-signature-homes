import { loadPage } from "./content";
import type { Metadata } from "next";

export function pageMetadata(urlPath: string): Metadata {
  const page = loadPage(urlPath);
  const image = page.ogImage ? "/og/default.png" : undefined;
  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords || undefined,
    robots: page.robots || undefined,
    alternates: page.canonical ? { canonical: page.canonical } : undefined,
    openGraph: {
      title: page.ogTitle || page.title,
      description: page.ogDescription || page.description,
      url: page.canonical || undefined,
      siteName: "RT Signature Homes Design & Build",
      type: "website",
      images: image ? [{ url: image, alt: "RT Signature Homes Design & Build" }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: page.ogTitle || page.title,
      description: page.ogDescription || page.description,
      images: image ? [image] : undefined,
    },
  };
}

export function PageBody({ urlPath }: { urlPath: string }) {
  const page = loadPage(urlPath);
  return (
    <>
      {page.jsonLd.map((block, index) => (
        <script
          key={`${urlPath}-ld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: block }}
        />
      ))}
      <main id="main-content" dangerouslySetInnerHTML={{ __html: page.html }} />
    </>
  );
}
